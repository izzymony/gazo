package mysql_repo

import (
	"errors"
	"fmt"
	"strings"
	"time"

	"insta-api/internal/core/domain"
	"insta-api/internal/ports"

	"gorm.io/gorm"
)

type ReferralRepository struct {
	db *gorm.DB
}

func NewReferralRepository(db *gorm.DB) ports.ReferralRepoInterface {
	return &ReferralRepository{
		db: db,
	}
}

// GetUserByUsername finds a user by their username (case-insensitive)
func (repo *ReferralRepository) GetUserByUsername(username string) (*domain.User, error) {
	var user domain.User
	// Strip @ symbol if present
	username = strings.TrimPrefix(username, "@")

	err := repo.db.Where("LOWER(user_name) = LOWER(?)", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByID finds a user by their ID
func (repo *ReferralRepository) GetUserByID(userID string) (*domain.User, error) {
	var user domain.User
	err := repo.db.Where("id = ?", userID).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// SetReferredByUsername sets the referrer's username for a user
func (repo *ReferralRepository) SetReferredByUsername(userID, referrerUsername string) error {
	// Strip @ symbol if present
	referrerUsername = strings.TrimPrefix(referrerUsername, "@")

	return repo.db.Model(&domain.User{}).
		Where("id = ?", userID).
		Update("referred_by_username", referrerUsername).Error
}

// GetReferredByUsername gets the referrer's username for a user
func (repo *ReferralRepository) GetReferredByUsername(userID string) (string, error) {
	var user domain.User
	err := repo.db.Select("referred_by_username").Where("id = ?", userID).First(&user).Error
	if err != nil {
		return "", err
	}
	return user.ReferredByUsername, nil
}

// MarkReferralActivated marks a user's referral as activated
func (repo *ReferralRepository) MarkReferralActivated(userID string) error {
	return repo.db.Model(&domain.User{}).
		Where("id = ?", userID).
		Update("referral_activated", true).Error
}

// IsReferralActivated checks if a user's referral has been activated
func (repo *ReferralRepository) IsReferralActivated(userID string) (bool, error) {
	var user domain.User
	err := repo.db.Select("referral_activated").Where("id = ?", userID).First(&user).Error
	if err != nil {
		return false, err
	}
	return user.ReferralActivated, nil
}

// UpdateShoppingCredit updates the shopping credit for a user
func (repo *ReferralRepository) UpdateShoppingCredit(userID string, amount float64) error {
	return repo.db.Model(&domain.User{}).
		Where("id = ?", userID).
		Update("shopping_credit", gorm.Expr("shopping_credit + ?", amount)).Error
}

// UpdateWithdrawableCredit updates the withdrawable credit for a user
func (repo *ReferralRepository) UpdateWithdrawableCredit(userID string, amount float64) error {
	return repo.db.Model(&domain.User{}).
		Where("id = ?", userID).
		Update("withdrawable_credit", gorm.Expr("withdrawable_credit + ?", amount)).Error
}

// GetUserCredits gets the credit balances for a user
func (repo *ReferralRepository) GetUserCredits(userID string) (float64, float64, error) {
	var user domain.User
	err := repo.db.Select("shopping_credit", "withdrawable_credit").Where("id = ?", userID).First(&user).Error
	if err != nil {
		return 0, 0, err
	}
	return user.ShoppingCredit, user.WithdrawableCredit, nil
}

// UpdateTotalReferralEarned updates the total referral earnings for a user
func (repo *ReferralRepository) UpdateTotalReferralEarned(userID string, amount float64) error {
	return repo.db.Model(&domain.User{}).
		Where("id = ?", userID).
		Update("total_referral_earned", gorm.Expr("total_referral_earned + ?", amount)).Error
}

// UpdateTotalWithdrawn updates the total withdrawn amount for a user
func (repo *ReferralRepository) UpdateTotalWithdrawn(userID string, amount float64) error {
	return repo.db.Model(&domain.User{}).
		Where("id = ?", userID).
		Update("total_withdrawn", gorm.Expr("total_withdrawn + ?", amount)).Error
}

// CreateCreditEntry creates a new credit entry record
func (repo *ReferralRepository) CreateCreditEntry(entry *domain.CreditEntry) error {
	return repo.db.Create(entry).Error
}

// GetCreditEntries gets paginated credit entries for a user
func (repo *ReferralRepository) GetCreditEntries(userID string, page, limit int) ([]domain.CreditEntry, int64, error) {
	var entries []domain.CreditEntry
	var total int64

	offset := (page - 1) * limit

	// Get total count
	if err := repo.db.Model(&domain.CreditEntry{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get entries
	if err := repo.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&entries).Error; err != nil {
		return nil, 0, err
	}

	return entries, total, nil
}

// GetCreditEntriesByType gets credit entries of a specific type for a user
func (repo *ReferralRepository) GetCreditEntriesByType(userID, entryType string) ([]domain.CreditEntry, error) {
	var entries []domain.CreditEntry
	err := repo.db.Where("user_id = ? AND type = ?", userID, entryType).
		Order("created_at DESC").
		Find(&entries).Error
	return entries, err
}

// GetPendingCreditByReferee finds a pending credit entry for a specific referee
func (repo *ReferralRepository) GetPendingCreditByReferee(referrerID, refereeID string) (*domain.CreditEntry, error) {
	var entry domain.CreditEntry
	err := repo.db.Where(
		"user_id = ? AND referee_id = ? AND type = ? AND used_at IS NULL",
		referrerID, refereeID, domain.CreditTypePendingReferralBonus,
	).First(&entry).Error
	if err != nil {
		return nil, err
	}
	return &entry, nil
}

// MarkCreditEntryUsed marks a credit entry as used/converted
func (repo *ReferralRepository) MarkCreditEntryUsed(entryID string) error {
	now := time.Now()
	return repo.db.Model(&domain.CreditEntry{}).Where("id = ?", entryID).Update("used_at", &now).Error
}

// GetPendingCreditsTotal sums all unconverted pending credits for a user
func (repo *ReferralRepository) GetPendingCreditsTotal(userID string) (float64, error) {
	var total float64
	err := repo.db.Model(&domain.CreditEntry{}).
		Where("user_id = ? AND type = ? AND used_at IS NULL", userID, domain.CreditTypePendingReferralBonus).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&total).Error
	return total, err
}

// CountReferrals counts total and activated referrals for a referrer
func (repo *ReferralRepository) CountReferrals(referrerUsername string) (int64, int64, error) {
	var total, activated int64

	// Strip @ symbol if present
	referrerUsername = strings.TrimPrefix(referrerUsername, "@")

	// Count total referrals
	if err := repo.db.Model(&domain.User{}).
		Where("LOWER(referred_by_username) = LOWER(?)", referrerUsername).
		Count(&total).Error; err != nil {
		return 0, 0, err
	}

	// Count activated referrals
	if err := repo.db.Model(&domain.User{}).
		Where("LOWER(referred_by_username) = LOWER(?) AND referral_activated = ?", referrerUsername, true).
		Count(&activated).Error; err != nil {
		return 0, 0, err
	}

	return total, activated, nil
}

// GetReferees gets users who were referred by a specific referrer
func (repo *ReferralRepository) GetReferees(referrerUsername string, page, limit int) ([]domain.User, int64, error) {
	var users []domain.User
	var total int64

	// Strip @ symbol if present
	referrerUsername = strings.TrimPrefix(referrerUsername, "@")

	offset := (page - 1) * limit

	// Get total count
	if err := repo.db.Model(&domain.User{}).
		Where("LOWER(referred_by_username) = LOWER(?)", referrerUsername).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get referees
	if err := repo.db.Where("LOWER(referred_by_username) = LOWER(?)", referrerUsername).
		Select("id", "firstname", "lastname", "user_name", "email", "referral_activated", "created_at").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&users).Error; err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// GetReferralStats gets overall referral program statistics (for admin)
func (repo *ReferralRepository) GetReferralStats() (*domain.ReferralStats, error) {
	stats := &domain.ReferralStats{}

	// Count total signups with referral
	if err := repo.db.Model(&domain.User{}).
		Where("referred_by_username IS NOT NULL AND referred_by_username != ''").
		Count(&stats.TotalSignupsWithReferral).Error; err != nil {
		return nil, err
	}

	// Calculate total credits issued (sum of all positive credit entries)
	var totalIssued struct {
		Sum float64
	}
	if err := repo.db.Model(&domain.CreditEntry{}).
		Select("COALESCE(SUM(amount), 0) as sum").
		Where("amount > 0 AND type IN (?, ?, ?)",
			domain.CreditTypeSignupBonus,
			domain.CreditTypeReferralBonusShopping,
			domain.CreditTypeReferralBonusWithdrawable).
		Scan(&totalIssued).Error; err != nil {
		return nil, err
	}
	stats.TotalCreditsIssued = totalIssued.Sum

	// Calculate total credits used
	var totalUsed struct {
		Sum float64
	}
	if err := repo.db.Model(&domain.CreditEntry{}).
		Select("COALESCE(SUM(ABS(amount)), 0) as sum").
		Where("type = ?", domain.CreditTypeUsage).
		Scan(&totalUsed).Error; err != nil {
		return nil, err
	}
	stats.TotalCreditsUsed = totalUsed.Sum

	// Calculate total withdrawn
	var totalWithdrawn struct {
		Sum float64
	}
	if err := repo.db.Model(&domain.CreditEntry{}).
		Select("COALESCE(SUM(ABS(amount)), 0) as sum").
		Where("type = ?", domain.CreditTypeWithdrawal).
		Scan(&totalWithdrawn).Error; err != nil {
		return nil, err
	}
	stats.TotalWithdrawn = totalWithdrawn.Sum

	// Calculate outstanding credits (sum of all user credits)
	var outstanding struct {
		Sum float64
	}
	if err := repo.db.Model(&domain.User{}).
		Select("COALESCE(SUM(shopping_credit + withdrawable_credit), 0) as sum").
		Scan(&outstanding).Error; err != nil {
		return nil, err
	}
	stats.TotalCreditsOutstanding = outstanding.Sum

	// Get top referrers
	var topReferrers []struct {
		UserName            string  `gorm:"column:user_name"`
		TotalReferralEarned float64 `gorm:"column:total_referral_earned"`
		ReferralCount       int64   `gorm:"column:referral_count"`
	}
	if err := repo.db.Table("users u").
		Select("u.user_name, u.total_referral_earned, COUNT(r.id) as referral_count").
		Joins("LEFT JOIN users r ON LOWER(r.referred_by_username) = LOWER(u.user_name)").
		Where("u.total_referral_earned > 0").
		Group("u.id, u.user_name, u.total_referral_earned").
		Order("u.total_referral_earned DESC").
		Limit(10).
		Scan(&topReferrers).Error; err != nil {
		return nil, err
	}

	stats.TopReferrers = make([]domain.TopReferrerInfo, len(topReferrers))
	for i, tr := range topReferrers {
		stats.TopReferrers[i] = domain.TopReferrerInfo{
			Username:  tr.UserName,
			Referrals: tr.ReferralCount,
			Earned:    tr.TotalReferralEarned,
		}
	}

	// Get this month's stats
	startOfMonth := time.Now().UTC().Truncate(24 * time.Hour)
	startOfMonth = time.Date(startOfMonth.Year(), startOfMonth.Month(), 1, 0, 0, 0, 0, time.UTC)

	if err := repo.db.Model(&domain.User{}).
		Where("referred_by_username IS NOT NULL AND referred_by_username != '' AND created_at >= ?", startOfMonth).
		Count(&stats.SignupsThisMonth).Error; err != nil {
		return nil, err
	}

	var monthlyUsed struct {
		Sum float64
	}
	if err := repo.db.Model(&domain.CreditEntry{}).
		Select("COALESCE(SUM(ABS(amount)), 0) as sum").
		Where("type = ? AND created_at >= ?", domain.CreditTypeUsage, startOfMonth).
		Scan(&monthlyUsed).Error; err != nil {
		return nil, err
	}
	stats.CreditsUsedThisMonth = monthlyUsed.Sum

	return stats, nil
}

// GetUsersWithReferralData gets users with their referral data (for admin)
func (repo *ReferralRepository) GetUsersWithReferralData(search string, page, limit int) ([]domain.ReferralUserInfo, int64, error) {
	var users []domain.ReferralUserInfo
	var total int64

	offset := (page - 1) * limit

	query := repo.db.Table("users")

	if search != "" {
		searchPattern := "%" + strings.ToLower(search) + "%"
		query = query.Where("LOWER(user_name) LIKE ? OR LOWER(email) LIKE ?", searchPattern, searchPattern)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get users with referral counts
	rows, err := repo.db.Table("users u").
		Select(`u.id, u.user_name as username, u.email, u.shopping_credit, u.withdrawable_credit,
			u.total_referral_earned, u.total_withdrawn, u.referred_by_username, u.referral_activated, u.created_at,
			(SELECT COUNT(*) FROM users r WHERE LOWER(r.referred_by_username) = LOWER(u.user_name)) as total_referrals,
			(SELECT COUNT(*) FROM users r WHERE LOWER(r.referred_by_username) = LOWER(u.user_name) AND r.referral_activated = true) as activated_referrals`).
		Where(func() string {
			if search != "" {
				return "LOWER(u.user_name) LIKE ? OR LOWER(u.email) LIKE ?"
			}
			return "1=1"
		}(), "%"+strings.ToLower(search)+"%", "%"+strings.ToLower(search)+"%").
		Order("u.created_at DESC").
		Offset(offset).
		Limit(limit).
		Rows()
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	for rows.Next() {
		var user domain.ReferralUserInfo
		if err := rows.Scan(
			&user.ID, &user.Username, &user.Email, &user.ShoppingCredit, &user.WithdrawableCredit,
			&user.TotalReferralEarned, &user.TotalWithdrawn, &user.ReferredByUsername, &user.ReferralActivated,
			&user.CreatedAt, &user.TotalReferrals, &user.ActivatedReferrals,
		); err != nil {
			return nil, 0, err
		}
		users = append(users, user)
	}

	return users, total, nil
}

// GetUserCreditDetails gets a user and their credit entries (for admin)
func (repo *ReferralRepository) GetUserCreditDetails(userID string) (*domain.User, []domain.CreditEntry, error) {
	var user domain.User
	var entries []domain.CreditEntry

	if err := repo.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, nil, err
	}

	if err := repo.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&entries).Error; err != nil {
		return nil, nil, err
	}

	return &user, entries, nil
}

// ManualCreditAdjustment performs a manual credit adjustment (admin operation)
func (repo *ReferralRepository) ManualCreditAdjustment(userID string, amount float64, creditType, description string) error {
	return repo.db.Transaction(func(tx *gorm.DB) error {
		// Update the appropriate credit field
		var updateField string
		if creditType == "shopping" || creditType == domain.CreditTypeSignupBonus {
			updateField = "shopping_credit"
		} else if creditType == "withdrawable" {
			updateField = "withdrawable_credit"
		} else {
			return errors.New("invalid credit type: must be 'shopping' or 'withdrawable'")
		}

		if err := tx.Model(&domain.User{}).
			Where("id = ?", userID).
			Update(updateField, gorm.Expr(updateField+" + ?", amount)).Error; err != nil {
			return err
		}

		// Create credit entry for audit
		entry := &domain.CreditEntry{
			UserID:      userID,
			Amount:      amount,
			Remaining:   amount,
			Type:        domain.CreditTypeManualAdjustment,
			Source:      domain.CreditSourceAdmin,
			Description: description,
		}
		if err := tx.Create(entry).Error; err != nil {
			return err
		}

		return nil
	})
}

// DeductCredits deducts credits from a user (shopping first, then withdrawable)
func (repo *ReferralRepository) DeductCredits(userID string, amount float64, orderID string) error {
	return repo.db.Transaction(func(tx *gorm.DB) error {
		// Get current credits
		var user domain.User
		if err := tx.Select("shopping_credit", "withdrawable_credit").Where("id = ?", userID).First(&user).Error; err != nil {
			return err
		}

		totalCredit := user.ShoppingCredit + user.WithdrawableCredit
		if amount > totalCredit {
			return fmt.Errorf("insufficient credit balance: have %.2f, need %.2f", totalCredit, amount)
		}

		// Deduct from shopping credit first
		shoppingDeduct := amount
		if shoppingDeduct > user.ShoppingCredit {
			shoppingDeduct = user.ShoppingCredit
		}
		withdrawableDeduct := amount - shoppingDeduct

		// Update credits
		if shoppingDeduct > 0 {
			if err := tx.Model(&domain.User{}).
				Where("id = ?", userID).
				Update("shopping_credit", gorm.Expr("shopping_credit - ?", shoppingDeduct)).Error; err != nil {
				return err
			}
		}

		if withdrawableDeduct > 0 {
			if err := tx.Model(&domain.User{}).
				Where("id = ?", userID).
				Update("withdrawable_credit", gorm.Expr("withdrawable_credit - ?", withdrawableDeduct)).Error; err != nil {
				return err
			}
		}

		// Create credit entry for audit
		now := time.Now()
		entry := &domain.CreditEntry{
			UserID:      userID,
			Amount:      -amount,
			Type:        domain.CreditTypeUsage,
			Source:      domain.CreditSourceCheckout,
			OrderID:     orderID,
			UsedAt:      &now,
			Description: fmt.Sprintf("Used ₦%.2f credit on order", amount),
		}
		if err := tx.Create(entry).Error; err != nil {
			return err
		}

		return nil
	})
}
