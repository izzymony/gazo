package ports

import (
	"vibaar/backend/internal/core/domain"
)

type TwilioCacheInterface interface {
	Create(data *domain.TwilioCache) (domain.TwilioCache, error)
	Find(id string) (domain.TwilioCache, error)
	GetOne(param map[string]interface{}) (*domain.TwilioCache, error)
	Update(id string, data domain.TwilioCache) (*domain.TwilioCache, error)
}
