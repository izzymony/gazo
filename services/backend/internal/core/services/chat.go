package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
	mysql_repo "insta-api/internal/adapter/repositories/sql"
	"insta-api/internal/core/domain"
	"insta-api/internal/ports"
)

// ConversationDTO is the hydrated shape returned to the inbox list: the *other*
// participant's display identity (store name/logo for a seller, else the user's
// name/avatar), the last message + time, per-conversation unread count, and the
// order-item product context the conversation was started from.
type ConversationDTO struct {
	ID               string         `json:"id"`
	OtherParticipant ParticipantDTO `json:"other_participant"`
	LastMessage      string         `json:"last_message"`
	LastMessageAt    time.Time      `json:"last_message_at"`
	UnreadCount      int64          `json:"unread_count"`
	OrderItem        *OrderItemDTO  `json:"order_item,omitempty"`
}

type ParticipantDTO struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Avatar   string `json:"avatar"`
	IsSeller bool   `json:"is_seller"`
}

type OrderItemDTO struct {
	ID      string `json:"id"`
	Title   string `json:"title"`
	Image   string `json:"image"`
	Variant string `json:"variant"`
}

// hydrateParticipant resolves a participant id into a display identity. Sellers
// show as their store (name + logo); everyone else as their own name + avatar.
func (s *ChatService) hydrateParticipant(participantId string) ParticipantDTO {
	dto := ParticipantDTO{ID: participantId}
	user, err := s.userRepo.GetOne(map[string]interface{}{"id": participantId}, false)
	if err != nil || user == nil {
		return dto
	}
	if user.Business != nil && user.Business.Name != "" {
		dto.Name = user.Business.Name
		dto.Avatar = user.Business.Logo
		dto.IsSeller = true
	} else {
		dto.Name = strings.TrimSpace(user.Firstname + " " + user.Lastname)
		dto.Avatar = user.ProfileImage
	}
	return dto
}

type ChatService struct {
	chatRepo     ports.ChatInterface
	userRepo     ports.UserRepoInterface
	businessRepo ports.BusinessIface
	orderRepo    ports.OrderRepoInterface
	dispatcher   *NotificationDispatcher
}

func NewChatService(db *gorm.DB) *ChatService {
	return &ChatService{
		chatRepo:     mysql_repo.NewChatRepository(db),
		businessRepo: mysql_repo.NewBusinessRepository(db),
		userRepo:     mysql_repo.NewUserRepository(db),
		orderRepo:    mysql_repo.NewOrderRepository(db),
		dispatcher:   NewNotificationDispatcher(db),
	}
}

func (s *ChatService) SendMessage(senderId string, isGuest bool, receiverId, content, orderItemId string) (*domain.ConversationMessage, error) {
	if senderId == receiverId {
		return nil, errors.New("cannot send message to same user")
	}
	sender, err := s.userRepo.GetOne(map[string]interface{}{
		"id": senderId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if sender == nil && !isGuest {
		return nil, fmt.Errorf("invalid sender")
	}

	receiver, err := s.userRepo.GetOne(map[string]interface{}{
		"id": receiverId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if receiver == nil && !isGuest {
		return nil, fmt.Errorf("invalid receiver")
	}

	if orderItemId != "" {
		item, err := s.orderRepo.GetOneOrderItem(map[string]interface{}{"id": orderItemId}, isGuest)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("something went wrong")
		}
		if item == nil {
			return nil, fmt.Errorf("invalid order Item")
		}
	}

	var conversation *domain.Conversation
	conversation, err = s.chatRepo.GetConversation(map[string]interface{}{"participant1_id": senderId, "participant2_id": receiverId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			conversation, err = s.chatRepo.GetConversation(map[string]interface{}{"participant1_id": receiverId, "participant2_id": senderId})
			if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, fmt.Errorf("something went wrong")
			}
		} else {
			return nil, err
		}
	}

	if conversation == nil {
		conversation, err = s.chatRepo.CreateConversation(&domain.Conversation{
			Participant1Id: senderId,
			Participant2Id: receiverId,
			LastMessage:    content,
			OrderItemId:    orderItemId,
		})
		if err != nil {
			return nil, fmt.Errorf("something went wrong")
		}
	} else {
		conversation.LastMessage = content
		if err := s.chatRepo.UpdateConversation(conversation); err != nil {
			return nil, fmt.Errorf("something went wrong")
		}
	}

	msg := &domain.ConversationMessage{
		ConversationID: conversation.ID,
		SenderID:       senderId,
		Content:        content,
	}
	err = s.chatRepo.CreateMessage(msg)
	if err == nil {
		s.notifyNewMessage(sender, receiverId, conversation.ID)
	}
	return msg, err
}

// notifyNewMessage sends the recipient an in-app chat notification (NS2). Side is
// chosen by whether the recipient owns a business; "from" prefers the sender's
// store name, then username. In-app only, best-effort.
func (s *ChatService) notifyNewMessage(sender *domain.User, receiverId, conversationId string) {
	from := "Someone"
	if sender != nil {
		if biz, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": sender.ID}); err == nil && biz != nil && biz.Name != "" {
			from = biz.Name
		} else if sender.UserName != "" {
			from = sender.UserName
		} else if sender.Firstname != "" {
			from = sender.Firstname
		}
	}
	event := "buyer.chat.message"
	if biz, err := s.businessRepo.GetOne(map[string]interface{}{"user_id": receiverId}); err == nil && biz != nil {
		event = "seller.chat.message"
	}
	_ = s.dispatcher.Emit(context.Background(), EmitInput{
		Event:  event,
		UserID: receiverId,
		Vars:   map[string]string{"from": from, "chatId": conversationId},
	})
}

func (s *ChatService) GetConversationMessages(userId string, isGuest bool, conversationId string) ([]domain.ConversationMessage, error) {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if user == nil && !isGuest {
		return nil, fmt.Errorf("invalid user/guest")
	}
	conversation, err := s.chatRepo.GetConversation(map[string]interface{}{"id": conversationId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("invalid conversation id")
		} else {
			return nil, fmt.Errorf("something went wrong")
		}
	}
	if conversation.Participant1Id != userId && conversation.Participant2Id != userId {
		return nil, fmt.Errorf("invalid conversation")
	}
	return s.chatRepo.GetMessages(conversationId)
}

func (s *ChatService) MarkMessageRead(userId string, isGuest bool, conversationId string) error {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("something went wrong")
	}
	if user == nil && !isGuest {
		return fmt.Errorf("invalid user/guest")
	}

	conversation, err := s.chatRepo.GetConversation(map[string]interface{}{"id": conversationId})
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("invalid conversation id")
		}
		return fmt.Errorf("something went wrong")
	}

	if conversation.Participant1Id != userId && conversation.Participant2Id != userId {
		return fmt.Errorf("invalid conversation")
	}

	if err := s.chatRepo.MarkMessagesAsRead(conversationId, userId); err != nil {
		return fmt.Errorf("failed to mark messages as read: %w", err)
	}

	return nil
}

func (s *ChatService) GetUserConversations(userId string, isGuest bool) ([]ConversationDTO, error) {
	user, err := s.userRepo.GetOne(map[string]interface{}{
		"id": userId,
	}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("something went wrong")
	}
	if user == nil && !isGuest {
		return nil, fmt.Errorf("invalid user/guest")
	}
	conversations, err := s.chatRepo.FindConversationsByUser(userId)
	if err != nil {
		return nil, fmt.Errorf("something went wrong")
	}

	dtos := make([]ConversationDTO, 0, len(conversations))
	for _, convo := range conversations {
		// The "other" participant is whichever id isn't the requester.
		otherId := convo.Participant1Id
		if otherId == userId {
			otherId = convo.Participant2Id
		}

		unread, _ := s.chatRepo.CountUnreadInConversation(convo.ID, userId)

		var orderItem *OrderItemDTO
		if convo.OrderItemId != "" {
			if item, err := s.orderRepo.GetOneOrderItem(map[string]interface{}{"id": convo.OrderItemId}, false); err == nil && item != nil {
				oi := &OrderItemDTO{ID: item.ID, Variant: item.VariantSelection}
				if item.Product != nil {
					oi.Title = item.Product.Title
					if len(item.Product.Image) > 0 {
						oi.Image = item.Product.Image[0]
					}
				}
				orderItem = oi
			}
		}

		dtos = append(dtos, ConversationDTO{
			ID:               convo.ID,
			OtherParticipant: s.hydrateParticipant(otherId),
			LastMessage:      convo.LastMessage,
			LastMessageAt:    convo.UpdatedAt,
			UnreadCount:      unread,
			OrderItem:        orderItem,
		})
	}
	return dtos, nil
}

func (s *ChatService) GetUnreadMessagesCount(userId string, isGuest bool) (int64, error) {
	user, err := s.userRepo.GetOne(map[string]interface{}{"id": userId}, isGuest)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return 0, fmt.Errorf("something went wrong")
	}
	if user == nil && !isGuest {
		return 0, fmt.Errorf("invalid user/guest")
	}

	count, err := s.chatRepo.CountUnreadMessages(userId)
	if err != nil {
		return 0, fmt.Errorf("failed to get unread messages count")
	}

	return count, nil
}
