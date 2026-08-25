package mysql_repo

import (
	"fmt"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

type ChatRepository struct {
	db *gorm.DB
}

func NewChatRepository(db *gorm.DB) ports.ChatInterface {
	return &ChatRepository{
		db: db,
	}
}

func (r *ChatRepository) CreateConversation(conversation *domain.Conversation) (*domain.Conversation, error) {
	if err := r.db.Create(conversation).Error; err != nil {
		return nil, err
	}
	return conversation, nil
}

func (r *ChatRepository) CreateMessage(msg *domain.ConversationMessage) error {
	msg.ID = uuid.New().String()
	return r.db.Create(msg).Error
}

func (r *ChatRepository) GetMessages(convoID string) ([]domain.ConversationMessage, error) {
	var messages []domain.ConversationMessage
	err := r.db.Where("conversation_id = ?", convoID).Order("created_at ASC").Find(&messages).Error
	return messages, err
}

func (r *ChatRepository) FindConversationsByUser(userID string) ([]domain.Conversation, error) {
	var conversations []domain.Conversation
	err := r.db.
		Where("participant1_id = ? OR participant2_id = ?", userID, userID).
		Order("updated_at DESC").
		Find(&conversations).Error
	if err != nil {
		return nil, err
	}
	return conversations, nil
}

func (r *ChatRepository) GetConversation(params map[string]interface{}) (*domain.Conversation, error) {
	var conversation domain.Conversation
	query := r.db.Model(&domain.Conversation{})

	for key, value := range params {
		query = query.Where(fmt.Sprintf("%s = ?", key), value)
	}

	err := query.First(&conversation).Error
	if err != nil {
		return nil, err
	}

	return &conversation, nil
}

func (r *ChatRepository) UpdateConversation(conversation *domain.Conversation) error {
	return r.db.Save(conversation).Error
}

func (r *ChatRepository) MarkMessagesAsRead(conversationId, userId string) error {
	return r.db.Model(&domain.ConversationMessage{}).
		Where("conversation_id = ? AND sender_id != ? AND is_read = false", conversationId, userId).
		Update("is_read", true).Error
}

func (r *ChatRepository) CountUnreadInConversation(conversationId, userId string) (int64, error) {
	var count int64
	err := r.db.
		Model(&domain.ConversationMessage{}).
		Where("conversation_id = ? AND sender_id != ? AND is_read = ?", conversationId, userId, false).
		Count(&count).Error
	return count, err
}

func (r *ChatRepository) CountUnreadMessages(userId string) (int64, error) {
	var count int64
	err := r.db.
		Model(&domain.ConversationMessage{}).
		Where("sender_id != ? AND is_read = ?", userId, false).
		Joins("JOIN conversations ON conversations.id = conversation_messages.conversation_id").
		Where("conversations.participant1_id = ? OR conversations.participant2_id = ?", userId, userId).
		Count(&count).Error

	return count, err
}
