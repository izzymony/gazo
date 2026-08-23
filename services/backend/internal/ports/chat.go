package ports

import (
	"insta-api/internal/core/domain"
)

type ChatInterface interface {
	CreateConversation(conversation *domain.Conversation) (*domain.Conversation, error)
	CreateMessage(msg *domain.ConversationMessage) error
	GetMessages(convoID string) ([]domain.ConversationMessage, error)
	FindConversationsByUser(userID string) ([]domain.Conversation, error)
	GetConversation(params map[string]interface{}) (*domain.Conversation, error)
	UpdateConversation(conversation *domain.Conversation) error
	MarkMessagesAsRead(conversationId, userId string) error
	CountUnreadMessages(userId string) (int64, error)
	CountUnreadInConversation(conversationId, userId string) (int64, error)
}
