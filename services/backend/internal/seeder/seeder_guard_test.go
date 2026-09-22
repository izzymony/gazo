package seeder

import (
	"testing"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// The demo seeder creates a login whose password is committed in this repo
// (sam.show@example.com / password123). It used to run in ANY environment, and
// docs/ENV-PREFLIGHT.md documents `./backend seed` as the PRODUCTION step for
// bootstrapping the first admin — so following the runbook planted a
// known-credential account in production.
func TestSeedDemoDataIsLocalOnly(t *testing.T) {
	for _, env := range []string{"staging", "production", "STAGING", ""} {
		t.Run("skips in "+env, func(t *testing.T) {
			t.Setenv("APP_ENV", env)
			t.Setenv("ENV", env)

			db := demoTestDB(t)
			seedDemoData(db)

			var count int64
			if err := db.Model(&domain.User{}).
				Where("email = ?", "sam.show@example.com").
				Count(&count).Error; err != nil {
				t.Fatalf("count users: %v", err)
			}
			if count != 0 {
				t.Fatalf("APP_ENV=%q seeded the committed-password test account (%d rows); it must be local-only", env, count)
			}
		})
	}
}

// The guard must not be so broad that it also disables local development.
func TestSeedDemoDataRunsLocally(t *testing.T) {
	t.Setenv("APP_ENV", "local")
	t.Setenv("ENV", "local")

	db := demoTestDB(t)
	seedDemoData(db)

	var count int64
	if err := db.Model(&domain.User{}).
		Where("email = ?", "sam.show@example.com").
		Count(&count).Error; err != nil {
		t.Fatalf("count users: %v", err)
	}
	if count == 0 {
		t.Fatal("local seeding created no demo user — the guard is too broad")
	}
}

func TestIsLocalSeedEnv(t *testing.T) {
	cases := map[string]bool{
		"local": true, "dev": true, "development": true,
		"LOCAL": true, " local ": true,
		"staging": false, "production": false, "prod": false, "": false,
	}
	for value, want := range cases {
		t.Run("APP_ENV="+value, func(t *testing.T) {
			t.Setenv("APP_ENV", value)
			t.Setenv("ENV", "")
			if got := isLocalSeedEnv(); got != want {
				t.Fatalf("isLocalSeedEnv() with APP_ENV=%q = %v, want %v", value, got, want)
			}
		})
	}
}

func demoTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&domain.User{}); err != nil {
		t.Skipf("domain.User does not migrate on sqlite: %v", err)
	}
	return db
}
