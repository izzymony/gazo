package mysql_repo

import (
	"testing"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

// Payment-G regression: the order-on-success Verify flow persists the order, its
// items, the placed/payment activities and the item status update all inside ONE
// outer transaction. Before the fix, OrderRepository.Create / AppendActivity /
// UpdateOrderItem each ran their own manual `repo.db.Begin()`; on a handle that is
// already a *sql.Tx that Begin() returns ErrInvalidTransaction and the paired
// Rollback() aborted the OUTER checkout transaction — so the paid order silently
// vanished ("something went wrong"). These tests pin the fixed behaviour:
//  1. calling those methods on an outer-tx handle must NOT abort the outer tx, and
//  2. a validated order whose items carry zero-value (empty-id) associations must
//     persist without attempting to upsert association rows (there are deliberately
//     no businesses/shipments tables here — an association write would fail).
func setupOrderTxDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	sqlDB, err := db.DB()
	if err != nil {
		t.Fatalf("db handle: %v", err)
	}
	sqlDB.SetMaxOpenConns(1)

	if err := db.Exec(`CREATE TABLE orders (
		id TEXT PRIMARY KEY,
		created_at DATETIME,
		updated_at DATETIME,
		user_id TEXT,
		invoice TEXT,
		sub_total REAL,
		shipping_cost REAL,
		total REAL,
		credit_applied REAL DEFAULT 0,
		payment_method TEXT,
		payment_receipt TEXT,
		payment_received INTEGER DEFAULT 0,
		shipping_profile_id TEXT
	)`).Error; err != nil {
		t.Fatalf("create orders: %v", err)
	}
	if err := db.Exec(`CREATE TABLE order_items (
		id TEXT PRIMARY KEY,
		created_at DATETIME,
		updated_at DATETIME,
		order_id TEXT,
		product_id TEXT,
		business_id TEXT,
		price REAL,
		quantity INTEGER,
		shipping_option_id TEXT,
		shipment_id TEXT,
		status TEXT,
		buyer_activity TEXT,
		seller_activity TEXT,
		vendor_credited INTEGER DEFAULT 0,
		status_updated_at DATETIME,
		variant_selection TEXT,
		variant_data TEXT
	)`).Error; err != nil {
		t.Fatalf("create order_items: %v", err)
	}
	return db
}

// validatedOrder mimics an order-on-success payload: FK ids populated, association
// structs left at their zero value (as they arrive after the JSON round-trip).
func validatedOrder() *domain.Order {
	return &domain.Order{
		UserID:            "u1",
		Invoice:           "INV1",
		SubTotal:          500,
		Total:             525,
		CreditApplied:     0,
		ShippingProfileID: "sp1",
		Items: []domain.OrderItem{
			{
				ProductID:        "p1",
				BusinessID:       "b1",
				ShippingOptionID: "so1",
				Price:            500,
				Quantity:         1,
			},
		},
	}
}

func TestOrderCreate_InsideOuterTx_DoesNotAbortIt(t *testing.T) {
	db := setupOrderTxDB(t)

	outer := db.Begin()
	repo := &OrderRepository{db: outer}

	created, err := repo.Create(validatedOrder(), false)
	if err != nil {
		t.Fatalf("Create inside outer tx failed (association upsert or nested Begin?): %v", err)
	}
	if len(created.Items) != 1 || created.Items[0].ID == "" {
		t.Fatalf("expected 1 created item with an id, got %+v", created.Items)
	}
	itemID := created.Items[0].ID

	// AppendActivity + UpdateOrderItem were the other two nested-Begin landmines that
	// aborted the outer tx via their deferred Rollback.
	if _, err := repo.AppendActivity(itemID, domain.OrderActivity{
		Title: "Order Placed", Subtitle: "Order Placed", Details: "placed", Time: "t",
	}, "buyer", false); err != nil {
		t.Fatalf("AppendActivity inside outer tx failed: %v", err)
	}

	item := created.Items[0]
	item.Status = "payment_confirmed"
	if _, err := repo.UpdateOrderItem(itemID, item, false); err != nil {
		t.Fatalf("UpdateOrderItem inside outer tx failed: %v", err)
	}

	// THE REGRESSION: the outer tx must still be usable. Before the fix this write
	// failed with "sql: transaction has already been committed or rolled back".
	if err := outer.Exec(`INSERT INTO orders (id, invoice, total) VALUES ('sentinel','SENT',1)`).Error; err != nil {
		t.Fatalf("outer tx was aborted by a nested repo call (regression): %v", err)
	}
	if err := outer.Commit().Error; err != nil {
		t.Fatalf("commit outer tx: %v", err)
	}

	// After commit everything the flow wrote is durable.
	var orders, items, sentinels int64
	db.Table("orders").Where("invoice = ?", "INV1").Count(&orders)
	db.Table("orders").Where("id = ?", "sentinel").Count(&sentinels)
	db.Table("order_items").Where("id = ?", itemID).Count(&items)
	if orders != 1 || items != 1 || sentinels != 1 {
		t.Fatalf("expected all rows persisted; orders=%d items=%d sentinels=%d", orders, items, sentinels)
	}

	// UpdateOrderItem's write (a scalar column, Model-based) persisted through the
	// outer commit — proving a nested savepoint write survives. (AppendActivity's
	// jsonb activity-array content is asserted by the live Postgres E2E; sqlite's
	// schema-less .Table() map-update path doesn't round-trip MapArray's Valuer, so
	// we don't assert its serialized content here — only that it ran without aborting
	// the outer tx, which the sentinel INSERT + commit above already prove.)
	var status string
	db.Table("order_items").Select("status").Where("id = ?", itemID).Scan(&status)
	if status != "payment_confirmed" {
		t.Fatalf("UpdateOrderItem status not persisted, got %q", status)
	}
}

// If a nested repo call errors, it must roll back only ITS savepoint and surface the
// error so the caller can abort the whole checkout tx — it must never leave a
// half-written order committed on the outer tx.
func TestOrderCreate_OuterRollback_LeavesNothing(t *testing.T) {
	db := setupOrderTxDB(t)

	outer := db.Begin()
	repo := &OrderRepository{db: outer}
	created, err := repo.Create(validatedOrder(), false)
	if err != nil {
		t.Fatalf("Create inside outer tx failed: %v", err)
	}
	// Caller decides to abort the checkout (e.g. a later step failed).
	if err := outer.Rollback().Error; err != nil {
		t.Fatalf("rollback outer tx: %v", err)
	}

	var orders, items int64
	db.Table("orders").Where("id = ?", created.ID).Count(&orders)
	db.Table("order_items").Where("order_id = ?", created.ID).Count(&items)
	if orders != 0 || items != 0 {
		t.Fatalf("expected outer rollback to discard the order; orders=%d items=%d", orders, items)
	}
}
