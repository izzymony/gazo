package domain

type TwilioCache struct {
	Model
	MessageSID     string `gorm:"column:message_sid"`
	Status         string
	MessageContent string
	OTP            string
	From           string
	To             string
	Channel        string
}
