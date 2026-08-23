package ports

import "vibaar/backend/internal/core/domain"

type OtpRepoIface interface {
	Create(data *domain.OTP) (domain.OTP, error)
	Find(id string) (domain.OTP, error)
	GetAll(param map[string]interface{}) ([]domain.OTP, error)
	Update(id string, data interface{}) (*domain.OTP, error)
	Delete(id string) (domain.OTP, error)
	GetOne(param map[string]interface{}) (*domain.OTP, error)
}
