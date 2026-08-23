package requests

type SendMessage struct {
	ReceiverID  string `json:"receiver_id"`
	Content     string `json:"content"`
	OrderItemId string `json:"order_item_id"`
}
