package mysql_repo

import (
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/helper"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type TransactionRepository struct {
	db *gorm.DB
}

func NewTransactionRepository(db *gorm.DB) ports.TransactionRepoInterface {
	return &TransactionRepository{
		db: db,
	}
}

func (repo *TransactionRepository) GetAll(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.Transaction, int64, error) {
	tableName := "transactions"
	if isGuest {
		tableName += "_guest"
	}

	var data []domain.Transaction
	var total int64

	query := repo.db.Table(tableName).Preload(clause.Associations)
	for field, value := range params {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}
	if err := query.Model(&domain.Transaction{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	offset := (page - 1) * limit
	if err := query.Limit(limit).Offset(offset).Order("updated_at desc").Find(&data).Error; err != nil {
		return nil, 0, err
	}

	return data, total, nil
}

func (repo *TransactionRepository) GetOne(param map[string]interface{}, isGuest bool) (*domain.Transaction, error) {
	tableName := "transactions"
	if isGuest {
		tableName += "_guest"
	}

	var model domain.Transaction
	query := repo.db.Table(tableName).Preload(clause.Associations)

	for field, value := range param {
		if helper.NotEmpty(value) {
			query = query.Where(field+" = ?", value)
		}
	}

	if err := query.First(&model).Error; err != nil {
		return nil, err
	}

	return &model, nil
}

// ClaimPending atomically flips a transaction pending -> success in a single
// conditional UPDATE, reporting whether THIS call won. Order-on-success uses it
// so exactly one of the racing client-verify / Paystack-webhook creates the order.
func (repo *TransactionRepository) ClaimPending(id string, isGuest bool) (bool, error) {
	tableName := "transactions"
	if isGuest {
		tableName += "_guest"
	}
	q := repo.db.Table(tableName).
		Where("id = ? AND status = ?", id, string(helper.PaymentPending)).
		Update("status", string(helper.PaymentSuccessful))
	if q.Error != nil {
		return false, q.Error
	}
	return q.RowsAffected == 1, nil
}

// ClaimReservationRelease (RW1) atomically marks a transaction's rewards-credit
// reservation as released — only if it has a live hold that was neither converted
// nor already released. RowsAffected==1 means THIS caller won and must do the refund,
// so the synchronous init-failure path, MarkFailed, and the reconcile cron can't
// double-refund.
func (repo *TransactionRepository) ClaimReservationRelease(id string, isGuest bool) (bool, error) {
	tableName := "transactions"
	if isGuest {
		tableName += "_guest"
	}
	q := repo.db.Table(tableName).
		Where("id = ? AND credit_released_at IS NULL AND credit_converted_at IS NULL AND (credit_reserved_shopping > 0 OR credit_reserved_withdrawable > 0)", id).
		Update("credit_released_at", time.Now())
	if q.Error != nil {
		return false, q.Error
	}
	return q.RowsAffected == 1, nil
}

// MarkReservationConverted (RW1) stamps credit_converted_at, marking the reservation
// consumed so it can never be released. Called inside Verify's ClaimPending-gated
// order-creation tx, so it runs exactly once.
func (repo *TransactionRepository) MarkReservationConverted(id string, isGuest bool) error {
	tableName := "transactions"
	if isGuest {
		tableName += "_guest"
	}
	return repo.db.Table(tableName).Where("id = ?", id).Update("credit_converted_at", time.Now()).Error
}

// SetStatus updates only the status column (e.g. to revert a claim when the
// order create fails after ClaimPending, so a retry / the GC can re-attempt).
func (repo *TransactionRepository) SetStatus(id, status string, isGuest bool) error {
	tableName := "transactions"
	if isGuest {
		tableName += "_guest"
	}
	return repo.db.Table(tableName).Where("id = ?", id).Update("status", status).Error
}

// ExpireIfPending flips a still-pending transaction to expired in one
// conditional UPDATE, so the pending-GC backstop never clobbers a status that a
// concurrent verify just settled (success/failed).
func (repo *TransactionRepository) ExpireIfPending(id string, isGuest bool) error {
	tableName := "transactions"
	if isGuest {
		tableName += "_guest"
	}
	return repo.db.Table(tableName).
		Where("id = ? AND status = ?", id, string(helper.PaymentPending)).
		Update("status", string(helper.PaymentExpired)).Error
}

func (repo *TransactionRepository) ApplyFilters(query *gorm.DB, jsonParam map[string]interface{}) *gorm.DB {

	if helper.NotEmpty(jsonParam["status"]) {
		query = query.Where("status = ? ", jsonParam["status"])
	}

	if helper.NotEmpty(jsonParam["receipient"]) {
		query = query.Where("receipient = ? ", jsonParam["receipient"])
	}

	if jsonParam["sender"] != nil {
		query.Where("sender = ?", jsonParam["sender"])
	}

	if jsonParam["reference"] != nil {
		query.Where("reference = ?", jsonParam["reference"])
	}

	return query
}

func (repo *TransactionRepository) SearchField() []string {
	return []string{"name", "active"}
}

func (repo *TransactionRepository) Find(id string) (domain.Transaction, error) {
	model := repo.Model()
	q := repo.db.Preload(clause.Associations).Where("id = ?", id).First(&model)

	return model, q.Error
}

func (repo *TransactionRepository) Create(data *domain.Transaction, isGuest bool) (*domain.Transaction, error) {
	tableName := "transactions"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Begin()

	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	q := tx.Table(tableName).Create(data)
	if q.Error != nil {
		tx.Rollback()
		return nil, q.Error
	}
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return data, nil

}

func (repo *TransactionRepository) Update(id string, input domain.Transaction, isGuest bool) (*domain.Transaction, error) {
	tableName := "transactions"
	if isGuest {
		tableName += "_guest"
	}

	tx := repo.db.Table(tableName).Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	input.ID = id

	q := tx.Where("id = ?", id).Updates(input)
	if q.Error != nil {
		tx.Rollback()
		return nil, q.Error
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	var updated domain.Transaction
	if err := repo.db.Table(tableName).Where("id = ?", id).First(&updated).Error; err != nil {
		return nil, err
	}

	return &updated, nil
}

func (repo *TransactionRepository) Delete(id string) (domain.Transaction, error) {
	model := repo.Model()
	q := repo.db.Model(&model).Where("id = ?", id).Delete(model)
	return model, q.Error
}

func (repo *TransactionRepository) Model() domain.Transaction {
	return domain.Transaction{}
}

func (repo *TransactionRepository) ArrayModel() []domain.Transaction {
	return []domain.Transaction{}
}
