package seeder

import (
	"testing"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// A FRESH database, which is the only case that ever mattered.
//
// `SeedComprehensiveCategories` used to create the external (Shipbubble)
// categories AFTER the loop that resolves each category's `external_category_id`
// from them. On an empty database every lookup therefore missed, and all 13
// categories were saved with an empty linkage — silently, because the lookup
// returned ("", nil) for a missing row and the caller logged nothing. Only a
// SECOND run repaired it, once the external rows existed.
//
// That is not a cosmetic ordering nit. `shippingService` prefers a product's
// `external_category_id` and, when it is empty, falls back to guessing a
// Shipbubble category from the category name and the parcel's dimensions. So the
// symptom is not "no shipping" — it is wrong rates, with nothing to notice.
// Staging hit exactly this, and a production bootstrap would have too.
func freshDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.AutoMigrate(&domain.ExternalCategory{}, &domain.Category{}, &domain.SubCategory{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

type counts struct{ categories, subcategories, external, linked int64 }

func tally(t *testing.T, db *gorm.DB) counts {
	t.Helper()
	var c counts
	db.Model(&domain.Category{}).Count(&c.categories)
	db.Model(&domain.SubCategory{}).Count(&c.subcategories)
	db.Model(&domain.ExternalCategory{}).Count(&c.external)
	db.Model(&domain.Category{}).Where("external_category_id <> ''").Count(&c.linked)
	return c
}

func TestSeedComprehensiveCategories_OneRunOnFreshDB(t *testing.T) {
	db := freshDB(t)

	if err := SeedComprehensiveCategories(db); err != nil {
		t.Fatalf("seeding a fresh database must succeed, got: %v", err)
	}

	got := tally(t, db)
	want := counts{categories: 13, subcategories: 52, external: 11, linked: 13}

	if got.categories != want.categories {
		t.Errorf("categories = %d, want %d", got.categories, want.categories)
	}
	if got.subcategories != want.subcategories {
		t.Errorf("subcategories = %d, want %d", got.subcategories, want.subcategories)
	}
	if got.external != want.external {
		t.Errorf("external categories = %d, want %d", got.external, want.external)
	}
	// The regression this file exists for. Before the ordering fix this was 0.
	if got.linked != want.linked {
		t.Errorf("categories linked to an external category = %d, want %d — "+
			"seedShipbubbleCategories must run BEFORE the category loop",
			got.linked, want.linked)
	}
}

func TestSeedComprehensiveCategories_EveryLinkResolves(t *testing.T) {
	db := freshDB(t)
	if err := SeedComprehensiveCategories(db); err != nil {
		t.Fatalf("seed: %v", err)
	}

	// A non-empty id is not enough: it has to point at a row that exists.
	var categories []domain.Category
	db.Find(&categories)
	for _, c := range categories {
		if c.ExternalCategoryId == "" {
			t.Errorf("category %q has no external_category_id", c.Name)
			continue
		}
		var ext domain.ExternalCategory
		if err := db.Where("id = ?", c.ExternalCategoryId).First(&ext).Error; err != nil {
			t.Errorf("category %q points at external_category_id %q, which does not exist: %v",
				c.Name, c.ExternalCategoryId, err)
		}
	}
}

func TestSeedComprehensiveCategories_IsIdempotent(t *testing.T) {
	db := freshDB(t)
	if err := SeedComprehensiveCategories(db); err != nil {
		t.Fatalf("first run: %v", err)
	}
	first := tally(t, db)

	if err := SeedComprehensiveCategories(db); err != nil {
		t.Fatalf("second run: %v", err)
	}
	second := tally(t, db)

	// Re-running must repair nothing and duplicate nothing. Running it twice was
	// the workaround for the ordering bug; it must now be merely harmless.
	if first != second {
		t.Errorf("counts changed on a second run: %+v -> %+v", first, second)
	}
}
