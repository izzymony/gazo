package ports

import "github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"

type ReferralRepoInterface interface {
	// User lookups
	GetUserByUsername(username string) (*domain.User, error)
	GetUserByID(userID string) (*domain.User, error)

	// Referral setup
	SetReferredByUsername(userID, referrerUsername string) error
	GetReferredByUsername(userID string) (string, error)

	// Activation
	MarkReferralActivated(userID string) error
	IsReferralActivated(userID string) (bool, error)

	// Credit management
	UpdateShoppingCredit(userID string, amount float64) error
	UpdateWithdrawableCredit(userID string, amount float64) error
	GetUserCredits(userID string) (shoppingCredit float64, withdrawableCredit float64, err error)
	UpdateTotalReferralEarned(userID string, amount float64) error
	UpdateTotalWithdrawn(userID string, amount float64) error

	// Credit entries (audit trail)
	CreateCreditEntry(entry *domain.CreditEntry) error
	GetCreditEntries(userID string, page, limit int) ([]domain.CreditEntry, int64, error)
	GetCreditEntriesByType(userID, entryType string) ([]domain.CreditEntry, error)

	// Pending credits (for referral system)
	GetPendingCreditByReferee(referrerID, refereeID string) (*domain.CreditEntry, error)
	MarkCreditEntryUsed(entryID string) error
	GetPendingCreditsTotal(userID string) (float64, error)

	// Referral statistics
	CountReferrals(referrerUsername string) (total int64, activated int64, err error)
	GetReferees(referrerUsername string, page, limit int) ([]domain.User, int64, error)

	// Admin statistics
	GetReferralStats() (*domain.ReferralStats, error)
	GetUsersWithReferralData(search string, page, limit int) ([]domain.ReferralUserInfo, int64, error)
	GetUserCreditDetails(userID string) (*domain.User, []domain.CreditEntry, error)

	// Admin operations
	ManualCreditAdjustment(userID string, amount float64, creditType, description string) error
}
