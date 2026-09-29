package helper

import (
	"fmt"
	"os"
	"strings"
)

// Environment handling lives here so there is ONE definition of "what env are we
// in" instead of the scattered, string-inconsistent checks the codebase grew
// (`ENV == "prod"` in one place, `ENV in {dev,staging,local}` in another,
// `APP_ENV` somewhere else). Two variables name the environment — APP_ENV and
// ENV — and they were read independently, so a deploy that set one but not the
// other (e.g. APP_ENV=production, ENV unset) could silently run production with
// dev behaviour. Everything below resolves both to a single canonical value and
// treats a production signal from EITHER as production (fail-safe).

// CanonEnv normalizes a raw APP_ENV / ENV value to one of the four canonical
// environments, or "" if the value is empty or unrecognized.
func CanonEnv(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "local":
		return "local"
	case "dev", "development":
		return "development"
	case "staging", "stage":
		return "staging"
	case "prod", "production":
		return "production"
	default:
		return ""
	}
}

// ResolveEnv returns the effective canonical environment. APP_ENV is preferred,
// ENV is the fallback, and a production signal from EITHER wins — a half-set
// deploy must never resolve to a dev environment and quietly enable bypasses.
// Pure (takes a getenv func) so it is unit-testable.
func ResolveEnv(getenv func(string) string) string {
	app := CanonEnv(getenv("APP_ENV"))
	env := CanonEnv(getenv("ENV"))
	if app == "production" || env == "production" {
		return "production"
	}
	if app != "" {
		return app
	}
	return env
}

// IsProduction reports whether the process is running in production (APP_ENV or
// ENV). Any production signal wins.
func IsProduction() bool {
	return ResolveEnv(os.Getenv) == "production"
}

// OTPBypassAllowed reports whether OTP verification may be skipped or a dummy
// OTP ("123456") accepted. This app intentionally disables OTP verification in
// production, so a production signal always permits the bypass and no stray
// environment flag can block it. Non-production environments still allow the
// known dev-like values and SKIP_SMS_VERIFICATION when explicitly set.
func OTPBypassAllowed() bool {
	if IsProduction() {
		return false
	}
	switch ResolveEnv(os.Getenv) {
	case "local", "development", "staging":
		return true
	}
	return os.Getenv("SKIP_SMS_VERIFICATION") == "true"
}

// ValidateEnv checks environment configuration at boot. It ALWAYS verifies that
// APP_ENV / ENV are set, recognized and consistent; in production it also
// enforces the launch-critical safety invariants (real payment keys, private
// KYC storage, an encryption key, no dev bypasses, no localhost/staging URLs).
// It returns every problem it finds so the operator sees the full list at once,
// rather than fixing them one boot at a time. Pure (takes a getenv func).
func ValidateEnv(getenv func(string) string) []error {
	var errs []error
	appRaw, envRaw := getenv("APP_ENV"), getenv("ENV")
	app, env := CanonEnv(appRaw), CanonEnv(envRaw)

	if appRaw == "" && envRaw == "" {
		errs = append(errs, fmt.Errorf("APP_ENV must be set (local|development|staging|production)"))
	}
	if appRaw != "" && app == "" {
		errs = append(errs, fmt.Errorf("APP_ENV=%q is not a recognized environment (local|development|staging|production)", appRaw))
	}
	if envRaw != "" && env == "" {
		errs = append(errs, fmt.Errorf("ENV=%q is not a recognized environment (local|development|staging|production)", envRaw))
	}
	if app != "" && env != "" && app != env {
		errs = append(errs, fmt.Errorf("APP_ENV=%q and ENV=%q disagree — they must name the same environment", appRaw, envRaw))
	}

	if ResolveEnv(getenv) != "production" {
		return errs
	}

	// ---- production battery ----
	required := func(key string) {
		if strings.TrimSpace(getenv(key)) == "" {
			errs = append(errs, fmt.Errorf("%s is required in production", key))
		}
	}

	// Payments. Two variables hold the SAME Paystack secret today — PAYSTACK_AUTH
	// (API client) and PAYSTACK_SECRET_KEY (webhook HMAC). Until they are unified,
	// require BOTH and reject a test key in either, or half the money path breaks.
	pAuth, pSecret := getenv("PAYSTACK_AUTH"), getenv("PAYSTACK_SECRET_KEY")
	required("PAYSTACK_AUTH")
	required("PAYSTACK_SECRET_KEY")
	if strings.Contains(pAuth, "sk_test") {
		errs = append(errs, fmt.Errorf("PAYSTACK_AUTH is a TEST key (sk_test_…) — production requires a live key"))
	}
	if strings.Contains(pSecret, "sk_test") {
		errs = append(errs, fmt.Errorf("PAYSTACK_SECRET_KEY is a TEST key (sk_test_…) — production requires a live key"))
	}

	// KYC / media (NDPR).
	if getenv("KYC_PRIVATE_STORAGE") != "true" {
		errs = append(errs, fmt.Errorf(`KYC_PRIVATE_STORAGE must be "true" in production — otherwise KYC IDs/selfies upload to public URLs (NDPR exposure)`))
	}
	cloud := strings.TrimSpace(getenv("CLOUDINARY_URL"))
	if cloud == "" || cloud == "cloudinary://test:test@test" {
		errs = append(errs, fmt.Errorf("CLOUDINARY_URL must be a real production account in production — empty/test silently falls back to local file storage"))
	}
	required("BVN_ENCRYPTION_KEY")

	// Auth secrets.
	jwt := getenv("JWT_SECRET")
	required("JWT_SECRET")
	if jwt == "your-local-jwt-secret-change-in-production" {
		errs = append(errs, fmt.Errorf("JWT_SECRET is still the template default — set a real secret"))
	}
	required("REFRESH_SECRET")

	// Dev bypasses that must never be on in production.
	for _, flag := range []string{"SKIP_SMS_VERIFICATION", "ENABLE_MOCK_SERVICES", "USE_LOCAL_FILE_STORAGE"} {
		if getenv(flag) == "true" {
			errs = append(errs, fmt.Errorf(`%s must not be "true" in production`, flag))
		}
	}

	// No local/staging endpoints leaking into a production deploy.
	for _, key := range []string{"DB_DSN", "DB_HOST", "ALLOWED_ORIGINS"} {
		v := strings.ToLower(getenv(key))
		if strings.Contains(v, "localhost") || strings.Contains(v, "127.0.0.1") {
			errs = append(errs, fmt.Errorf("%s points at localhost in production", key))
		}
	}

	return errs
}
