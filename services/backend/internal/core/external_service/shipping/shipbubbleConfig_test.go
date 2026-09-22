package shipping

import (
	"strings"
	"testing"
)

// env builds a getenv func from a map, so every case states its whole
// environment and nothing leaks between tests.
func env(pairs map[string]string) func(string) string {
	return func(k string) string { return pairs[k] }
}

func hasError(errs []error, substr string) bool {
	for _, e := range errs {
		if strings.Contains(e.Error(), substr) {
			return true
		}
	}
	return false
}

func errStrings(errs []error) string {
	if len(errs) == 0 {
		return "(none)"
	}
	parts := make([]string, 0, len(errs))
	for _, e := range errs {
		parts = append(parts, e.Error())
	}
	return strings.Join(parts, " | ")
}

// The root cause. Staging was configured with the DASHBOARD host, which answers
// API paths with HTML 404s, and the old client reported that as
// "API returned status: 404" — indistinguishable from a rejected address.
func TestResolveConfig_BaseURL(t *testing.T) {
	cases := []struct {
		name      string
		vars      map[string]string
		wantURL   string
		wantError string
	}{
		{
			name:    "unset uses Shipbubble's documented base",
			vars:    map[string]string{"APP_ENV": "staging", "ENV": "staging", "SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_x"},
			wantURL: "https://api.shipbubble.com/v1",
		},
		{
			name: "a trailing slash is normalised away, so paths do not double up",
			vars: map[string]string{"APP_ENV": "staging", "ENV": "staging",
				"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_x",
				"SHIPBUBBLE_API_URL":         "https://api.shipbubble.com/v1/"},
			wantURL: "https://api.shipbubble.com/v1",
		},
		{
			name: "the DASHBOARD host is refused by name",
			vars: map[string]string{"APP_ENV": "staging", "ENV": "staging",
				"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_x",
				"SHIPBUBBLE_API_URL":         "https://app.shipbubble.com/api/v1"},
			wantError: "DASHBOARD",
		},
		{
			name: "and refused however it is spelled",
			vars: map[string]string{"APP_ENV": "staging", "ENV": "staging",
				"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_x",
				"SHIPBUBBLE_API_URL":         "https://APP.ShipBubble.com/api/v1/"},
			wantError: "DASHBOARD",
		},
		{
			name: "http is refused outside the local mock",
			vars: map[string]string{"APP_ENV": "staging", "ENV": "staging",
				"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_x",
				"SHIPBUBBLE_API_URL":         "http://api.shipbubble.com/v1"},
			wantError: "must be https",
		},
		{
			name: "a non-URL is refused",
			vars: map[string]string{"APP_ENV": "staging", "ENV": "staging",
				"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_x",
				"SHIPBUBBLE_API_URL":         "api.shipbubble.com/v1"},
			wantError: "not a valid absolute URL",
		},
		{
			name: "the local mock may be plain http, and needs no key",
			vars: map[string]string{"APP_ENV": "local", "ENV": "local",
				"ENABLE_MOCK_SERVICES": "true",
				"SHIPBUBBLE_API_URL":   "http://localhost:8088/mock"},
			wantURL: "http://localhost:8088/mock",
		},
		{
			name: "the local mock defaults to the mock endpoint, not the provider",
			vars: map[string]string{"APP_ENV": "local", "ENV": "local", "ENABLE_MOCK_SERVICES": "true"},
			// Pointing local development at the real provider by default would
			// send test traffic to Shipbubble.
			wantURL: "http://localhost:8088/mock",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			cfg, errs := ResolveConfig(env(c.vars))
			if c.wantError != "" {
				if !hasError(errs, c.wantError) {
					t.Errorf("expected an error containing %q, got: %s", c.wantError, errStrings(errs))
				}
				return
			}
			if len(errs) != 0 {
				t.Errorf("unexpected errors: %s", errStrings(errs))
			}
			if cfg.BaseURL != c.wantURL {
				t.Errorf("BaseURL = %q, want %q", cfg.BaseURL, c.wantURL)
			}
		})
	}
}

// The base URL and the path must join to exactly Shipbubble's documented
// endpoint. This is the assertion that would have caught the original defect:
// the old default produced
// `https://app.shipbubble.com/api/v1/shipping/address/validate`, a dashboard
// page, and nothing checked it.
func TestBaseURL_JoinsToTheDocumentedEndpoints(t *testing.T) {
	cfg, errs := ResolveConfig(env(map[string]string{
		"APP_ENV": "staging", "ENV": "staging", "SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_x",
	}))
	if len(errs) != 0 {
		t.Fatalf("unexpected errors: %s", errStrings(errs))
	}

	for path, want := range map[string]string{
		"/shipping/address/validate": "https://api.shipbubble.com/v1/shipping/address/validate",
		"/shipping/fetch_rates":      "https://api.shipbubble.com/v1/shipping/fetch_rates",
		"/shipping/labels":           "https://api.shipbubble.com/v1/shipping/labels",
	} {
		if got := cfg.BaseURL + path; got != want {
			t.Errorf("endpoint for %s = %q, want %q", path, got, want)
		}
	}
}

// Selection is by CANONICAL environment, with no fallback in either direction.
//
// The old code read _PROD and fell back to _STAGING when it was empty. That is
// availability-based, and it fails towards spending money: a staging deploy
// holding the live key used it and booked real couriers.
func TestResolveConfig_KeySelectionIsPerEnvironment(t *testing.T) {
	cases := []struct {
		name       string
		vars       map[string]string
		wantKey    string
		wantKeyVar string
		wantError  string
	}{
		{
			name: "production reads only the production key",
			vars: map[string]string{"APP_ENV": "production", "ENV": "production",
				"SHIPBUBBLE_API_KEY_PROD": "sb_prod_live"},
			wantKey: "sb_prod_live", wantKeyVar: EnvKeyProd,
		},
		{
			name: "staging reads only the staging key",
			vars: map[string]string{"APP_ENV": "staging", "ENV": "staging",
				"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_test"},
			wantKey: "sb_sandbox_test", wantKeyVar: EnvKeyStaging,
		},
		{
			name: "staging does NOT fall back to the production key",
			vars: map[string]string{"APP_ENV": "staging", "ENV": "staging",
				"SHIPBUBBLE_API_KEY_PROD": "sb_prod_live"},
			wantError: "SHIPBUBBLE_API_KEY_STAGING is required in staging",
		},
		{
			name: "production does NOT fall back to the staging key",
			vars: map[string]string{"APP_ENV": "production", "ENV": "production",
				"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_test"},
			wantError: "SHIPBUBBLE_API_KEY_PROD is required in production",
		},
		{
			name: "development uses the sandbox key",
			vars: map[string]string{"APP_ENV": "development", "ENV": "development",
				"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_test"},
			wantKey: "sb_sandbox_test", wantKeyVar: EnvKeyStaging,
		},
		{
			name: "a production signal from EITHER variable selects the production key",
			// helper.ResolveEnv treats a production signal from either as
			// production, fail-safe. The key selection must follow it, or a
			// half-set deploy runs production against the sandbox.
			vars: map[string]string{"APP_ENV": "production", "ENV": "",
				"SHIPBUBBLE_API_KEY_PROD": "sb_prod_live"},
			wantKey: "sb_prod_live", wantKeyVar: EnvKeyProd,
		},
		{
			name: "whitespace around a key is trimmed, not treated as a key",
			vars: map[string]string{"APP_ENV": "staging", "ENV": "staging",
				"SHIPBUBBLE_API_KEY_STAGING": "   "},
			wantError: "is required in staging",
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			cfg, errs := ResolveConfig(env(c.vars))
			if c.wantError != "" {
				if !hasError(errs, c.wantError) {
					t.Errorf("expected an error containing %q, got: %s", c.wantError, errStrings(errs))
				}
				return
			}
			if cfg.APIKey != c.wantKey {
				t.Errorf("APIKey = %q, want %q", cfg.APIKey, c.wantKey)
			}
			if cfg.KeyVar != c.wantKeyVar {
				t.Errorf("KeyVar = %q, want %q", cfg.KeyVar, c.wantKeyVar)
			}
		})
	}
}

// A key that plainly belongs to the other environment is refused.
func TestResolveConfig_RejectsMismatchedKeyPrefixes(t *testing.T) {
	t.Run("a sandbox key in production", func(t *testing.T) {
		_, errs := ResolveConfig(env(map[string]string{
			"APP_ENV": "production", "ENV": "production",
			"SHIPBUBBLE_API_KEY_PROD": "sb_sandbox_oops",
		}))
		if !hasError(errs, "holds a SANDBOX key") {
			t.Errorf("a sandbox key was accepted in production: %s", errStrings(errs))
		}
	})

	t.Run("a live key in staging — the expensive direction", func(t *testing.T) {
		_, errs := ResolveConfig(env(map[string]string{
			"APP_ENV": "staging", "ENV": "staging",
			"SHIPBUBBLE_API_KEY_STAGING": "sb_prod_oops",
		}))
		if !hasError(errs, "holds a LIVE key") {
			t.Errorf("a live key was accepted in staging: %s", errStrings(errs))
		}
		if !hasError(errs, "books real couriers") {
			t.Error("the error does not say what the consequence is")
		}
	})

	t.Run("a live key in local development", func(t *testing.T) {
		_, errs := ResolveConfig(env(map[string]string{
			"APP_ENV": "local", "ENV": "local", "ENABLE_MOCK_SERVICES": "true",
			"SHIPBUBBLE_API_KEY_STAGING": "sb_prod_oops",
		}))
		if !hasError(errs, "holds a LIVE key") {
			t.Errorf("a live key was accepted locally: %s", errStrings(errs))
		}
	})

	t.Run("a key with NEITHER known prefix is accepted", func(t *testing.T) {
		// We do not know Shipbubble's full key taxonomy, and refusing an
		// unfamiliar but valid format would be a self-inflicted outage. What is
		// checked is the mismatch we can actually prove.
		cfg, errs := ResolveConfig(env(map[string]string{
			"APP_ENV": "staging", "ENV": "staging",
			"SHIPBUBBLE_API_KEY_STAGING": "an-opaque-token",
		}))
		if len(errs) != 0 {
			t.Errorf("an unfamiliar key format was rejected: %s", errStrings(errs))
		}
		if cfg.APIKey != "an-opaque-token" {
			t.Errorf("APIKey = %q", cfg.APIKey)
		}
	})
}

// Dead configuration is reported as a WARNING and must never stop the process.
//
// It was appended to the error list and described in a comment as "not fatal",
// while the caller exits on any error — so a production deploy that merely left
// the staging key set would refuse to boot. A warning that stops the service is
// not a warning.
func TestResolveConfig_UnusedStagingKeyInProductionIsAWarningNotAnError(t *testing.T) {
	vars := map[string]string{
		"APP_ENV": "production", "ENV": "production",
		"SHIPBUBBLE_API_KEY_PROD":    "sb_prod_live",
		"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_test",
	}

	cfg, errs := ResolveConfig(env(vars))
	if len(errs) != 0 {
		t.Errorf("an unused staging key is fatal: %s", errStrings(errs))
	}
	if len(cfg.Warnings) != 1 || !strings.Contains(cfg.Warnings[0], "never read") {
		t.Errorf("Warnings = %v, want one mentioning that it is never read", cfg.Warnings)
	}
	// And the key that IS read must still be the production one.
	if cfg.APIKey != "sb_prod_live" || cfg.KeyVar != EnvKeyProd {
		t.Errorf("APIKey/KeyVar = %q/%q, want the production key", cfg.APIKey, cfg.KeyVar)
	}

	// Through the boot gate: warnings out, error list empty, so main proceeds.
	bootErrs, bootWarnings := ValidateConfig(env(vars))
	if len(bootErrs) != 0 {
		t.Errorf("the boot gate would refuse to start: %s", errStrings(bootErrs))
	}
	if len(bootWarnings) != 1 {
		t.Errorf("the boot gate lost the warning: %v", bootWarnings)
	}
}

// ValidateConfig is the boot gate, so a healthy environment must produce no
// errors at all — otherwise it would refuse to start.
func TestValidateConfig_PassesACorrectEnvironment(t *testing.T) {
	for name, vars := range map[string]map[string]string{
		"production": {"APP_ENV": "production", "ENV": "production",
			"SHIPBUBBLE_API_KEY_PROD": "sb_prod_live"},
		"staging": {"APP_ENV": "staging", "ENV": "staging",
			"SHIPBUBBLE_API_KEY_STAGING": "sb_sandbox_test"},
		"local with mocks": {"APP_ENV": "local", "ENV": "local",
			"ENABLE_MOCK_SERVICES": "true"},
	} {
		errs, warnings := ValidateConfig(env(vars))
		if len(errs) != 0 {
			t.Errorf("%s would refuse to boot: %s", name, errStrings(errs))
		}
		if len(warnings) != 0 {
			t.Errorf("%s produced unexpected warnings: %v", name, warnings)
		}
	}
}
