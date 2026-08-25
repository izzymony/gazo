package migration

import (
	"fmt"

	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/database"

	log "github.com/sirupsen/logrus"
)

func Migrate() {
	log.Println("running migrations...")
	db := database.ConnectDB()

	tables := []interface{}{
		&domain.User{},
		&domain.OTP{},
		&domain.Business{},
		&domain.BusinessAddress{},
		&domain.BusinessSetting{},
		&domain.BusinessBankAccountDetail{},
		&domain.Category{},
		&domain.SubCategory{},
		&domain.Variant{},
		&domain.Order{},
		&domain.OrderItem{},
		&domain.ShippingProfile{},
		&domain.Product{},
		&domain.ShippingOption{},
		&domain.Transaction{},
		&domain.ProductRating{},
		&domain.ShippingUser{},
		&domain.ExternalCategory{},
		&domain.ProductWishlist{},
		&domain.RecentlyViewedBusiness{},
		&domain.Shipment{},
		&domain.RecentlyViewedProduct{},
		&domain.Follower{},
		&domain.Discount{},
		&domain.Wallet{},
		&domain.WalletTransaction{},
		&domain.VerificationCode{},
		&domain.WithdrawalRequest{},
		&domain.Admin{},
		&domain.AdminUser{},
		&domain.AdminSession{},
		&domain.AdminAuditLog{},
		&domain.AdminRole{},
		&domain.AdminNotification{},
		&domain.Collection{},
		&domain.TwilioCache{},
		&domain.KYC{},
		&domain.Conversation{},
		&domain.ConversationMessage{},
		&domain.Notification{},
		// Transactional Notification System tables
		&domain.NotificationTemplate{},
		&domain.NotificationLog{},
		&domain.UserNotificationPreferences{},
		// Referral System
		&domain.CreditEntry{},
	}

	// GORM's AutoMigrate returns on the FIRST table that errors, and the error
	// used to be discarded here — so one drifted table silently skipped every
	// model after it (notifications and 13 others never got migrated). Migrate
	// each table independently and log failures so one bad table can't halt the
	// rest. FK constraints are disabled during migration (see database.ConnectDB),
	// so per-table ordering is not a concern.
	for _, table := range tables {
		if err := db.AutoMigrate(table); err != nil {
			log.Errorf("automigrate %T failed: %v", table, err)
		}
	}

	// NS2 audience column. AutoMigrate now reaches notifications and creates this
	// itself, but the explicit ADD COLUMN is kept as a belt-and-braces guard (it is
	// idempotent) in case the loop above ever logs a failure for this model. The
	// backfill fills rows created before the field existed — deriving the side from
	// the action_url (dashboard/verify = seller).
	db.Exec(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS audience text`)
	db.Exec(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS badge boolean DEFAULT true`)

	// NS2 Phase 4 — Mailbox A (Activity) fully retired: the notification feed
	// now reads Mailbox B (Notification) end-to-end. Drop the dead table so it
	// can't drift. Idempotent; nothing references it after this migration.
	db.Exec(`DROP TABLE IF EXISTS activities`)
	db.Model(&domain.Notification{}).
		Where("audience = '' OR audience IS NULL").
		Update("audience", gorm.Expr(
			"CASE WHEN action_url LIKE '/dashboard%' OR action_url LIKE '/verify%' THEN 'seller' ELSE 'buyer' END"))

	for _, table := range []interface{}{
		&domain.User{},
		&domain.Order{},
		&domain.ShippingProfile{},
		&domain.ShippingOption{},
		&domain.Transaction{},
		&domain.ShippingUser{},
		&domain.Product{},
		&domain.OrderItem{},
		&domain.ProductWishlist{},
		&domain.RecentlyViewedBusiness{},
		&domain.RecentlyViewedProduct{},
		&domain.Follower{},
	} {
		originalTableName := getTableName(db, table)
		guestTableName := originalTableName + "_guest"

		createTableSQL := fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s (LIKE %s INCLUDING ALL)", guestTableName, originalTableName)
		db.Exec(createTableSQL)

		var originalColumns, guestColumns []string

		db.Raw(fmt.Sprintf("SELECT column_name FROM information_schema.columns WHERE table_name = '%s'", originalTableName)).Scan(&originalColumns)
		db.Raw(fmt.Sprintf("SELECT column_name FROM information_schema.columns WHERE table_name = '%s'", guestTableName)).Scan(&guestColumns)

		guestColumnMap := make(map[string]bool)
		for _, col := range guestColumns {
			guestColumnMap[col] = true
		}

		for _, col := range originalColumns {
			if !guestColumnMap[col] {
				var columnDef string
				db.Raw(fmt.Sprintf("SELECT column_name || ' ' || data_type FROM information_schema.columns WHERE table_name = '%s' AND column_name = '%s'", originalTableName, col)).Scan(&columnDef)

				if columnDef != "" {
					alterSQL := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s", guestTableName, columnDef)
					db.Exec(alterSQL)
				}
			}
		}
	}

	// custom constraints
	db.Exec(`
	DO $$
	BEGIN
		IF EXISTS (
			SELECT 1 FROM pg_indexes
			WHERE indexname = 'idx_user_verification_code_uuid'
		) THEN
			EXECUTE 'DROP INDEX idx_user_verification_code_uuid';
		END IF;
	END
	$$;
`)

	db.Exec(`
	CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_code_uuid_active
	ON verification_codes (uuid)
	WHERE used = false;
`)

	// P3 two-source shipping model — backfill the new business_setting columns
	// (partner_enabled + self_zones) that AutoMigrate added, and rename the
	// legacy shipping_type value INSTA -> PARTNER. Idempotent + additive: legacy
	// columns are kept, and defaults preserve today's Partner-only behavior.
	// The options/shipment branching that reads these lands in phase D.
	db.Exec(`UPDATE business_settings SET shipping_type = 'PARTNER' WHERE shipping_type = 'INSTA';`)
	// Sellers explicitly on the old Self-only model keep Partner off; everyone
	// else keeps Partner on (the AutoMigrate default:true already applied it).
	db.Exec(`UPDATE business_settings SET partner_enabled = false WHERE shipping_type = 'SELF';`)
	// Seed Self zones for legacy rows (NULL) from the old flat shipping_amount:
	// Local required/enabled at that rate, Interstate + International off.
	db.Exec(`
	UPDATE business_settings
	SET self_zones = jsonb_build_object(
		'local', jsonb_build_object('enabled', true, 'rate', COALESCE(shipping_amount, 0)),
		'interstate', jsonb_build_object('enabled', false, 'rate', 0),
		'international', jsonb_build_object('enabled', false, 'rate', 0)
	)
	WHERE self_zones IS NULL;
`)
}

func getTableName(db *gorm.DB, model interface{}) string {
	stmt := &gorm.Statement{DB: db}
	stmt.Parse(model)
	return stmt.Schema.Table
}
