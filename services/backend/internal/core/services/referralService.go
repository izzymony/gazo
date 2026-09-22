package services

import (
	"context"
	"errors"
	"fmt"
	"strings"

	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/database"
	"github.com/Tinovalabs/vibaar/services/backend/internal/dberr"
	"github.com/Tinovalabs/vibaar/services/backend/internal/logger"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"gorm.io/gorm"
)

type ReferralService struct {
	repo       ports.ReferralRepoInterface
	db         *gorm.DB
	dispatcher *NotificationDispatcher
}

func NewReferralService(db *gorm.DB) *ReferralService {
	return &ReferralService{
		repo:       mysql_repo.NewReferralRepository(db),
		db:         db,
		dispatcher: NewNotificationDispatcher(db),
	}
}

// CreditSignupBonus credits the universal ₦1,000 signup bonus to a new user
// This is called for ALL new users, regardless of whether they use a referral code
func (s *ReferralService) CreditSignupBonus(userID string) error {
	err := database.WithTransaction(s.db, "credit_signup_bonus", func(tx *gorm.DB) error {
		txRepo := mysql_repo.NewReferralRepository(tx)

		// Idempotency (RW1): one signup bonus per user. This fast-path check stops
		// the common retry cheaply; the AUTHORITATIVE guard is the partial unique
		// index idx_credit_entries_one_signup_bonus_per_user (migration 013),
		// because under READ COMMITTED two concurrent calls can both read zero
		// rows here and both insert. The unique-violation branch below is what
		// actually makes this safe.
		if existing, _ := txRepo.GetCreditEntriesByType(userID, domain.CreditTypeSignupBonus); len(existing) > 0 {
			logger.Info("Signup bonus already granted, skipping for user: " + userID)
			return nil
		}

		// Credit ₦1,000 shopping credit
		if err := txRepo.UpdateShoppingCredit(userID, domain.SignupBonusAmount); err != nil {
			return fmt.Errorf("failed to credit signup bonus: %w", err)
		}

		// Create credit entry for audit
		entry := &domain.CreditEntry{
			UserID:      userID,
			Amount:      domain.SignupBonusAmount,
			Remaining:   domain.SignupBonusAmount,
			Type:        domain.CreditTypeSignupBonus,
			Source:      domain.CreditSourceSignup,
			Description: "₦1,000 welcome bonus - thank you for joining Vibaar!",
		}
		if err := txRepo.CreateCreditEntry(entry); err != nil {
			return fmt.Errorf("failed to create signup bonus credit entry: %w", err)
		}

		logger.Info(fmt.Sprintf("Credited ₦%.0f signup bonus to user: %s", domain.SignupBonusAmount, userID))
		return nil
	})
	if err != nil {
		// Lost a concurrency race: another call inserted this user's signup bonus
		// between our check and our insert, and migration 013's partial unique
		// index rejected ours. The whole transaction rolled back, so no credit was
		// applied here — the winner granted it exactly once. Treat as success.
		//
		// This is deliberately handled OUTSIDE the transaction: returning nil from
		// inside would make GORM COMMIT, persisting the UpdateShoppingCredit
		// increment without its ledger entry — the exact double-credit this guards.
		if isSignupBonusRaceLoss(err) {
			logger.Info("Signup bonus already granted concurrently, skipping for user: " + userID)
			return nil // no welcome emit — the winning call sends it
		}
		return err
	}

	// NS2 buyer.account.welcome — post-commit, best-effort. CreditSignupBonus is
	// the universal new-user funnel (called once per signup across all auth types).
	_ = s.dispatcher.Emit(context.Background(), EmitInput{
		Event:  "buyer.account.welcome",
		UserID: userID,
	})
	return nil
}

// signupBonusIndex is the partial unique index from migration 013 that makes
// CreditSignupBonus safe under concurrency. Named here as a constant because it
// is a schema object this code branches on, not a string in an error message.
const signupBonusIndex = "idx_credit_entries_one_signup_bonus_per_user"

// isSignupBonusRaceLoss reports whether err is the unique violation raised by
// signupBonusIndex — i.e. a concurrent call already granted this user's bonus.
//
// Asked of the SANITIZED error, because errors from the repository boundary no
// longer carry a driver message (see internal/dberr). This function previously
// inspected *pgconn.PgError.ConstraintName and, failing that, substring-matched
// the driver's text; the boundary discards both, so both checks silently
// stopped matching and every race loser would have surfaced as a failed signup.
// Its tests did not catch that because they all constructed raw
// *pgconn.PgError values, which the application no longer produces here.
//
// dberr.IsDuplicateOn requires the class AND the constraint, so a unique
// violation on any other constraint still surfaces as a real error — which
// matters, because swallowing one would hide a double-credit.
func isSignupBonusRaceLoss(err error) bool {
	return dberr.IsDuplicateOn(err, signupBonusIndex)
}

// ValidateReferralUsername checks if a username exists and is not the user's own
func (s *ReferralService) ValidateReferralUsername(username, selfID string) (bool, *domain.User, error) {
	// Strip @ if present
	username = strings.TrimPrefix(username, "@")
	if username == "" {
		return false, nil, errors.New("referral username cannot be empty")
	}

	// Find the referrer by username
	referrer, err := s.repo.GetUserByUsername(username)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, nil, errors.New("username not found")
		}
		return false, nil, err
	}

	// Check if user is trying to refer themselves
	if referrer.ID == selfID {
		return false, nil, errors.New("you cannot refer yourself")
	}

	return true, referrer, nil
}

// SetReferrer stores the referral relationship during profile completion
// and creates a pending credit entry for the referrer (₦500 pending until referee's first order)
// Note: Referee already received ₦1,000 signup bonus during registration (universal bonus)
func (s *ReferralService) SetReferrer(refereeID, referrerUsername string) error {
	// Strip @ if present
	referrerUsername = strings.TrimPrefix(referrerUsername, "@")

	// Get the referee to check if already referred
	referee, err := s.repo.GetUserByID(refereeID)
	if err != nil {
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Check if already has a referrer
	if referee.ReferredByUsername != "" {
		return errors.New("you have already used a referral code")
	}

	// Validate the referrer exists and is not self
	valid, referrer, err := s.ValidateReferralUsername(referrerUsername, refereeID)
	if err != nil {
		return err
	}
	if !valid || referrer == nil {
		return errors.New("invalid referral username")
	}

	// Use transaction to store relationship and create pending entry
	return database.WithTransaction(s.db, "set_referrer", func(tx *gorm.DB) error {
		txRepo := mysql_repo.NewReferralRepository(tx)

		// Store the referrer's username
		if err := txRepo.SetReferredByUsername(refereeID, referrerUsername); err != nil {
			return fmt.Errorf("failed to set referrer: %w", err)
		}

		// Get referee info for description
		refereeName := "new user"
		if referee.UserName != "" {
			refereeName = "@" + referee.UserName
		}

		// Create pending entry for referrer (₦500 pending until referee completes first order)
		pendingEntry := &domain.CreditEntry{
			UserID:      referrer.ID,
			Amount:      domain.ReferralBonusAmount, // ₦500
			Type:        domain.CreditTypePendingReferralBonus,
			Source:      domain.CreditSourceReferralActivation,
			RefereeID:   refereeID,
			Description: fmt.Sprintf("Pending ₦%.0f - waiting for %s to complete first order", domain.ReferralBonusAmount, refereeName),
		}
		if err := txRepo.CreateCreditEntry(pendingEntry); err != nil {
			return fmt.Errorf("failed to create pending credit entry: %w", err)
		}

		logger.Info(fmt.Sprintf("Referral set: referee=%s, referrer=%s (pending ₦%.0f)", refereeID, referrerUsername, domain.ReferralBonusAmount))
		return nil
	})
}

// ActivateReferral is called when the referee completes their first order
// It converts the referrer's pending credit to actual credit
// Note: Referee already received ₦1,000 signup bonus during registration (universal bonus)
func (s *ReferralService) ActivateReferral(refereeID, orderID string) error {
	// Get referee
	referee, err := s.repo.GetUserByID(refereeID)
	if err != nil {
		return fmt.Errorf("failed to find referee: %w", err)
	}

	// Check if already activated
	if referee.ReferralActivated {
		logger.Info("Referral already activated for user: " + refereeID)
		return nil
	}

	// Check if has a referrer
	if referee.ReferredByUsername == "" {
		logger.Info("No referrer for user: " + refereeID)
		return nil
	}

	// Get referrer by username
	referrer, err := s.repo.GetUserByUsername(referee.ReferredByUsername)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Referrer account might have been deleted - just mark activated
			logger.Info("Referrer not found: " + referee.ReferredByUsername)
		} else {
			return fmt.Errorf("failed to find referrer: %w", err)
		}
	}

	// Use transaction for atomic updates
	return database.WithTransaction(s.db, "activate_referral", func(tx *gorm.DB) error {
		txRepo := mysql_repo.NewReferralRepository(tx)

		// Atomic winner-takes-all activation guard (RW1): flip referral_activated
		// false->true. `Verify` can run more than once for a referee (payment retry,
		// webhook redelivery, reconcile cron all funnel through it); the earlier
		// `referee.ReferralActivated` check is only a cheap early-out, NOT the guard.
		// If we didn't win the flip, a concurrent/retried pass already activated +
		// credited — return without crediting so the referrer is never double-credited.
		won, err := txRepo.MarkReferralActivatedIfNot(refereeID)
		if err != nil {
			return fmt.Errorf("failed to claim referral activation: %w", err)
		}
		if !won {
			logger.Info("Referral activation already claimed (lost race) for user: " + refereeID)
			return nil
		}

		// Note: Referee already received ₦1,000 signup bonus at registration (universal bonus)
		// No additional credit for referee here

		// Credit referrer (if exists): convert pending ₦500 to ₦250 shopping + ₦250 withdrawable
		if referrer != nil {
			// Find and mark the pending credit entry as used
			pendingEntry, err := txRepo.GetPendingCreditByReferee(referrer.ID, refereeID)
			if err == nil && pendingEntry != nil {
				if err := txRepo.MarkCreditEntryUsed(pendingEntry.ID); err != nil {
					logger.Error(fmt.Sprintf("Failed to mark pending entry as used: %v", err))
				}
			}

			// Shopping credit portion
			if err := txRepo.UpdateShoppingCredit(referrer.ID, domain.ReferralBonusShopping); err != nil {
				return fmt.Errorf("failed to credit referrer shopping: %w", err)
			}

			referrerShoppingEntry := &domain.CreditEntry{
				UserID:      referrer.ID,
				Amount:      domain.ReferralBonusShopping,
				Remaining:   domain.ReferralBonusShopping,
				Type:        domain.CreditTypeReferralBonusShopping,
				Source:      domain.CreditSourceReferralActivation,
				RefereeID:   refereeID,
				OrderID:     orderID,
				Description: fmt.Sprintf("₦%.0f referral bonus (shopping) - @%s completed first order", domain.ReferralBonusShopping, referee.UserName),
			}
			if err := txRepo.CreateCreditEntry(referrerShoppingEntry); err != nil {
				return fmt.Errorf("failed to create referrer shopping credit entry: %w", err)
			}

			// Withdrawable credit portion
			if err := txRepo.UpdateWithdrawableCredit(referrer.ID, domain.ReferralBonusWithdrawable); err != nil {
				return fmt.Errorf("failed to credit referrer withdrawable: %w", err)
			}

			referrerWithdrawableEntry := &domain.CreditEntry{
				UserID:      referrer.ID,
				Amount:      domain.ReferralBonusWithdrawable,
				Remaining:   domain.ReferralBonusWithdrawable,
				Type:        domain.CreditTypeReferralBonusWithdrawable,
				Source:      domain.CreditSourceReferralActivation,
				RefereeID:   refereeID,
				OrderID:     orderID,
				Description: fmt.Sprintf("₦%.0f referral bonus (withdrawable) - @%s completed first order", domain.ReferralBonusWithdrawable, referee.UserName),
			}
			if err := txRepo.CreateCreditEntry(referrerWithdrawableEntry); err != nil {
				return fmt.Errorf("failed to create referrer withdrawable credit entry: %w", err)
			}

			// Update total referral earned
			if err := txRepo.UpdateTotalReferralEarned(referrer.ID, domain.ReferralBonusAmount); err != nil {
				return fmt.Errorf("failed to update referrer total earned: %w", err)
			}
		}

		// (referral_activated was already set atomically at the top of this tx.)
		logger.Info(fmt.Sprintf("Referral activated: referee=%s, referrer=%s, order=%s",
			refereeID, referee.ReferredByUsername, orderID))

		return nil
	})
}

// UseCredit deducts credit during checkout (with 50% max cap)
func (s *ReferralService) UseCredit(userID string, amount, orderTotal float64, orderID string) error {
	// Validate 50% max usage
	maxAllowed := orderTotal * domain.MaxCreditUsagePercent
	if amount > maxAllowed {
		return fmt.Errorf("credit cannot exceed 50%% of your order (max ₦%.2f)", maxAllowed)
	}

	// Get current credits
	shopping, withdrawable, err := s.repo.GetUserCredits(userID)
	if err != nil {
		return fmt.Errorf("failed to get user credits: %w", err)
	}

	totalCredit := shopping + withdrawable
	if amount > totalCredit {
		return fmt.Errorf("insufficient credit balance: have ₦%.2f, need ₦%.2f", totalCredit, amount)
	}

	// Use transaction for atomic deduction
	return database.WithTransaction(s.db, "use_credit", func(tx *gorm.DB) error {
		txRepo := mysql_repo.NewReferralRepository(tx)

		// Deduct from shopping credit first, then withdrawable
		shoppingDeduct := amount
		if shoppingDeduct > shopping {
			shoppingDeduct = shopping
		}
		withdrawableDeduct := amount - shoppingDeduct

		if shoppingDeduct > 0 {
			if err := txRepo.UpdateShoppingCredit(userID, -shoppingDeduct); err != nil {
				return fmt.Errorf("failed to deduct shopping credit: %w", err)
			}
		}

		if withdrawableDeduct > 0 {
			if err := txRepo.UpdateWithdrawableCredit(userID, -withdrawableDeduct); err != nil {
				return fmt.Errorf("failed to deduct withdrawable credit: %w", err)
			}
		}

		// Create credit entry for audit
		entry := &domain.CreditEntry{
			UserID:      userID,
			Amount:      -amount,
			Type:        domain.CreditTypeUsage,
			Source:      domain.CreditSourceCheckout,
			OrderID:     orderID,
			Description: fmt.Sprintf("Used ₦%.2f credit on order", amount),
		}
		if err := txRepo.CreateCreditEntry(entry); err != nil {
			return fmt.Errorf("failed to create usage credit entry: %w", err)
		}

		return nil
	})
}

// Withdraw withdraws available credit to wallet
func (s *ReferralService) Withdraw(userID string, amount float64) error {
	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return fmt.Errorf("failed to find user: %w", err)
	}

	// Check if reached minimum threshold
	if user.TotalReferralEarned < domain.MinWithdrawalThreshold {
		remaining := domain.MinWithdrawalThreshold - user.TotalReferralEarned
		return fmt.Errorf("earn ₦%.0f more to unlock withdrawals (min ₦%.0f total)", remaining, domain.MinWithdrawalThreshold)
	}

	// Calculate max withdrawable (50% of total earned - already withdrawn)
	maxWithdrawable := (user.TotalReferralEarned * domain.WithdrawalPercent) - user.TotalWithdrawn
	if maxWithdrawable < 0 {
		maxWithdrawable = 0
	}

	if amount > maxWithdrawable {
		return fmt.Errorf("maximum withdrawal available is ₦%.2f", maxWithdrawable)
	}

	if amount > user.WithdrawableCredit {
		return fmt.Errorf("insufficient withdrawable credit: have ₦%.2f, requested ₦%.2f", user.WithdrawableCredit, amount)
	}

	if amount <= 0 {
		return errors.New("withdrawal amount must be greater than zero")
	}

	// B3: referral withdrawal is DISABLED. The wallet payout below was never
	// implemented (it was a `// TODO`), so performing the deduction would take the
	// user's referral credit and pay out nothing — losing their money. There is
	// also no valid payout destination for buyers (wallets are per-business). Return
	// before any deduction. The deduction/audit logic is preserved in git history;
	// re-enable once a payout destination is designed and wired into a transaction.
	return errors.New("referral withdrawal is temporarily unavailable")
}

// GetReferralInfo returns comprehensive referral information for a user
func (s *ReferralService) GetReferralInfo(userID string) (*domain.ReferralInfo, error) {
	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return nil, fmt.Errorf("failed to find user: %w", err)
	}

	// Count referrals
	totalReferrals, activatedReferrals, err := s.repo.CountReferrals(user.UserName)
	if err != nil {
		return nil, fmt.Errorf("failed to count referrals: %w", err)
	}

	// Calculate pending earnings (unconverted pending credits)
	pendingEarnings, err := s.repo.GetPendingCreditsTotal(userID)
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to get pending credits: %v", err))
		pendingEarnings = 0
	}

	// Calculate withdrawal info
	maxWithdrawable := (user.TotalReferralEarned * domain.WithdrawalPercent) - user.TotalWithdrawn
	if maxWithdrawable < 0 {
		maxWithdrawable = 0
	}

	// RW1: bank withdrawal is disabled for launch (B3 — no valid buyer payout
	// destination yet; withdrawable credit is still SPENDABLE at checkout). Report it
	// honestly as unavailable rather than "earn ₦X more to unlock" (which implies it
	// works at the threshold). Re-enable when the payout path ships (P1).
	canWithdraw := false
	withdrawalMessage := "Bank withdrawal is coming soon — your credit is spendable at checkout now."

	info := &domain.ReferralInfo{
		ReferralID:             "@" + user.UserName,
		ReferralLink:           fmt.Sprintf("https://vibaar.com/signup?ref=%s", user.UserName),
		ShoppingCredit:         user.ShoppingCredit,
		WithdrawableCredit:     user.WithdrawableCredit,
		TotalCredit:            user.ShoppingCredit + user.WithdrawableCredit,
		PendingEarnings:        pendingEarnings,
		TotalReferrals:         totalReferrals,
		ActivatedReferrals:     activatedReferrals,
		PendingReferrals:       totalReferrals - activatedReferrals,
		TotalEarned:            user.TotalReferralEarned,
		TotalWithdrawn:         user.TotalWithdrawn,
		AvailableToWithdraw:    maxWithdrawable,
		MinWithdrawalThreshold: domain.MinWithdrawalThreshold,
		CanWithdraw:            canWithdraw,
		WithdrawalMessage:      withdrawalMessage,
		MaxUsagePercent:        int(domain.MaxCreditUsagePercent * 100),
		ReferredBy: func() string {
			if user.ReferredByUsername != "" {
				return "@" + user.ReferredByUsername
			}
			return ""
		}(),
		ReferralActivated: user.ReferralActivated,
	}

	return info, nil
}

// GetTotalCredit returns the total available credit for a user
func (s *ReferralService) GetTotalCredit(userID string) (float64, error) {
	shopping, withdrawable, err := s.repo.GetUserCredits(userID)
	if err != nil {
		return 0, err
	}
	return shopping + withdrawable, nil
}

// GetCreditHistory returns paginated credit history for a user
func (s *ReferralService) GetCreditHistory(userID string, page, limit int) ([]domain.CreditEntry, int64, error) {
	return s.repo.GetCreditEntries(userID, page, limit)
}

// GetReferees returns the list of users referred by a referrer
func (s *ReferralService) GetReferees(referrerUsername string, page, limit int) ([]domain.User, int64, error) {
	return s.repo.GetReferees(referrerUsername, page, limit)
}

// ============ Admin Methods ============

// GetReferralStats returns overall referral program statistics (admin)
func (s *ReferralService) GetReferralStats() (*domain.ReferralStats, error) {
	return s.repo.GetReferralStats()
}

// GetUsersWithReferralData returns paginated users with their referral data (admin)
func (s *ReferralService) GetUsersWithReferralData(search string, page, limit int) ([]domain.ReferralUserInfo, int64, error) {
	return s.repo.GetUsersWithReferralData(search, page, limit)
}

// GetUserCreditDetails returns a user's full credit details (admin)
func (s *ReferralService) GetUserCreditDetails(userID string) (*domain.User, []domain.CreditEntry, error) {
	return s.repo.GetUserCreditDetails(userID)
}

// ManualCreditAdjustment performs a manual credit adjustment (admin)
func (s *ReferralService) ManualCreditAdjustment(userID string, amount float64, creditType, reason string) error {
	return s.repo.ManualCreditAdjustment(userID, amount, creditType, reason)
}
