package mysql_repo

import (
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type WithdrawalRequestRepository struct {
	db *gorm.DB
}

func NewWithdrawalRequestRepository(db *gorm.DB) ports.WithdrawalRequestInterface {
	return &WithdrawalRequestRepository{
		db: db,
	}
}
func (r *WithdrawalRequestRepository) Create(req *domain.WithdrawalRequest) error {
	return r.db.Create(req).Error
}

func (r *WithdrawalRequestRepository) FindByID(id string) (*domain.WithdrawalRequest, error) {
	var req domain.WithdrawalRequest
	if err := r.db.
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "user_name", "email")
		}).
		Preload("User.Business", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "name", "user_id")
		}).
		First(&req, "id = ?", id).Error; err != nil {
		return nil, err
	}
	return &req, nil
}

func (r *WithdrawalRequestRepository) UpdateStatus(id, status, reason string) error {
	return r.db.Model(&domain.WithdrawalRequest{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status": status,
			"reason": reason,
		}).Error
}

func (r *WithdrawalRequestRepository) GetAll(limit, offset int, statuses []string) ([]domain.WithdrawalRequest, int64, error) {
	var requests []domain.WithdrawalRequest
	var total int64

	q := r.db.Model(&domain.WithdrawalRequest{})

	// The admin client has always sent `status`, and the controller never read
	// it — so every filter tab returned the same unfiltered page. A set rather
	// than a single value, because one tab legitimately means several states
	// ("needs attention" = failed, blocked, reversed, needs_review) and its
	// badge has to count exactly what clicking it returns.
	if len(statuses) > 0 {
		q = q.Where("status IN ?", statuses)
	}

	// Counted with the same filter applied, or `total` describes a different
	// set than the rows and the pager lies.
	if err := q.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := q.
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "user_name", "email", "firstname", "lastname", "phone")
		}).
		Preload("User.Business", func(db *gorm.DB) *gorm.DB {
			return db.Select("id", "name", "user_id", "phone")
		}).
		Preload("BankAccountDetail").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&requests).Error
	if err != nil {
		return nil, 0, err
	}

	return requests, total, nil
}

// CountsByStatus tallies every withdrawal state in one query.
//
// Unfiltered and unpaginated on purpose: these numbers drive the tab badges and
// the "Awaiting Approval" total, and both must stay correct while the admin is
// looking at page 3 of a filtered list.
func (r *WithdrawalRequestRepository) CountsByStatus() ([]domain.WithdrawalStatusTally, error) {
	var tallies []domain.WithdrawalStatusTally
	err := r.db.Model(&domain.WithdrawalRequest{}).
		Select("status, COUNT(*) AS count, COALESCE(SUM(amount), 0) AS amount").
		Group("status").
		Scan(&tallies).Error
	if err != nil {
		return nil, err
	}
	return tallies, nil
}
