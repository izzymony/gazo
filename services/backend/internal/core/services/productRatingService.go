package services

import (
	"context"
	"errors"
	"fmt"

	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"

	"gorm.io/gorm"
)

type ProductRatingService struct {
	repo        ports.ProductRatingRatingRepoIface
	productRepo ports.ProductRepoIface
	dispatcher  *NotificationDispatcher
}

func NewProductRatingService(db *gorm.DB) *ProductRatingService {
	return &ProductRatingService{
		repo:        mysql_repo.NewProductRatingRepository(db),
		productRepo: mysql_repo.NewProductRepository(db),
		dispatcher:  NewNotificationDispatcher(db),
	}
}

func (s *ProductRatingService) Save(input domain.ProductRating) (interface{}, error) {
	if input.Rate >= 5 {
		product, err := s.productRepo.GetOne(map[string]interface{}{"id": input.ProductID})
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("something went wrong")
		}
		// NS2 seller.growth.new_review (in-app). Fires on the 5-star path.
		_ = s.dispatcher.EmitToBusiness(context.Background(), product.BusinessID, EmitInput{
			Event: "seller.growth.new_review",
			Vars:  map[string]string{"item": product.Title, "rating": "5"},
		})
	}
	return s.repo.Create(&input)
}

func (s *ProductRatingService) Update(id string, input domain.ProductRating) (interface{}, error) {

	return s.repo.Update(id, input)
}

func (s *ProductRatingService) GetAll(param map[string]interface{}) (interface{}, error) {
	return s.repo.GetAll(param)
}

func (s *ProductRatingService) Find(id string) (interface{}, error) {
	return s.repo.Find(id)
}
