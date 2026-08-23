package routes

import (
	"os"
	"strings"
)

// isLocalEnv reports whether the app is running in a local/dev environment.
// Mirrors the CORS dev-mode check (APP_ENV / ENV in {local, dev, development})
// so that mock + debug endpoints are ONLY registered locally, never in
// staging/production (E0.2).
func isLocalEnv() bool {
	for _, v := range []string{os.Getenv("APP_ENV"), os.Getenv("ENV")} {
		switch strings.ToLower(strings.TrimSpace(v)) {
		case "local", "dev", "development":
			return true
		}
	}
	return false
}
