package helper

import (
	"encoding/json"
	"math/big"
	"regexp"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

var matchFirstCap = regexp.MustCompile("(.)([A-Z][a-z]+)")
var matchAllCap = regexp.MustCompile("([a-z0-9])([A-Z])")

func ToSnakeCase(str string) string {
	snake := matchFirstCap.ReplaceAllString(str, "${1}_${2}")
	snake = matchAllCap.ReplaceAllString(snake, "${1}_${2}")
	return strings.ToLower(snake)
}

func ToInt64FromScientificAmount(v interface{}) int64 {

	fl, _, _ := big.ParseFloat(ToString(v), 10, 0, big.ToNearestEven)

	fll, _ := fl.Float64()

	return int64(fll * 100)
}

func ToAmountFromScientificCents(v interface{}) float64 {

	fl, _, _ := big.ParseFloat(ToString(v), 10, 0, big.ToNearestEven)

	fll, _ := fl.Float64()

	return fll / 100.0
}

func DecodeStringToJson(s string) map[string]interface{} {

	v := map[string]interface{}{}

	err := json.Unmarshal([]byte(s), &v)

	if err != nil {
		return nil
	}

	return v
}

func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(bytes), err
}
func CompareHash(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
