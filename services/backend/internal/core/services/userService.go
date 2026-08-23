package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"vibaar/backend/internal/adapter/api/requests"
	mysql_repo "vibaar/backend/internal/adapter/repositories/sql"
	"vibaar/backend/internal/core/domain"
	fileupload "vibaar/backend/internal/core/external_service/file-upload"
	"vibaar/backend/internal/helper"
	"vibaar/backend/internal/logger"
	"vibaar/backend/internal/ports"

	"gorm.io/gorm"
)

type UserService struct {
	repo            ports.UserRepoInterface
	businessRepo    ports.BusinessIface
	referralService *ReferralService
	dispatcher      *NotificationDispatcher
}

func NewUserService(db *gorm.DB) *UserService {
	return &UserService{
		repo:            mysql_repo.NewUserRepository(db),
		businessRepo:    mysql_repo.NewBusinessRepository(db),
		referralService: NewReferralService(db),
		dispatcher:      NewNotificationDispatcher(db),
	}
}

func (s *UserService) Save(input domain.User) (domain.User, error) {
	return s.repo.Create(&input)
}

func (s *UserService) Update(request requests.UpdateUserRequest, userId string, isGuest bool) (*domain.User, error) {
	user, err := s.repo.GetOne(map[string]interface{}{"id": userId}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if user == nil {
		return nil, fmt.Errorf("invalid user/guest")
	}

	if request.Username != "" {
		existingUser, err := s.FetchOne(map[string]interface{}{"user_name": request.Username}, false)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("something went wrong")
		}

		if existingUser != nil && existingUser.ID != user.ID {
			return nil, fmt.Errorf("username already exists")
		}
	}

	user.Firstname = request.Firstname
	user.Lastname = request.Lastname
	if request.Username != "" {
		user.UserName = request.Username
	}
	user.Phone = request.PhoneNumber
	dob, err := time.Parse("2006-01-02", request.DateOfBirth)
	if err != nil {
		return nil, fmt.Errorf("invalid date of birth format")
	}
	user.DateOfBirth = dob

	if request.ProfileImage != "" {

		decodedImage, err := helper.DecodeBase64Image(request.ProfileImage)
		if err != nil {
			logger.Error(fmt.Sprintf("error while decoding image %v", err))
			return nil, fmt.Errorf("something went wrong")
		}
		url, err := fileupload.UploadFileCloudinary(decodedImage)
		if err != nil {
			return nil, fmt.Errorf("something went wrong")
		}
		user.ProfileImage = url
	}

	// Handle referral code during profile completion
	// Only process if: referral username provided, user not a guest, and user hasn't been referred yet
	if request.ReferralUsername != "" && !isGuest && user.ReferredByUsername == "" {
		if err := s.referralService.SetReferrer(user.ID, request.ReferralUsername); err != nil {
			// Log but don't fail - referral is optional
			fmt.Printf("Referral setup failed for user %s: %v\n", user.ID, err)
		}
	}

	responseUser, err := s.repo.Update(user.ID, user)
	responseUser.Password = ""
	return responseUser, err
}

func (s *UserService) GetUserProfile(userId string, isGuest bool) (*domain.User, error) {
	user, err := s.repo.GetOne(map[string]interface{}{"id": userId}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if user == nil {
		return nil, fmt.Errorf("invalid user/guest")
	}
	user.Password = ""
	user.TiktokID = ""
	user.InstagramID = ""

	return user, err
}

// GetMe returns the authenticated user's profile together with their business
// (store), if they have one, in a single call. Buyers with no store get a nil
// business rather than an error, so both sellers and buyers can bootstrap from
// one request (this is what lets the web app drop its retry/polling loops).
func (s *UserService) GetMe(userId string) (*domain.User, *domain.Business, error) {
	// Reuse GetUserProfile so sensitive fields (password, tiktok/instagram id)
	// stay stripped. isGuest is false: /me is JWT-only (AuthMiddleware).
	user, err := s.GetUserProfile(userId, false)
	if err != nil {
		return nil, nil, err
	}

	business, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": userId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return user, nil, nil
		}
		return nil, nil, fmt.Errorf("something went wrong")
	}
	// businessRepo.GetOne uses GORM .Find (no ErrRecordNotFound on empty), so a
	// missing store returns a zero-value business — normalise that to nil.
	if business == nil || business.ID == "" {
		return user, nil, nil
	}
	return user, business, nil
}

func (s *UserService) GetAll(param map[string]interface{}) ([]domain.User, error) {
	return s.repo.GetAll(param)
}

func (s *UserService) Find(id string) (domain.User, error) {
	return s.repo.Find(id)
}

func (s *UserService) FindUserByEmailORPhone(param string) (domain.User, bool, error) {
	data, err := s.FetchOne(map[string]interface{}{"phone": param}, false)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return domain.User{}, false, fmt.Errorf("error querying by phone: %w", err)
	}
	if data != nil && data.ID != "" {
		return *data, true, nil
	}

	data, err = s.FetchOne(map[string]interface{}{"email": strings.ToLower(param)}, false)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return domain.User{}, false, fmt.Errorf("error querying by email: %w", err)
	}
	if data != nil && data.ID != "" {
		return *data, true, nil
	}

	return domain.User{}, false, nil
}

func (s *UserService) FetchOne(param map[string]interface{}, isGuest bool) (*domain.User, error) {
	return s.repo.GetOne(param, isGuest)
}

func (s *UserService) FollowBusiness(userId, businessID string, isGuest bool) error {
	user, err := s.repo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return fmt.Errorf("invalid user/guest")
	}

	business, err := s.businessRepo.GetOne(map[string]interface{}{"id": businessID})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid user")
		}
		return fmt.Errorf("something went wrong")
	}
	if business == nil {
		return fmt.Errorf("invalid business")
	}

	if err := s.businessRepo.Follow(business.ID, userId, isGuest); err != nil {
		return err
	}

	// NS2 seller.growth.new_followers — in-app, best-effort, notify the store owner.
	_ = s.dispatcher.Emit(context.Background(), EmitInput{
		Event:  "seller.growth.new_followers",
		UserID: business.UserID,
	})
	return nil
}

func (s *UserService) UnFollowBusiness(userId, businessId string, isGuest bool) error {
	user, err := s.repo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return fmt.Errorf("invalid user/guest")
	}

	business, err := s.businessRepo.GetOne(map[string]interface{}{"id": businessId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid user")
		}
		return fmt.Errorf("something went wrong")
	}
	if business == nil {
		return fmt.Errorf("invalid business")
	}
	return s.businessRepo.UnFollow(business.ID, userId, isGuest)
}

func (s *UserService) GetFollowing(userId, search string, page, limit int, isGuest bool) ([]domain.Business, int64, error) {
	user, err := s.repo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, 0, fmt.Errorf("something went wrong")
	}

	if user == nil && !isGuest {
		return nil, 0, fmt.Errorf("invalid user/guest")
	}

	return s.repo.GetFollowing(user.ID, search, page, limit, isGuest)
}
