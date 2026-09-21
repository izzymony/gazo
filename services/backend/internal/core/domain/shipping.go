package domain

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode"
)

type ShippingProfile struct {
	Model
	Street                string       `json:"street"`
	Town                  string       `json:"town"`
	State                 string       `json:"state"`
	Country               string       `json:"country"`
	Longitude             float64      `json:"longitude"`
	Latitude              float64      `json:"latitude"`
	UserID                string       `json:"user_id"`
	ShippingUser          ShippingUser `json:"shipping_user" gorm:"foreignKey:ShippingProfileID;"`
	IsDefault             bool         `json:"is_default"`
	ShipbubbleAddressCode int          `json:"shipbubble_address_code"`
}

type ShippingUser struct {
	Model
	FirstName         string `json:"firstname"`
	LastName          string `json:"lastname"`
	Phone             string `json:"phone"`
	Email             string `json:"email"`
	ShippingProfileID string `json:"shipping_profile_id"`
}

type ShippingOption struct {
	Model
	Provider          string   `json:"provider"`      // e.g shipbubble
	ProviderID        string   `json:"provider_id"`   // provider unique id e.g shipbubble request_token
	ProviderData      MapArray `json:"provider_data"` // option data from the provider
	DeliveryType      string   `json:"delivery_type"` // express, fast & standard
	Description       string   `json:"description"`
	DeliveryDaysRange string   `json:"delivery_days"`
	Price             string   `json:"price"`

	// G12 — what this quote is FOR.
	//
	// A shipping option is a PRICE QUOTE, and until these four fields existed it
	// was an unowned, unexpiring, unattached row that ValidateOrder accepted on
	// nothing more than its id. Any quote in the table priced any item: one
	// raised for a heavy product could ship a light one, one raised for Lagos
	// could ship to Sokoto, and one raised by another buyer entirely was equally
	// acceptable. There is no malice needed for this to go wrong — a stale
	// client cart is enough.
	//
	// AddressFingerprint is a hash rather than the address itself: it only ever
	// needs to answer "is this the same destination?", and a hash keeps a
	// buyer's street out of a row that exists to hold a price.
	UserID             string     `json:"user_id" gorm:"index"`
	ProductID          string     `json:"product_id" gorm:"index"`
	AddressFingerprint string     `json:"address_fingerprint"`
	ExpiresAt          *time.Time `json:"expires_at"`
}

// QuoteFingerprint reduces a destination address to a stable hash, so a quote
// can be checked against the address it was raised for.
//
// Normalised before hashing — lowercased, punctuation-insensitive, runs of
// whitespace collapsed — because the same address arrives spelled differently
// from a quote request and a saved shipping profile ("12 Awolowo Rd." vs
// "12 awolowo rd"). A fingerprint that changed with the spelling would reject
// legitimate checkouts, and the pressure would then be to remove the check.
func QuoteFingerprint(street, town, state, country string) string {
	parts := []string{street, town, state, country}
	for i, part := range parts {
		lower := strings.ToLower(part)
		var b strings.Builder
		lastWasSpace := false
		for _, r := range lower {
			switch {
			case unicode.IsLetter(r) || unicode.IsDigit(r):
				b.WriteRune(r)
				lastWasSpace = false
			case unicode.IsSpace(r) || r == ',' || r == '.' || r == '-' || r == '/':
				if !lastWasSpace && b.Len() > 0 {
					b.WriteByte(' ')
					lastWasSpace = true
				}
			}
		}
		parts[i] = strings.TrimSpace(b.String())
	}
	sum := sha256.Sum256([]byte(strings.Join(parts, "|")))
	return hex.EncodeToString(sum[:])
}

// IsQuoteFor reports whether this option may price the given item, for the
// given buyer, to the given destination, right now.
//
// One function so the four conditions cannot be applied in three places and
// drift. It returns a reason rather than a bool: "shipping option not found"
// told a buyer nothing about why their checkout failed, and told us nothing
// about which of the four it was.
func (p *ShippingOption) IsQuoteFor(userID, productID, addressFingerprint string, now time.Time) error {
	if p.UserID == "" || p.ProductID == "" || p.AddressFingerprint == "" || p.ExpiresAt == nil {
		// Quotes raised before the quote became bound to anything. Refused
		// rather than waved through: an exemption for unbound rows is a
		// permanent hole that nothing would ever remove, and these rows are
		// ephemeral per-checkout quotes, so the cost is one re-quote.
		return fmt.Errorf("this delivery quote predates quote binding — please reselect delivery")
	}
	if p.UserID != userID {
		return fmt.Errorf("this delivery quote belongs to a different account")
	}
	if p.ProductID != productID {
		return fmt.Errorf("this delivery quote was priced for a different product")
	}
	if p.AddressFingerprint != addressFingerprint {
		return fmt.Errorf("this delivery quote was priced for a different address")
	}
	if now.After(*p.ExpiresAt) {
		return fmt.Errorf("this delivery quote has expired — please reselect delivery")
	}
	return nil
}

func (p *ShippingOption) ParsePrice() (float64, error) {
	var numericPart strings.Builder
	for _, r := range p.Price {
		if unicode.IsDigit(r) || r == '.' {
			numericPart.WriteRune(r)
		}
	}
	price, err := strconv.ParseFloat(numericPart.String(), 64)
	if err != nil {
		return 0, fmt.Errorf("invalid price format: %v", err)
	}
	return price, nil
}

type Shipment struct {
	Model
	Provider     string   `json:"provider"`
	ProviderData MapArray `json:"provider_data"`
	ProviderID   string   `json:"provider_id"` // provider unique id e.g shipbubble order id
	OrderID      string   `json:"order_id"`
	Order        Order    `json:"order" gorm:"foreignKey:OrderID;references:ID"`
}
