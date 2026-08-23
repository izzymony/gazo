package ports

import "insta-api/internal/core/domain"

type UserRepoInterface interface {
	Create(data *domain.User) (domain.User, error)
	Find(id string) (domain.User, error)
	Update(id string, data interface{}) (*domain.User, error)
	Delete(id string) (domain.User, error)
	GetAll(params map[string]interface{}) ([]domain.User, error)
	GetOne(param map[string]interface{}, isGuest bool) (*domain.User, error)
	GetFollowing(userId, search string, page, limit int, isGuest bool) ([]domain.Business, int64, error)
	GetAllUsers(search string, page, limit int) ([]domain.User, int64, error)
	UpdateUser(id string, data map[string]interface{}, isGuest bool) error
	DeleteUser(id string, isGuest bool) error
}
