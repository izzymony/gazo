package ports

import (
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

type ShippingInterface interface {
	AddShippingProfile(input *domain.ShippingProfile, isGuest bool) (*domain.ShippingProfile, error)
	UpdateShippingProfile(id string, input domain.ShippingProfile, isGuest bool) (*domain.ShippingProfile, error)
	DeleteShippingProfile(id string, isGuest bool) error
	FindShippingProfile(id string, isGuest bool) (*domain.ShippingProfile, error)
	GetAllShippingProfiles(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.ShippingProfile, int64, error)
	FindByFields(filters map[string]interface{}, isGuest bool) ([]domain.ShippingProfile, error)
	FindExternalCategoryById(id string) (*domain.ExternalCategory, error)
	FindCategoryById(id string) (*domain.Category, error)
	CreateShippingRates(data []domain.ShippingOption, isGuest bool) ([]domain.ShippingOption, error)
	GetShippingRates(filters map[string]interface{}, isGuest bool) ([]domain.ShippingOption, error)
	GetOneShippingRate(filter map[string]interface{}, isGuest bool) (*domain.ShippingOption, error)
	CreateShipment(data *domain.Shipment, isGuest bool) (*domain.Shipment, error)
	GetAllShipments(filters map[string]interface{}, isGuest bool, page, limit int) ([]domain.Shipment, int64, error)
	GetOneShipment(filter map[string]interface{}, isGuest bool) (*domain.Shipment, error)
	GetMostFrequentShippingAddress(userID string) (*domain.ShippingProfile, error)
	UpdateShipmentProviderData(id string, providerData domain.MapArray) error
}
