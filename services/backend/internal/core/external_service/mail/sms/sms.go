package sms

import "insta-api/internal/ports"

type SMS interface {
	Send(msg, recipients string) (*SMSResponse, error)
}

type SMSService struct {
	Sleengshort SMS
	Repository  ports.Repository
}

type SMSResponse struct {
	Status      string      `json:"status"`
	Description string      `json:"description"`
	MsgIDs      string      `json:"msg_ids"`
	Data        interface{} `json:"data"`
}

func NewSmsSeervice() SMS {
	return NewSleengShort()
}
