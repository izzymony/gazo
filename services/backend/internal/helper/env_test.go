package helper

import (
	"strings"
	"testing"
)

// getenvFrom builds a getenv-style lookup from a map, for the pure validators.
func getenvFrom(m map[string]string) func(string) string {
	return func(k string) string { return m[k] }
}

// prodBase is a fully valid production configuration; individual tests mutate
// one key to prove that single misconfiguration is rejected.
func prodBase() map[string]string {
	return map[string]string{
		"APP_ENV":             "production",
		"ENV":                 "production",
		"PAYSTACK_AUTH":       "sk_live_realauthkey",
		"PAYSTACK_SECRET_KEY": "sk_live_realsecretkey",
		"KYC_PRIVATE_STORAGE": "true",
		"CLOUDINARY_URL":      "cloudinary://123:abc@realcloud",
		"BVN_ENCRYPTION_KEY":  "0123456789abcdef0123456789abcdef",
		"JWT_SECRET":          "a-real-production-secret",
		"REFRESH_SECRET":      "a-real-refresh-secret",
		"DB_DSN":              "postgres://u:p@db.internal:5432/vibaar?sslmode=require",
		"DB_HOST":             "db.internal",
		"ALLOWED_ORIGINS":     "https://vibaar.com,https://admin.vibaar.com",
	}
}

func hasErrMentioning(errs []error, substr string) bool {
	for _, e := range errs {
		if strings.Contains(e.Error(), substr) {
			return true
		}
	}
	return false
}

func TestCanonEnv(t *testing.T) {
	cases := map[string]string{
		"local": "local", "LOCAL": "local",
		"dev": "development", "development": "development",
		"staging": "staging", "stage": "staging",
		"prod": "production", "production": "production", " Production ": "production",
		"": "", "qa": "",
	}
	for in, want := range cases {
		if got := CanonEnv(in); got != want {
			t.Errorf("CanonEnv(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestResolveEnv_ProductionSignalWins(t *testing.T) {
	// APP_ENV production alone -> production
	if got := ResolveEnv(getenvFrom(map[string]string{"APP_ENV": "production"})); got != "production" {
		t.Errorf("APP_ENV=production resolved to %q", got)
	}
	// ENV production alone (APP_ENV unset) -> production (fail-safe)
	if got := ResolveEnv(getenvFrom(map[string]string{"ENV": "prod"})); got != "production" {
		t.Errorf("ENV=prod resolved to %q", got)
	}
	// A production signal from either side wins over a dev value on the other
	if got := ResolveEnv(getenvFrom(map[string]string{"APP_ENV": "production", "ENV": "local"})); got != "production" {
		t.Errorf("mixed prod/local resolved to %q, want production", got)
	}
}

func TestValidateEnv_ProductionAllGoodPasses(t *testing.T) {
	if errs := ValidateEnv(getenvFrom(prodBase())); len(errs) != 0 {
		t.Fatalf("valid production config produced errors: %v", errs)
	}
}

func TestValidateEnv_RejectsTestPaystackKeys(t *testing.T) {
	m := prodBase()
	m["PAYSTACK_AUTH"] = "sk_test_xxx"
	m["PAYSTACK_SECRET_KEY"] = "sk_test_yyy"
	errs := ValidateEnv(getenvFrom(m))
	if !hasErrMentioning(errs, "PAYSTACK_AUTH is a TEST key") {
		t.Errorf("expected PAYSTACK_AUTH test-key rejection, got %v", errs)
	}
	if !hasErrMentioning(errs, "PAYSTACK_SECRET_KEY is a TEST key") {
		t.Errorf("expected PAYSTACK_SECRET_KEY test-key rejection, got %v", errs)
	}
}

func TestValidateEnv_RequiresBothPaystackVars(t *testing.T) {
	m := prodBase()
	delete(m, "PAYSTACK_AUTH") // only the webhook key set
	errs := ValidateEnv(getenvFrom(m))
	if !hasErrMentioning(errs, "PAYSTACK_AUTH is required") {
		t.Errorf("expected missing PAYSTACK_AUTH to be rejected, got %v", errs)
	}
}

func TestValidateEnv_RejectsBypassesAndPublicKYC(t *testing.T) {
	m := prodBase()
	m["SKIP_SMS_VERIFICATION"] = "true"
	m["ENABLE_MOCK_SERVICES"] = "true"
	m["USE_LOCAL_FILE_STORAGE"] = "true"
	m["KYC_PRIVATE_STORAGE"] = "false"
	errs := ValidateEnv(getenvFrom(m))
	for _, want := range []string{"SKIP_SMS_VERIFICATION", "ENABLE_MOCK_SERVICES", "USE_LOCAL_FILE_STORAGE", "KYC_PRIVATE_STORAGE"} {
		if !hasErrMentioning(errs, want) {
			t.Errorf("expected %s to be rejected in production, got %v", want, errs)
		}
	}
}

func TestValidateEnv_RejectsTestCloudinaryAndLocalhost(t *testing.T) {
	m := prodBase()
	m["CLOUDINARY_URL"] = "cloudinary://test:test@test"
	m["DB_HOST"] = "localhost"
	m["ALLOWED_ORIGINS"] = "http://localhost:3000"
	errs := ValidateEnv(getenvFrom(m))
	if !hasErrMentioning(errs, "CLOUDINARY_URL") {
		t.Errorf("expected test CLOUDINARY_URL rejection, got %v", errs)
	}
	if !hasErrMentioning(errs, "DB_HOST points at localhost") {
		t.Errorf("expected DB_HOST localhost rejection, got %v", errs)
	}
	if !hasErrMentioning(errs, "ALLOWED_ORIGINS points at localhost") {
		t.Errorf("expected ALLOWED_ORIGINS localhost rejection, got %v", errs)
	}
}

func TestValidateEnv_RejectsSplitAndMissingEnv(t *testing.T) {
	// APP_ENV/ENV disagree
	split := ValidateEnv(getenvFrom(map[string]string{"APP_ENV": "production", "ENV": "staging",
		"PAYSTACK_AUTH": "sk_live_x", "PAYSTACK_SECRET_KEY": "sk_live_y", "KYC_PRIVATE_STORAGE": "true",
		"CLOUDINARY_URL": "cloudinary://1:2@c", "BVN_ENCRYPTION_KEY": "k", "JWT_SECRET": "s", "REFRESH_SECRET": "r",
		"DB_HOST": "db.internal", "ALLOWED_ORIGINS": "https://vibaar.com"}))
	if !hasErrMentioning(split, "disagree") {
		t.Errorf("expected APP_ENV/ENV disagreement error, got %v", split)
	}
	// both unset
	if errs := ValidateEnv(getenvFrom(map[string]string{})); !hasErrMentioning(errs, "APP_ENV must be set") {
		t.Errorf("expected missing-env error, got %v", errs)
	}
}

func TestValidateEnv_NonProductionSkipsBattery(t *testing.T) {
	// A local env with test keys everywhere must NOT trip the production battery.
	errs := ValidateEnv(getenvFrom(map[string]string{
		"APP_ENV": "local", "ENV": "local", "PAYSTACK_AUTH": "sk_test_x", "KYC_PRIVATE_STORAGE": "false",
	}))
	if len(errs) != 0 {
		t.Errorf("local env should not trip the production battery, got %v", errs)
	}
}

func TestOTPBypassAllowed_FalseInProduction(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("ENV", "production")
	t.Setenv("SKIP_SMS_VERIFICATION", "true") // must be ignored in production
	if OTPBypassAllowed() {
		t.Error("OTP bypass must be FALSE in production even with SKIP_SMS_VERIFICATION=true")
	}
	if !IsProduction() {
		t.Error("IsProduction() should be true")
	}
}

func TestOTPBypassAllowed_FalseWhenEnvSignalsProduction(t *testing.T) {
	// Production signalled only via ENV (APP_ENV unset) must still block bypass.
	t.Setenv("APP_ENV", "")
	t.Setenv("ENV", "prod")
	t.Setenv("SKIP_SMS_VERIFICATION", "true")
	if OTPBypassAllowed() {
		t.Error("OTP bypass must be FALSE when ENV signals production")
	}
}

func TestOTPBypassAllowed_TrueInDevLike(t *testing.T) {
	for _, env := range []string{"local", "development", "staging"} {
		t.Setenv("APP_ENV", env)
		t.Setenv("ENV", env)
		t.Setenv("SKIP_SMS_VERIFICATION", "")
		if !OTPBypassAllowed() {
			t.Errorf("OTP bypass should be allowed in %s", env)
		}
	}
}
