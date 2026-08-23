package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/golang-jwt/jwt"
	"golang.org/x/oauth2"
	"insta-api/internal/adapter/api/requests"
	mysql_repo "insta-api/internal/adapter/repositories/sql"
	"insta-api/internal/core/domain"
	"insta-api/internal/helper"
	"insta-api/internal/logger"
	"insta-api/internal/ports"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthService struct {
	db                      *gorm.DB
	userRepo                ports.UserRepoInterface
	userService             *UserService
	otpService              *OTPService
	verificationCodeRepo    ports.VerificationCodeInterface
	verificationCodeService *VerificationCodeService
	orderRepo               ports.OrderRepoInterface
}

func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{
		db:                      db,
		userRepo:                mysql_repo.NewUserRepository(db),
		userService:             NewUserService(db),
		otpService:              NewOTPService(db),
		verificationCodeRepo:    mysql_repo.NewVerificationCodeRepository(db),
		verificationCodeService: NewVerificationCodeService(db),
		orderRepo:               mysql_repo.NewOrderRepository(db),
	}
}

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
var phoneRegex = regexp.MustCompile(`^\+?([0-9]{1,4})?[0-9]{8,}$`)

func (s *AuthService) Register(input requests.SignUpRequest) (interface{}, error) {
	var otpIdentifier string

	switch input.AuthType {
	case "instagram":
		if input.InstagramID == "" {
			return nil, errors.New("must provide instagram id")
		}
		if input.InstagramUsername == "" {
			return nil, errors.New("must provide instagram username")
		}

		_, err := s.userService.FetchOne(map[string]interface{}{"instagram_id": input.InstagramID}, false)
		if err == nil {
			return nil, errors.New("user already exist")
		}

		_, err = s.userService.FetchOne(map[string]interface{}{"instagram_username": input.InstagramUsername}, false)
		if err == nil {
			return nil, errors.New("user already exist")
		}
	case "email":
		if input.Phone == "" && input.Email == "" {
			return nil, errors.New("must provide email or phone")
		}

		if input.Email != "" && !emailRegex.MatchString(input.Email) {
			return nil, errors.New("enter a valid email")
		}

		if input.Phone != "" && !phoneRegex.MatchString(input.Phone) {
			return nil, errors.New("enter a valid phone")
		}
		if input.Phone != "" {
			_, found, err := s.userService.FindUserByEmailORPhone(input.Phone)
			if err != nil {
				return nil, errors.New("something went wrong")
			}
			if found {
				return nil, errors.New("phone number already in use")
			}
		}

		if input.Email != "" {
			_, found, err := s.userService.FindUserByEmailORPhone(input.Email)
			if err != nil {
				return nil, errors.New("something went wrong")
			}
			if found {
				return nil, errors.New("email already in use")
			}
		}

		normalizePhoneNumber, err := helper.ValidateAndNormalizePhoneNumber(input.Phone)
		if err != nil {
			return nil, err
		}
		input.Phone = normalizePhoneNumber

		// TEMPORARY: Accept dummy OTP "123456" for initial launch
		// TODO: Remove this after OTP service is fully implemented
		if input.OTP == "123456" {
			// Accept dummy OTP for now
			fmt.Printf("[LAUNCH] Accepting dummy OTP for registration - phone: %s, email: %s\n", input.Phone, input.Email)
			// Set identifier based on what was used (prefer email)
			if input.Email != "" {
				otpIdentifier = "email"
			} else {
				otpIdentifier = "phone_number"
			}
		} else if os.Getenv("ENV") == "local" || os.Getenv("ENV") == "dev" || os.Getenv("ENV") == "staging" || os.Getenv("SKIP_SMS_VERIFICATION") == "true" {
			// Also accept any OTP in local/dev/staging environments
			fmt.Printf("[LOCAL] OTP validation skipped for registration - phone: %s, email: %s, otp: %s\n", input.Phone, input.Email, input.OTP)
			if input.Email != "" {
				otpIdentifier = "email"
			} else {
				otpIdentifier = "phone_number"
			}
		} else {
			// Production environment - do full OTP validation
			if input.OTP == "000000" {
				return nil, fmt.Errorf("invalid verification code")
			}
			
			var verificationCode *domain.VerificationCode
			verificationCode, err = s.verificationCodeRepo.GetOne(map[string]interface{}{"identifier": input.Phone, "type": string(helper.RegisterOTP)})
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, fmt.Errorf("something went wrong")
			}

			if verificationCode == nil || verificationCode.UUID != input.OTP {
				// find with email as identifier
				verificationCode, err = s.verificationCodeRepo.GetOne(map[string]interface{}{"identifier": input.Email, "type": string(helper.RegisterOTP)})
				if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
					return nil, fmt.Errorf("something went wrong")
				}
				if verificationCode == nil || verificationCode.UUID != input.OTP {
					return nil, fmt.Errorf("invalid verification code")
				} else {
					otpIdentifier = "email"
				}
			} else {
				otpIdentifier = "phone_number"
			}

			if *verificationCode.Used {
				return nil, fmt.Errorf("verification code is already used")
			}
			createdAt := verificationCode.CreatedAt
			currentTime := time.Now()

			duration := currentTime.Sub(createdAt)

			if duration.Minutes() >= 10 {
				// mark used
				verificationCode.Used = helper.ToPtr(true)
				err = s.verificationCodeRepo.MarkAsUsed(verificationCode.ID)
				if err != nil {
					return nil, fmt.Errorf("something went wrong")
				}
				return nil, fmt.Errorf("otp expired, please request a new one")
			}
		}

		existingUsername, err := s.userService.FetchOne(map[string]interface{}{"user_name": input.UserName}, false)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("something went wrong")
		}

		if existingUsername != nil {
			return nil, errors.New("user name exist already")
		}

		phone := s.checkDetail(input.Phone, input.Email)
		_, found, err := s.userService.FindUserByEmailORPhone(phone)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			fmt.Println("error; ", err)
			return nil, errors.New("something went wrong")
		}

		if found {
			return nil, errors.New("user with email/phone exist already")
		}
	default:
		return nil, errors.New("invalid auth type")
	}

	user := domain.User{
		Email:             strings.ToLower(input.Email),
		Lastname:          input.Lastname,
		Firstname:         input.Firstname,
		Phone:             input.Phone,
		UserName:          input.UserName,
		InstagramUsername: input.InstagramUsername,
		InstagramID:       input.InstagramID,
		AuthType:          input.AuthType,
	}

	if input.Password != "" {
		// Generate and hash password
		b, err := bcrypt.GenerateFromPassword([]byte(input.Password), 14)
		if err != nil {
			return nil, errors.New("an error occurred hashing password")
		}
		user.Password = string(b)
	}

	savedUser, err := s.userService.Save(user)
	if err != nil {
		return nil, errors.New("error occurred creating user")
	}

	// Credit ₦1,000 signup bonus to ALL new users (universal bonus)
	referralService := NewReferralService(s.db)
	if err := referralService.CreditSignupBonus(savedUser.ID); err != nil {
		logger.Error(fmt.Sprintf("Failed to credit signup bonus to user %s: %v", savedUser.ID, err))
		// Don't fail registration if bonus fails - log and continue
	} else {
		logger.Info(fmt.Sprintf("Credited ₦1,000 signup bonus to new user: %s", savedUser.ID))
	}

	// Set referrer if referral username was provided during signup
	if input.ReferralUsername != "" {
		logger.Info(fmt.Sprintf("Processing referral for new user %s with referrer: %s", savedUser.ID, input.ReferralUsername))
		if err := referralService.SetReferrer(savedUser.ID, input.ReferralUsername); err != nil {
			logger.Error(fmt.Sprintf("Failed to set referrer for user %s: %v", savedUser.ID, err))
			// Don't fail registration if referral fails - log and continue
		} else {
			logger.Info(fmt.Sprintf("Successfully set referrer %s for new user: %s", input.ReferralUsername, savedUser.ID))
		}
	}

	// Link guest order to newly created user account if provided
	logger.Info(fmt.Sprintf("DEBUG: Checking guest order linking - GuestOrderID: '%s'", input.GuestOrderID))
	if input.GuestOrderID != "" {
		logger.Info(fmt.Sprintf("Linking guest order %s to user %s", input.GuestOrderID, savedUser.ID))
		
		// Get the guest order
		guestOrder, err := s.orderRepo.GetOneOrder(map[string]interface{}{"id": input.GuestOrderID}, true)
		if err != nil {
			logger.Error(fmt.Sprintf("Failed to fetch guest order %s: %v", input.GuestOrderID, err))
		} else if guestOrder != nil {
			logger.Info(fmt.Sprintf("Found guest order, starting transfer..."))
			// Transfer the guest order to authenticated user's orders
			err = s.transferGuestOrderToUser(guestOrder, savedUser.ID)
			if err != nil {
				logger.Error(fmt.Sprintf("Failed to transfer guest order %s to user %s: %v", input.GuestOrderID, savedUser.ID, err))
			} else {
				logger.Info(fmt.Sprintf("Successfully completed guest order transfer"))
			}
		} else {
			logger.Error(fmt.Sprintf("Guest order %s not found", input.GuestOrderID))
		}
	} else {
		logger.Info("No guest order ID provided, skipping guest order linking")
	}

	// generate token AFTER saving user to get proper user ID
	accessToken, refreshToken, err := helper.GenerateTokens(helper.SignedDetails{
		Username: savedUser.UserName,
		Email:    savedUser.Email,
		UserId:   savedUser.ID,
	})
	if err != nil {
		return nil, errors.New("error generating token")
	}
	go func() {
		defer func() {
			if r := recover(); r != nil {
				logger.Error(fmt.Sprintf("recovered panic in MarkAsUsed goroutine: %v", r))
			}
		}()
		err = s.verificationCodeRepo.MarkAsUsed(input.Phone)
		if err != nil {
			logger.Error(fmt.Sprintf("failed to mark OTP used; %v", err))
		}
		if otpIdentifier == "phone_number" {
			err = s.verificationCodeRepo.MarkAsUsed(input.Phone)
			if err != nil {
				logger.Error(fmt.Sprintf("failed to mark OTP used; %v", err))
			}
			// if err = s.verificationCodeService.MarkOTPUsed(input.Phone, input.OTP); err != nil {
			// 	logger.Error(fmt.Sprintf("failed to mark OTP used; %v", err))
			// 	fmt.Sprintf("failed to mark OTP used; %v", err)
			// }
		} else if otpIdentifier == "email" {
			// err = s.verificationCodeRepo.MarkAsUsed(input.Email)
			// if err != nil {
			// 	logger.Error(fmt.Sprintf("failed to mark OTP used; %v", err))
			// 	fmt.Sprintf("failed to mark OTP used; %v", err)
			// }
		}
	}()
	return map[string]interface{}{
		"data":          input,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	}, err
}

// transferGuestOrderToUser transfers a guest order to an authenticated user's account
func (s *AuthService) transferGuestOrderToUser(guestOrder *domain.Order, userID string) error {
	// Transfer the order by creating a new order record in the regular table
	// We need to create a fresh order to avoid ID conflicts between guest and regular tables
	
	// Step 1: Create a new order based on the guest order data
	newOrder := *guestOrder // Copy the order data
	newOrder.ID = ""        // Clear ID so GORM generates a new one
	newOrder.UserID = userID // Set the authenticated user ID
	
	// Clear the Items slice and rebuild it to avoid ID conflicts
	originalItems := newOrder.Items
	newOrder.Items = nil
	
	// Rebuild the items with cleared IDs
	for _, item := range originalItems {
		newItem := item
		newItem.ID = ""        // Clear item ID so GORM generates a new one
		newItem.OrderID = ""   // Clear order ID - will be set by GORM
		newOrder.Items = append(newOrder.Items, newItem)
	}
	
	// Create the order with items in the regular table (this will generate new IDs)
	createdOrder, err := s.orderRepo.Create(&newOrder, false) // false = regular orders table
	if err != nil {
		return fmt.Errorf("failed to create order in regular table: %v", err)
	}
	
	// Step 3: Delete the guest order (cleanup)
	err = s.orderRepo.DeleteOrder(guestOrder.ID, true) // true = guest table
	if err != nil {
		logger.Error(fmt.Sprintf("Failed to delete guest order: %v", err))
		// Don't return error here as the main operation succeeded
	}
	
	logger.Info(fmt.Sprintf("Successfully transferred order %s from guest to user %s", createdOrder.ID, userID))
	return nil
}

func (s *AuthService) checkDetail(phone, email string) string {
	if phone == "" {
		return email
	}
	return phone
}

func (s *AuthService) UpdateRecommendations(id string, recommendations []string) (interface{}, error) {
	userRep, err := s.userService.Find(id)
	if err != nil {
		return nil, err
	}
	user := domain.User{}
	_ = helper.Copy(userRep, &user)
	mp := make(map[string]bool, 0)
	for _, val := range strings.Split(user.Recommendations, ",") {
		mp[val] = true
	}

	for _, v := range recommendations {
		if len(mp) > 0 {
			break
		}
		if _, ok := mp[v]; !ok {
			recommendations = append(recommendations, v)
		}
	}

	recommendationStr := strings.Join(recommendations, ",")
	userUpdate := domain.User{
		Recommendations: recommendationStr,
	}
	return s.userRepo.Update(id, userUpdate)
}

func (s *AuthService) ForgotPassword(input requests.ForgotPassword) (interface{}, error) {
	_, err := s.otpService.ValideOTP(input.Indentifier, input.Code)
	if err != nil {
		return nil, err
	}

	user, found, err := s.userService.FindUserByEmailORPhone(input.Indentifier)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, errors.New("user not found")
	}
	// Generate and hash password
	b, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), 14)
	if err != nil {
		return nil, errors.New("an error occurred hashing password")
	}
	user.Password = string(b)

	return s.userRepo.Update(user.ID, user)
}

func (s *AuthService) ChangePassword(input requests.ChangePassword) (interface{}, error) {

	user, err := s.userService.Find(input.UserID)
	if err != nil {
		return nil, err
	}

	if helper.NotEmpty(user.ID) {
		return nil, errors.New("user not found")
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.OldPassword))
	if err != nil {
		return nil, errors.New("incorrect password")
	}

	// Generate and hash password
	b, err := bcrypt.GenerateFromPassword([]byte(input.NewPassword), 14)
	if err != nil {
		return nil, errors.New("an error occurred hashing password")
	}
	user.Password = string(b)

	return s.userRepo.Update(user.ID, user)
}

func (s *AuthService) InitiateSocialAuth(provider, redirectUrl string) (string, error) {
	switch strings.ToLower(provider) {
	case "instagram":
		var (
			authURL  = "https://api.instagram.com/oauth/authorize"
			clientId = os.Getenv("INSTAGRAM_CLIENT_ID")
			scope    = "instagram_business_basic,instagram_business_manage_messages,instagram_business_manage_comments,instagram_business_content_publish"
		)
		return fmt.Sprintf("%s?enable_fb_login=0&force_authentication=1&client_id=%s&redirect_uri=%s&response_type=code&scope=%s",
			authURL,
			clientId,
			url.QueryEscape(redirectUrl),
			url.QueryEscape(scope),
		), nil

	case "google":
		conf := helper.GoogleOauthConfig()
		if redirectUrl != "" {
			conf.RedirectURL = redirectUrl
		}
		if conf == nil {
			return "", errors.New("failed to load Google OAuth configuration")
		}
		state := helper.GenerateRandomState()
		authUrl := conf.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.SetAuthURLParam("prompt", "consent"))
		return authUrl, nil

	case "tiktok":
		var (
			authURL  = "https://www.tiktok.com/v2/auth/authorize/"
			clientId = os.Getenv("TIKTOK_CLIENT_KEY")
			scope    = "user.info.basic,user.info.profile"
			// state    = helper.GenerateRandomState()
		)

		return fmt.Sprintf("%s?client_key=%s&redirect_uri=%s&response_type=code&scope=%s&state=%s",
			authURL,
			clientId,
			url.QueryEscape(redirectUrl),
			url.QueryEscape(scope),
			"",
		), nil

	default:
		return "", errors.New("invalid provider")
	}
}

func (s *AuthService) SocialAuthCallBack(code, provider, redirectUrl string) (interface{}, error) {
	var (
		userData *domain.OauthUser
		user     *domain.User
		err      error
	)
	switch strings.ToLower(provider) {
	case "instagram":
		var (
			tokenURL     = "https://api.instagram.com/oauth/access_token"
			clientId     = os.Getenv("INSTAGRAM_CLIENT_ID")
			clientSecret = os.Getenv("INSTAGRAM_CLIENT_SECRET")
			grantType    = "authorization_code"
		)
		data := url.Values{
			"client_id":     {clientId},
			"client_secret": {clientSecret},
			"redirect_uri":  {redirectUrl},
			"code":          {strings.ReplaceAll(code, "#_", "")},
			"grant_type":    {grantType},
		}

		resp, err := http.PostForm(tokenURL, data)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
		body, err := io.ReadAll(resp.Body)
		logger.Info(fmt.Sprintf("response body: %s", string(body)))
		if err != nil {
			return nil, fmt.Errorf("failed to read response body: %v", err)
		}

		if resp.StatusCode != http.StatusOK {
			logger.Info(fmt.Sprintf("received status code: %d", resp.StatusCode))
			return nil, errors.New(fmt.Sprintf("received status code: %d", resp.StatusCode))
		}

		var tokenResponse map[string]interface{}
		if err := json.Unmarshal(body, &tokenResponse); err != nil {
			return nil, fmt.Errorf("failed to decode response body: %v", err)
		}

		token, ok := tokenResponse["access_token"].(string)
		logger.Info(fmt.Sprintf("token; %v", token))
		if !ok {
			logger.Error("missing access token")
			return nil, errors.New("error occurred, missing access token")
		}

		userData, err = s.instagramUserInfo(token)
		if err != nil {
			logger.Error(fmt.Sprintf("error fetching user info: %v", err))
			return nil, errors.New(fmt.Sprintf("error fetching user info: %v", err))
		}
		fmt.Println("userData; ", userData)
		user, err = s.userService.FetchOne(map[string]interface{}{"instagram_id": userData.ID}, false)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New(fmt.Sprintf("error fetching user info: %v", err))
		}

		if user == nil {
			var firstname, lastname string

			parts := strings.Split(userData.Name, " ")
			if len(parts) >= 2 {
				firstname, lastname = parts[0], parts[1]
			}

			user = &domain.User{
				Lastname:          lastname,
				Firstname:         firstname,
				UserName:          userData.Username,
				InstagramUsername: userData.Username,
				InstagramID:       userData.ID,
				Email:             userData.Email,
				AuthType:          "instagram",
			}

			_, err = s.userRepo.Create(user)
			if err != nil {
				return nil, errors.New("error occurred creating user")
			}

			// Credit ₦1,000 signup bonus to new Instagram user
			referralService := NewReferralService(s.db)
			if err := referralService.CreditSignupBonus(user.ID); err != nil {
				logger.Error(fmt.Sprintf("Failed to credit signup bonus to Instagram user %s: %v", user.ID, err))
			}
		}
	case "google":
		userInfo, err := helper.GetGoogleUserInfo(code, redirectUrl)
		if err != nil {
			return nil, fmt.Errorf("failed to get Google user info: %w", err)
		}

		existingUser, err := s.userService.FetchOne(map[string]interface{}{"email": userInfo.Email}, false)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("failed to fetch existing user: %w", err)
		}

		if existingUser != nil {
			user = existingUser
		} else {
			username, err := helper.GenerateRandomUsername(userInfo.FirstName, userInfo.LastName)
			if err != nil {
				return nil, fmt.Errorf("failed to generate username: %w", err)
			}
			user = &domain.User{
				Email:     userInfo.Email,
				Firstname: userInfo.FirstName,
				Lastname:  userInfo.LastName,
				AuthType:  "google",
				UserName:  username,
			}
			savedUser, err := s.userService.Save(*user)
			if err != nil {
				return nil, fmt.Errorf("failed to create new user: %w", err)
			}
			user = &savedUser

			// Credit ₦1,000 signup bonus to new Google user
			referralService := NewReferralService(s.db)
			if err := referralService.CreditSignupBonus(user.ID); err != nil {
				logger.Error(fmt.Sprintf("Failed to credit signup bonus to Google user %s: %v", user.ID, err))
			}
		}
	case "tiktok":
		var (
			tokenURL     = "https://open.tiktokapis.com/v2/oauth/token/"
			clientKey    = os.Getenv("TIKTOK_CLIENT_KEY")
			clientSecret = os.Getenv("TIKTOK_CLIENT_SECRET")
		)

		data := url.Values{}
		data.Set("client_key", clientKey)
		data.Set("client_secret", clientSecret)
		data.Set("code", code)
		data.Set("grant_type", "authorization_code")
		data.Set("redirect_uri", redirectUrl)

		req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
		if err != nil {
			return nil, fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

		client := &http.Client{Timeout: 30 * time.Second}
		resp, err := client.Do(req)
		if err != nil {
			return nil, fmt.Errorf("failed to send request: %w", err)
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, fmt.Errorf("failed to read response: %w", err)
		}

		if resp.StatusCode != http.StatusOK {
			return nil, fmt.Errorf("tiktok token exchange failed with status %d: %s", resp.StatusCode, string(body))
		}

		var tokenResponse struct {
			AccessToken  string `json:"access_token"`
			OpenID       string `json:"open_id"`
			ExpiresIn    int    `json:"expires_in"`
			RefreshToken string `json:"refresh_token"`
		}
		if err := json.Unmarshal(body, &tokenResponse); err != nil {
			return nil, fmt.Errorf("failed to decode TikTok token response: %w", err)
		}
		if tokenResponse.AccessToken == "" {
			return nil, errors.New("error occurred fetching access token")
		}

		userData, err = s.tiktokUserInfo(tokenResponse.AccessToken)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch TikTok user info: %w", err)
		}

		user, err = s.userService.FetchOne(map[string]interface{}{"tiktok_id": userData.ID}, false)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("error checking existing user: %w", err)
		}

		if user == nil {

			user = &domain.User{
				Firstname:      userData.DisplayName,
				TiktokID:       userData.ID,
				UserName:       userData.Username,
				TiktokUsername: userData.Username,
				AuthType:       "tiktok",
			}

			_, err = s.userRepo.Create(user)
			if err != nil {
				return nil, fmt.Errorf("failed to create new TikTok user: %w", err)
			}

			// Credit ₦1,000 signup bonus to new TikTok user
			referralService := NewReferralService(s.db)
			if err := referralService.CreditSignupBonus(user.ID); err != nil {
				logger.Error(fmt.Sprintf("Failed to credit signup bonus to TikTok user %s: %v", user.ID, err))
			}
		}

	default:
		return nil, errors.New("invalid provider")
	}

	accessToken, refreshToken, err := helper.GenerateTokens(helper.SignedDetails{
		Username: user.UserName,
		Email:    user.Email,
		UserId:   user.ID,
	})
	if err != nil {
		return nil, errors.New("error generating token")
	}

	return map[string]interface{}{
		"oauth_data":    userData,
		"user_exist":    user != nil,
		"user_data":     user,
		"token":         accessToken,
		"refresh_token": refreshToken,
	}, nil
}

func (s *AuthService) instagramUserInfo(token string) (*domain.OauthUser, error) {
	profileURL := "https://graph.instagram.com/me"

	params := url.Values{}
	params.Add("fields", "id,username,name,email")
	params.Add("access_token", token)
	url := fmt.Sprintf("%s?%s", profileURL, params.Encode())

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %v", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, errors.New("failed to fetch Instagram user info")
	}
	var user domain.OauthUser
	if err := json.Unmarshal(body, &user); err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *AuthService) tiktokUserInfo(accessToken string) (*domain.OauthUser, error) {
	reqURL, err := url.Parse("https://open.tiktokapis.com/v2/user/info/")
	if err != nil {
		return nil, fmt.Errorf("failed to parse url: %w", err)
	}
	q := reqURL.Query()
	q.Set("fields", "open_id,username,avatar_url,display_name")
	reqURL.RawQuery = q.Encode()

	req, err := http.NewRequest("GET", reqURL.String(), nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: time.Second * 10}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get tiktok user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("tiktok API error: %s", string(bodyBytes))
	}

	var response struct {
		Data struct {
			User struct {
				ID          string `json:"open_id"`
				Username    string `json:"username"`
				Avatar      string `json:"avatar_url"`
				DisplayName string `json:"display_name"`
			} `json:"user"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &domain.OauthUser{
		ID:          response.Data.User.ID,
		Username:    response.Data.User.Username,
		Avatar:      response.Data.User.Avatar,
		DisplayName: response.Data.User.DisplayName,
	}, nil
}

func (s *AuthService) Login(input requests.LoginRequest) (interface{}, error) {
	user, found, err := s.userService.FindUserByEmailORPhone(input.Identifier)
	if err != nil {
		return nil, err
	}
	if !found {
		return nil, errors.New("email or phone number not registered")
	}
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password))
	if err != nil {
		return nil, errors.New("incorrect password")
	}

	// Link guest order if provided
	if input.GuestOrderID != "" {
		logger.Info(fmt.Sprintf("Linking guest order %s to user %s during signin", input.GuestOrderID, user.ID))
		guestOrder, err := s.orderRepo.GetOneOrder(map[string]interface{}{"id": input.GuestOrderID}, true)
		if err == nil && guestOrder != nil {
			err = s.transferGuestOrderToUser(guestOrder, user.ID)
			if err != nil {
				logger.Error(fmt.Sprintf("Failed to link guest order during signin: %v", err))
			} else {
				logger.Info(fmt.Sprintf("Successfully linked guest order during signin"))
			}
		} else {
			logger.Error(fmt.Sprintf("Failed to fetch guest order during signin: %v", err))
		}
	}

	accessToken, refreshToken, err := helper.GenerateTokens(helper.SignedDetails{
		Username: user.UserName,
		Email:    user.Email,
		UserId:   user.ID,
	})
	if err != nil {
		return nil, err
	}

	user.Password = ""
	return map[string]interface{}{
		"data":          user,
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	}, nil
}

func (s *AuthService) CheckEmailOrPhoneExists(identifier string) (interface{}, error) {
	user, found, err := s.userService.FindUserByEmailORPhone(identifier)
	if err != nil {
		return nil, err
	}

	if !found {
		return map[string]interface{}{
			"exists": false,
		}, nil
	}

	identifierType := "phone"
	if strings.Contains(identifier, "@") {
		identifierType = "email"
	}

	return map[string]interface{}{
		"exists":   true,
		"type":     identifierType,
		"username": user.UserName,
	}, nil
}

func (s *AuthService) RefreshTokens(refreshToken string) (map[string]interface{}, error) {
	token, err := jwt.Parse(refreshToken, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("REFRESH_SECRET")), nil
	})
	if err != nil || !token.Valid {
		return nil, errors.New("invalid refresh token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["jti"] == nil {
		return nil, errors.New("could not parse claims")
	}

	userId := claims["jti"].(string)
	user, err := s.userRepo.GetOne(map[string]interface{}{"id": userId}, false)
	if err != nil || user == nil {
		return nil, errors.New("user not found")
	}

	accessToken, refreshToken, err := helper.GenerateTokens(helper.SignedDetails{
		Email:    user.Email,
		Username: user.UserName,
		UserId:   user.ID,
		IsAdmin:  false,
	})
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"access_token":  accessToken,
		"refresh_token": refreshToken,
	}, nil
}
