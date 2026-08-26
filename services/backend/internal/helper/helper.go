package helper

import (
	"context"
	cryptoRand "crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"net/mail"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	emailverifier "github.com/AfterShip/email-verifier"
	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/golang-jwt/jwt"
	"golang.org/x/exp/rand"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type claim map[string]interface{}

func ToJson(data interface{}) (map[string]interface{}, error) {
	b, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	mp := map[string]interface{}{}

	err = json.Unmarshal(b, &mp)
	if err != nil {
		return nil, err
	}
	return mp, nil
}

func ToArrayJson(data interface{}) ([]map[string]interface{}, error) {
	b, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	mp := []map[string]interface{}{}

	err = json.Unmarshal(b, &mp)
	if err != nil {
		return nil, err
	}
	return mp, nil
}

func Copy(input, output interface{}) error {
	b, err := json.Marshal(input)
	if err != nil {
		return err
	}
	// fmt.Println(string(b))
	return json.Unmarshal(b, output)
}

func NotEmpty(v interface{}) bool {
	return v != nil && ToString(v) != ""
}

func ToString(v interface{}) string {
	return fmt.Sprintf("%v", v)
}
func ToJsonString(v interface{}) string {
	b, err := json.Marshal(v)
	s := string(b)
	if err != nil {
		s = ""
	}
	return s
}

type SignedDetails struct {
	Email    string
	Username string
	UserId   string
	IsAdmin  bool
	jwt.StandardClaims
}

// GenerateJWT generates a JWT from a given struct and a secret key.
func GenerateJWT(data SignedDetails) (string, error) {
	claims := SignedDetails{
		Email:    data.Email,
		Username: data.Username,
		UserId:   data.UserId,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Local().Add(time.Hour * time.Duration(24)).Unix(),
		},
		IsAdmin: data.IsAdmin,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secretKey := os.Getenv("JWT_SECRET")
	signedToken, err := token.SignedString([]byte(secretKey))
	if err != nil {
		return "", err
	}
	return signedToken, nil
}

func GenerateTokens(data SignedDetails) (string, string, error) {
	accessClaims := SignedDetails{
		Email:    data.Email,
		Username: data.Username,
		UserId:   data.UserId,
		IsAdmin:  data.IsAdmin,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: time.Now().Add(24 * time.Hour).Unix(),
		},
	}
	at := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
	accessToken, err := at.SignedString([]byte(os.Getenv("JWT_SECRET")))
	if err != nil {
		return "", "", err
	}

	refreshClaims := jwt.StandardClaims{
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour).Unix(),
		Id:        data.UserId,
	}
	rt := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
	refreshToken, err := rt.SignedString([]byte(os.Getenv("REFRESH_SECRET")))
	return accessToken, refreshToken, nil
}

func GenerateOTP(length int) string {
	if length <= 0 {
		return ""
	}

	rand.Seed(uint64(time.Now().UnixNano()))
	randomNumber := strconv.Itoa(rand.Intn(9) + 1)

	for i := 1; i < length; i++ {
		randomNumber += strconv.Itoa(rand.Intn(10))
	}

	return randomNumber
}

// ValidateJWT validates a JWT signature using a secret key.
func ValidateJWT(signedToken string) (claims *SignedDetails, msg string) {
	secretKey := os.Getenv("JWT_SECRET")
	if secretKey == "" {
		return nil, "server auth misconfigured"
	}
	token, err := jwt.ParseWithClaims(
		signedToken, &SignedDetails{},
		func(t *jwt.Token) (interface{}, error) {
			// Pin the signing method to HMAC — reject alg=none and any asymmetric
			// algorithm so a forged token can't bypass verification (B6).
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
			}
			return []byte(secretKey), nil
		},
	)
	if err != nil {
		return nil, err.Error()
	}
	claims, ok := token.Claims.(*SignedDetails)
	if !ok || !token.Valid {
		// (previously called err.Error() here with a nil err — a latent panic)
		return nil, "invalid token claims"
	}
	if claims.ExpiresAt < time.Now().Local().Unix() {
		return nil, "token expired"
	}
	return claims, ""
}

// decodeBase64Image decodes a base64 image string and returns an io.Reader
func DecodeBase64Image(base64Image string) (io.Reader, error) {
	// Remove the base64 header if present (e.g., "data:image/png;base64,")
	parts := strings.Split(base64Image, ",")
	imageData := parts[len(parts)-1]

	// Decode the base64 image
	decodedData, err := base64.StdEncoding.DecodeString(imageData)
	if err != nil {
		return nil, err
	}

	// Return an io.Reader from the decoded data
	return strings.NewReader(string(decodedData)), nil
}

func FormatPhoneNumber(phone, prefix string) string {
	phone = strings.Replace(phone, "+", "", -1)
	if strings.HasPrefix(phone, "0") {
		return fmt.Sprintf("%v%v", prefix, phone[1:])
	} else if strings.HasPrefix(phone, "+234") {
		return fmt.Sprintf("%v%v", prefix, phone[4:])
	} else if strings.HasPrefix(phone, "234") {
		return fmt.Sprintf("%v%v", prefix, phone[3:])
	}
	return phone
}

func GenerateInvoiceReference() string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const length = 10

	rand.Seed(uint64(time.Now().UnixNano()))

	result := make([]byte, length)
	for i := range result {
		result[i] = charset[rand.Intn(len(charset))]
	}

	return string(result)
}

func CreateFolder(path string, perm os.FileMode) error {
	err := os.Mkdir(path, perm)
	if err != nil {
		if os.IsExist(err) {
			fmt.Printf("Folder %s already exists.\n", path)
			return nil
		}
		// Return any other error
		return fmt.Errorf("error creating folder: %w", err)
	}

	fmt.Printf("Folder %s created successfully.\n", path)
	return nil
}

func GetUserIdentifier(c *gin.Context) (string, bool, error) {
	userId, userExists := c.Get("user_id")
	guestId, guestExists := c.Get("guest_id")

	isGuest := !userExists && guestExists

	if !userExists && !guestExists {
		return "", false, fmt.Errorf("invalid user")
	}

	if isGuest {
		return guestId.(string), true, nil
	}
	return userId.(string), false, nil
}

func ToPtr[T any](val T) *T {
	return &val
}

func ToStringPtr(val string) *string {
	return &val
}

func ToFloat64Ptr(val float64) *float64 {
	return &val
}

func RandomString(n int) string {
	var letters = []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")

	s := make([]rune, n)
	for i := range s {
		s[i] = letters[rand.Intn(len(letters))]
	}
	return string(s)
}

const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func GenerateReference() string {
	return fmt.Sprintf("INS-%s", RandomString(15))
}

func GenerateRandomNumber(min, max int) (string, error) {
	if min > max {
		return "0", fmt.Errorf("invalid range: min > max")
	}
	rangeWidth := max - min + 1
	nBig, err := cryptoRand.Int(cryptoRand.Reader, big.NewInt(int64(rangeWidth)))
	if err != nil {
		return "0", fmt.Errorf("failed to generate random number: %w", err)
	}
	randomInt := int(nBig.Int64()) + min
	return fmt.Sprintf("%d", randomInt), nil
}

func GenerateRandomUsername(firstName, lastName string) (string, error) {
	name := strings.ToLower(strings.TrimSpace(firstName))
	if name == "" {
		name = strings.ToLower(strings.TrimSpace(lastName))
	}
	if name == "" {
		name = "user"
	}

	number, err := GenerateRandomNumber(1000, 9999)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s_%s", name, number), nil
}

func ValidateAndNormalizePhoneNumber(phone string) (string, error) {
	re := regexp.MustCompile(`\D`)
	digitsOnly := re.ReplaceAllString(phone, "")

	var normalized string
	switch {
	case len(digitsOnly) == 11 && strings.HasPrefix(digitsOnly, "0"):
		normalized = "234" + digitsOnly[1:]

	case len(digitsOnly) == 13 && strings.HasPrefix(digitsOnly, "234"):
		normalized = digitsOnly

	case len(digitsOnly) == 14 && strings.HasPrefix(digitsOnly, "2340"):
		normalized = "234" + digitsOnly[4:]

	case len(digitsOnly) == 10 && regexp.MustCompile(`^([7-9]0|81|90|91|70)`).MatchString(digitsOnly):
		normalized = "234" + digitsOnly

	default:
		return "", errors.New("invalid phone number format")
	}

	if !strings.HasPrefix(normalized, "+") {
		normalized = "+" + normalized
	}

	return normalized, nil
}

func NormalizePhoneNumber(phone string) string {
	re := regexp.MustCompile(`\D`)
	digitsOnly := re.ReplaceAllString(phone, "")

	var normalized string
	switch {
	case len(digitsOnly) == 11 && strings.HasPrefix(digitsOnly, "0"):
		normalized = "234" + digitsOnly[1:]

	case len(digitsOnly) == 13 && strings.HasPrefix(digitsOnly, "234"):
		normalized = digitsOnly

	case len(digitsOnly) == 14 && strings.HasPrefix(digitsOnly, "2340"):
		normalized = "234" + digitsOnly[4:]

	case len(digitsOnly) == 10 && regexp.MustCompile(`^([7-9]0|81|90|91|70)`).MatchString(digitsOnly):
		normalized = "234" + digitsOnly

	default:
		normalized = digitsOnly
	}

	if normalized != "" && !strings.HasPrefix(normalized, "+") {
		normalized = "+" + normalized
	}

	return normalized
}

func GenerateSlug(input string) string {
	slug := strings.ToLower(input)
	reg := regexp.MustCompile(`[^\w]+`)
	slug = reg.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	return slug
}

const publicIDAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"

// GeneratePublicID returns a short, random, lowercase-alphanumeric (hyphen-free)
// public identifier for buyer product URLs (STOREFRONT-URL-REWORK Rev 2):
// /@{handle}/p/{slug}-{publicId}. 10 chars over a 36-symbol alphabet ≈ 3.6e15
// space; callers retry on the rare unique-index collision. Non-sequential so the
// catalog can't be enumerated. Hyphen-free so the URL's single-hyphen delimiter
// stays unambiguous.
func GeneratePublicID() string {
	const n = 10
	out := make([]byte, n)
	max := big.NewInt(int64(len(publicIDAlphabet)))
	for i := range out {
		idx, err := cryptoRand.Int(cryptoRand.Reader, max)
		if err != nil {
			out[i] = publicIDAlphabet[0]
			continue
		}
		out[i] = publicIDAlphabet[idx.Int64()]
	}
	return string(out)
}

func FormatValidationError(err error) []string {
	var validationErrors []string

	var errs validator.ValidationErrors
	if errors.As(err, &errs) {
		for _, e := range errs {
			field := e.Field()
			var msg string

			switch e.Tag() {
			case "required":
				msg = field + " is required"
			case "gt":
				msg = field + " must be greater than " + e.Param()
			case "oneof":
				msg = field + " must be one of: " + e.Param()
			default:
				msg = field + " is invalid"
			}

			validationErrors = append(validationErrors, msg)
		}
	}

	return validationErrors
}

func GoogleOauthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.email",
			"https://www.googleapis.com/auth/userinfo.profile",
		},
		Endpoint: google.Endpoint,
	}
}

func GenerateRandomState() string {
	b := make([]byte, 16)
	rand.Read(b)
	return fmt.Sprintf("%x", b)
}

func GetGoogleUserInfo(code, redirectUrl string) (*GoogleUserInfo, error) {
	conf := GoogleOauthConfig()
	if conf == nil {
		return nil, errors.New("failed to load Google OAuth config")
	}
	if redirectUrl != "" {
		conf.RedirectURL = redirectUrl
	}

	token, err := conf.Exchange(context.Background(), code)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for token: %w", err)
	}

	client := conf.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected response from Google: %s", resp.Status)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	var userInfo GoogleUserInfo
	if err := json.Unmarshal(body, &userInfo); err != nil {
		return nil, fmt.Errorf("failed to parse user info: %w", err)
	}

	return &userInfo, nil
}

type GoogleUserInfo struct {
	Email     string `json:"email"`
	FirstName string `json:"given_name"`
	LastName  string `json:"family_name"`
}

func VerifyEmail(email string) (bool, error) {
	var verifier = emailverifier.NewVerifier()

	result, err := verifier.Verify(email)
	if err != nil {
		return false, err
	}
	return result.Disposable, nil
}

func IsPhoneOrEmail(input string) (isPhone bool, normalized string, err error) {
	if strings.Contains(input, "@") {
		if _, err := mail.ParseAddress(input); err == nil {
			return false, input, nil
		}
		return false, "", errors.New("invalid email format")
	}

	normalizedPhone, err := ValidateAndNormalizePhoneNumber(input)
	if err == nil {
		return true, normalizedPhone, nil
	}

	return false, "", errors.New("input is neither valid phone nor email")
}

// ParsePagination extracts page and limit from query params with safe bounds.
// Max limit is 100 to prevent excessive database queries.
func ParsePagination(c *gin.Context) (int, int) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 10
	}
	if limit > 100 {
		limit = 100
	}
	return page, limit
}
