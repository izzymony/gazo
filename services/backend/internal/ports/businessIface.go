package ports

import (
	"time"

	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
)

type BusinessIface interface {
	Create(data *domain.Business) (domain.Business, error)
	Find(id string) (domain.Business, error)
	FindByTag(tag string) (domain.Business, error)
	CountByTag(tag string, excludeID string) (int64, error)
	GetAll(param map[string]interface{}) ([]domain.Business, error)
	GetAllPaginated(search string, page, limit int) ([]domain.Business, int64, error)
	Update(id string, data interface{}) (*domain.Business, error)
	Delete(id string) (domain.Business, error)
	GetOne(param map[string]interface{}) (*domain.Business, error)
	GetOneWithExistence(param map[string]interface{}) (*domain.Business, bool, error)
	GetCustomers(businessId string, search string, page, limit int) ([]domain.Customer, int64, error)
	GetProductRanking(businessId string, page, limit int) ([]domain.ProductRanking, int64, error)
	Metric(id string) (interface{}, error)
	GetBackgroundSettings(businessID string) (domain.PersonalisedSettings, error)
	UpdateBackgroundColor(businessID string, color string, pattern string) error
	UpdateShippingSettings(businessID string, partnerEnabled bool, selfZones domain.SelfZones) error
	UpdateBackgroundImage(businessID string, fileURL string) error
	DeleteBackgroundImage(businessID string) error
	AddRecentlyViewedBusinesses(input []*domain.RecentlyViewedBusiness, isGuest bool) error
	GetAllRecentlyViewedBusinesses(params map[string]interface{}, isGuest bool, page, limit int) ([]domain.RecentlyViewedBusiness, int64, error)
	GetCustomerAnalytics(businessId string, date time.Time) (*domain.AnalyticsResponse, error)
	GetSalesAnalytics(businessId string, date time.Time) (*domain.AnalyticsResponse, error)
	GetStoreAnalytics(businessId string) (*domain.StoreAnalyticsResponse, error)
	GetDashboardAnalytics(businessId string) (*domain.AnalyticsResponse, error)
	Follow(businessId, userId string, isGuest bool) error
	UnFollow(businessId, userId string, isGuest bool) error
	GetFollowers(params map[string]interface{}, search string, page, limit int) ([]domain.Follower, int64, error)
	UpdateAccountDetails(id string, data domain.BusinessBankAccountDetail) error
	UnsetOtherDefaultAccounts(businessID string) error
	FindAccountDetailsByIDAndBusiness(id string, businessID string) (*domain.BusinessBankAccountDetail, error)
	CreateBankAccount(data *domain.BusinessBankAccountDetail) error
	AppendAccountDetailsMetadata(Id string, newMetadata map[string]interface{}) error
	GetBankAccounts(businessId string, limit int, offset int) ([]domain.BusinessBankAccountDetail, int64, error)
	FindBankAccount(filters map[string]interface{}) (*domain.BusinessBankAccountDetail, error)
	DeleteBankAccount(id string, businessID string) error
	GetAllBusinesses(search string, page, limit int) ([]domain.Business, int64, error)
}
