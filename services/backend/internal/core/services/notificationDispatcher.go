package services

import (
	"context"
	"fmt"
	"log"
	"strconv"
	"strings"

	"gorm.io/gorm"

	mysql_repo "github.com/Tinovalabs/vibaar/services/backend/internal/adapter/repositories/sql"
	"github.com/Tinovalabs/vibaar/services/backend/internal/core/domain"
	"github.com/Tinovalabs/vibaar/services/backend/internal/ports"
)

// NotificationDispatcher is the NS2 orchestration layer. It turns a catalog
// event (notifRegistry) into an in-app Notification (always) plus, for the
// Critical off-app set, a best-effort WhatsApp→Email→SMS escalation. It composes
// the two existing services and introduces NO new channel. See
// product-management/requirements/NS2_NOTIFICATION_CATALOG.md.
//
// Not yet wired to any producer — this is the additive spine (Phase 1). Producer
// call sites are migrated onto Emit in a subsequent, reviewed step.
type NotificationDispatcher struct {
	inApp        *NotificationService
	tx           *TransactionalNotificationService
	businessRepo ports.BusinessIface
}

func NewNotificationDispatcher(db *gorm.DB) *NotificationDispatcher {
	return &NotificationDispatcher{
		inApp:        NewNotificationService(db),
		tx:           NewTransactionalNotificationService(db),
		businessRepo: mysql_repo.NewBusinessRepository(db),
	}
}

// EmitInput is one notification for one recipient. Multi-stakeholder events
// (delivered, cancelled) are emitted once per side with that side's event key,
// so copy and routing stay contextual (buyer → /orders, seller → /dashboard).
type EmitInput struct {
	Event  string            // registry key, e.g. "buyer.item.shipped"
	UserID string            // recipient
	Vars   map[string]string // {{item}}, {{amount}}, {{itemId}}, ...
	Phone  string            // optional — enables WhatsApp/SMS escalation
	Email  string            // optional — enables Email escalation
}

// Emit writes the in-app record (always) and, for the Critical off-app set,
// fires the transactional escalation best-effort. The off-app send runs in the
// background so a channel failure or latency never blocks — or fails — the
// caller's transaction. Returns an error only if the in-app write fails.
func (d *NotificationDispatcher) Emit(ctx context.Context, in EmitInput) error {
	def, ok := notifRegistry[in.Event]
	if !ok {
		// Producers discard Emit's error (best-effort), so a producer/registry key
		// mismatch would fail silently. Surface it here so it shows up in logs.
		log.Printf("notify: unknown event %q — no notification sent", in.Event)
		return fmt.Errorf("notify: unknown event %q", in.Event)
	}

	// Which mode's feed this belongs to — derived from the event-key prefix, so
	// the buyer and seller feeds/badges split reliably (not off the action_url).
	audience := "buyer"
	if strings.HasPrefix(in.Event, "seller.") {
		audience = "seller"
	}

	// 1) In-app record — always the permanent feed entry.
	if err := d.inApp.CreateNotification(&domain.Notification{
		UserID:    in.UserID,
		Type:      def.Type,
		Title:     renderVars(def.Title, in.Vars),
		Message:   renderVars(def.Body, in.Vars),
		ActionURL: renderVars(def.Route, in.Vars),
		IsRead:    false,
		Audience:  audience,
		Badge:     def.Badge,
	}); err != nil {
		return err
	}

	// 2) Off-app escalation — Critical set only, and only where a transactional
	// template exists and we have a contact. Escalation, not blast: this is the
	// single off-app copy, never a parallel duplicate of the in-app record.
	if def.WhatsApp && def.TxEvent != "" && d.tx != nil && d.tx.IsEnabled() &&
		(in.Phone != "" || in.Email != "") {
		params := NotificationParams{
			UserID:    in.UserID,
			EventType: def.TxEvent,
			Phone:     in.Phone,
			Email:     in.Email,
			Variables: in.Vars,
		}
		go func() { _ = d.tx.SendWithFallback(context.Background(), params) }()
	}

	return nil
}

// EmitToBusiness resolves a business's owner user (Mailbox B is user-scoped) and
// emits a seller-facing notification. Off-app escalation stays opt-in: the caller
// passes Phone/Email only when a WhatsApp/SMS is deliberately wanted, so wiring a
// seller event in-app never silently starts billing WhatsApp.
func (d *NotificationDispatcher) EmitToBusiness(ctx context.Context, businessID string, in EmitInput) error {
	biz, err := d.businessRepo.Find(businessID)
	if err != nil || biz.UserID == "" {
		return fmt.Errorf("notify: could not resolve owner for business %q", businessID)
	}
	in.UserID = biz.UserID
	return d.Emit(ctx, in)
}

// renderVars substitutes {{key}} placeholders in a template. Unknown
// placeholders are left intact so a missing variable is visible in QA rather
// than silently blanked.
func renderVars(tmpl string, vars map[string]string) string {
	if len(vars) == 0 {
		return tmpl
	}
	out := tmpl
	for k, v := range vars {
		out = strings.ReplaceAll(out, "{{"+k+"}}", v)
	}
	return out
}

// FormatNaira renders a whole-naira amount with thousands separators, e.g.
// 46500 -> "₦46,500". Shared by the money/order notification producers.
func FormatNaira(amount float64) string {
	n := int64(amount + 0.5)
	neg := n < 0
	if neg {
		n = -n
	}
	digits := strconv.FormatInt(n, 10)
	var b strings.Builder
	for i, c := range digits {
		if i > 0 && (len(digits)-i)%3 == 0 {
			b.WriteByte(',')
		}
		b.WriteRune(c)
	}
	if neg {
		return "-₦" + b.String()
	}
	return "₦" + b.String()
}
