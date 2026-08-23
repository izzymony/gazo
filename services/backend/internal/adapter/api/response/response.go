package response

import (
	"insta-api/internal/helper"
)

type Response struct {
	Messsage string      `json:"message,omitempty"`
	Data     interface{} `json:"data,omitempty"`
}

type CustomDataResponse map[string]interface{}
type CustomDataArrayResponse []map[string]interface{}

func NewCustomResponse(data interface{}, err error) Response {
	jsonResp, _ := helper.ToJson(data)

	return Response{
		Messsage: "successful",
		Data:     CustomDataResponse(jsonResp),
	}
}

func NewCustomArrayResponse(data interface{}, err error) Response {
	jsonResp, _ := helper.ToArrayJson(data)

	return Response{
		Messsage: "successful",
		Data:     CustomDataArrayResponse(jsonResp),
	}
}
