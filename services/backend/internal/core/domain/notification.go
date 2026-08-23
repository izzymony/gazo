package domain

type Notification struct {
	Model
	UserID    string
	Type      string // e.g., "order", "promo", "system"
	Title     string
	Message   string
	ActionURL string // Optional: e.g., track order, view product
	IsRead    bool
	Audience  string `json:"audience"`                    // NS2: "buyer" | "seller" — which mode's feed this belongs to
	Badge     bool   `json:"badge" gorm:"default:true"` // NS2: counts toward the unread badge (ambient events = false)
}
