package domain

type Conversation struct {
	Model
	Participant1Id string                `json:"participant1_id"`
	Participant2Id string                `json:"participant2_id"`
	LastMessage    string                `json:"last_message"`
	Messages       []ConversationMessage `json:"messages,omitempty"`
	OrderItemId    string                `json:"order_item_id"`
}

type ConversationMessage struct {
	Model
	ConversationID string `json:"conversation_id"`
	SenderID       string `json:"sender_id"`
	Content        string `json:"content"`
	IsRead         bool   `json:"is_read"`
}
