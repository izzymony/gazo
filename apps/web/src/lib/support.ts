/**
 * The one support channel the product actually publishes.
 *
 * WhatsApp is the route the marketing site advertises ("Message us on
 * WhatsApp") and the only contact mechanism that exists — there is no support
 * email, no FAQ page, no ticketing. Every in-app "Contact Us", "Help & Support"
 * and "get help with this order" affordance used to be either a dead control or
 * a "coming soon" toast; they now all lead here, from one constant, so the
 * number lives in exactly one place.
 */
export const SUPPORT_WHATSAPP_NUMBER = "2348148015707";

/** Deep link to the support chat, optionally with a prefilled opening message. */
export const supportWhatsAppUrl = (message?: string): string => {
  const base = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};
