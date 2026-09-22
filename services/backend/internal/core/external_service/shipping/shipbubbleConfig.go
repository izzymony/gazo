package shipping

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
)

// DefaultBaseURL is Shipbubble's documented API base.
//
// The previous default — and what staging was configured with — was
// `https://app.shipbubble.com/api/v1`. That host is Shipbubble's DASHBOARD, not
// its API: it answers every path with a 200-or-404 HTML page, so
// `/shipping/address/validate` returned a 404 document. The old client read
// `resp.StatusCode != 200` and reported "API returned status: 404", which made a
// wrong-host misconfiguration look like a rejected address. Staging checkout has
// been unable to create a shipping profile or fetch a rate for as long as that
// URL has been set.
//
// The correct base was already in this repository: all four `scripts/*.go`
// Shipbubble utilities default to this value. Only the service the application
// actually uses had drifted.
const DefaultBaseURL = "https://api.shipbubble.com/v1"

// wrongBaseURLHost is the dashboard host, rejected explicitly.
//
// A generic "must be a valid https URL" check would accept it, and the failure
// it produces is a 404 HTML page that reads like a provider outage. Naming the
// specific mistake is what turns a silent misconfiguration into a boot error
// that says what to do.
const wrongBaseURLHost = "app.shipbubble.com"

// Shipbubble key prefixes. Only used to reject a key that plainly belongs to
// the OTHER environment.
const (
	sandboxKeyPrefix = "sb_sandbox_"
	prodKeyPrefix    = "sb_prod_"
)

// Env var names, in one place so the docs and the code cannot drift.
const (
	EnvBaseURL    = "SHIPBUBBLE_API_URL"
	EnvKeyProd    = "SHIPBUBBLE_API_KEY_PROD"
	EnvKeyStaging = "SHIPBUBBLE_API_KEY_STAGING"
)

// Config is the resolved Shipbubble configuration.
type Config struct {
	BaseURL string
	APIKey  string
	// KeyVar names the variable the key came from, for diagnostics. Never the
	// key itself.
	KeyVar string
	// Mock is true when the local mock endpoint is in use, which is the one
	// case where a missing key and a non-https URL are both acceptable — and
	// the ONLY case in which fabricated courier options may be produced.
	Mock bool
	// Warnings are configuration facts worth saying out loud that must NOT stop
	// the process. Kept separate from the error list because the caller treats
	// every error as fatal, and a warning appended to that list refuses the
	// boot — which is what happened when "a staging key is set in production"
	// was described as non-fatal and then returned as an error.
	Warnings []string
}

// ResolveConfig resolves the base URL and the API key for the CANONICAL
// environment, and reports every problem it finds rather than the first.
//
// ## Why the key is selected by environment rather than by availability
//
// The previous code took `SHIPBUBBLE_API_KEY_PROD` and fell back to
// `SHIPBUBBLE_API_KEY_STAGING` when it was empty. That is availability-based
// selection, and it fails in the direction that costs money: a staging deploy
// that happens to have the production key set uses it, and books REAL couriers
// against the live account from a test environment. Nothing in the logs would
// say which key was chosen.
//
// Each environment now reads exactly one variable, and a key carrying the other
// environment's prefix is refused. A key with neither known prefix is accepted:
// we do not know Shipbubble's full key taxonomy, and rejecting an unfamiliar but
// valid format would be a self-inflicted outage. What is checked is the mismatch
// we can actually prove.
func ResolveConfig(getenv func(string) string) (Config, []error) {
	var errs []error
	env := helper.ResolveEnv(getenv)
	mockEnabled := env == "local" && getenv("ENABLE_MOCK_SERVICES") == "true"

	cfg := Config{Mock: mockEnabled}

	// ---- base URL ----
	raw := strings.TrimSpace(getenv(EnvBaseURL))
	if raw == "" {
		if mockEnabled {
			raw = "http://localhost:8088/mock"
		} else {
			raw = DefaultBaseURL
		}
	}
	cfg.BaseURL = strings.TrimRight(raw, "/")

	parsed, perr := url.Parse(cfg.BaseURL)
	switch {
	case perr != nil || parsed.Host == "":
		errs = append(errs, fmt.Errorf("%s=%q is not a valid absolute URL", EnvBaseURL, raw))
	case strings.EqualFold(parsed.Hostname(), wrongBaseURLHost):
		errs = append(errs, fmt.Errorf(
			"%s points at %s, which is Shipbubble's DASHBOARD and answers API paths with "+
				"HTML 404s — use %s", EnvBaseURL, wrongBaseURLHost, DefaultBaseURL))
	case parsed.Scheme != "https" && !mockEnabled:
		errs = append(errs, fmt.Errorf(
			"%s must be https outside the local mock (got %q)", EnvBaseURL, parsed.Scheme))
	}

	// ---- API key, by canonical environment ----
	switch env {
	case "production":
		cfg.KeyVar = EnvKeyProd
		cfg.APIKey = strings.TrimSpace(getenv(EnvKeyProd))
		if cfg.APIKey == "" {
			errs = append(errs, fmt.Errorf("%s is required in production", EnvKeyProd))
		} else if strings.HasPrefix(cfg.APIKey, sandboxKeyPrefix) {
			errs = append(errs, fmt.Errorf(
				"%s holds a SANDBOX key (%s…) — production must use a live key",
				EnvKeyProd, sandboxKeyPrefix))
		}
		if other := strings.TrimSpace(getenv(EnvKeyStaging)); other != "" {
			// A WARNING, not an error. It is dead configuration — production
			// reads only EnvKeyProd, so the staging key cannot be reached — and
			// refusing to boot over an unused variable would be a self-inflicted
			// outage. Selecting one variable per environment is what prevents the
			// fallback; this only removes the misleading appearance of one.
			cfg.Warnings = append(cfg.Warnings, fmt.Sprintf(
				"%s is set in production but is never read — remove it so it cannot be "+
					"mistaken for a fallback", EnvKeyStaging))
		}

	default:
		// staging, development and local all speak to the sandbox. Production
		// credentials must never be reachable from any of them.
		cfg.KeyVar = EnvKeyStaging
		cfg.APIKey = strings.TrimSpace(getenv(EnvKeyStaging))
		if cfg.APIKey == "" && !mockEnabled {
			errs = append(errs, fmt.Errorf(
				"%s is required in %s (the production key is deliberately NOT a fallback)",
				EnvKeyStaging, envLabel(env)))
		}
		if strings.HasPrefix(cfg.APIKey, prodKeyPrefix) {
			errs = append(errs, fmt.Errorf(
				"%s holds a LIVE key (%s…) — %s must use a sandbox key, or it books real "+
					"couriers against the live account", EnvKeyStaging, prodKeyPrefix, envLabel(env)))
		}
	}

	return cfg, errs
}

// ValidateConfig is the startup gate. It returns only FATAL problems — the ones
// that should stop the process — and the warnings separately, because the caller
// exits on anything in the error list.
func ValidateConfig(getenv func(string) string) (errs []error, warnings []string) {
	cfg, errs := ResolveConfig(getenv)
	return errs, cfg.Warnings
}

func envLabel(env string) string {
	if env == "" {
		return "an unnamed environment"
	}
	return env
}
