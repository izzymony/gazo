"use client";

import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@vibaar/utils";
import { focusRing } from "./styles";
import {
  FaInstagram,
  FaTiktok,
  FaFacebook,
  FaWhatsapp,
  FaXTwitter,
  PiShareFatThin,
  type IconProps,
} from "./icons";

interface SocialProfiles {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  whatsapp?: string;
  x?: string;
}

const PLATFORMS: {
  id: keyof SocialProfiles;
  label: string;
  Icon: React.ComponentType<IconProps>;
  url: (handle: string) => string;
}[] = [
  { id: "instagram", label: "Instagram", Icon: FaInstagram, url: (h) => `https://instagram.com/${h}` },
  { id: "tiktok", label: "TikTok", Icon: FaTiktok, url: (h) => `https://tiktok.com/@${h}` },
  { id: "facebook", label: "Facebook", Icon: FaFacebook, url: (h) => `https://facebook.com/${h}` },
  {
    id: "whatsapp",
    label: "WhatsApp",
    Icon: FaWhatsapp,
    url: (h) => `https://wa.me/${h.replace(/[^\d]/g, "")}`,
  },
  { id: "x", label: "X", Icon: FaXTwitter, url: (h) => `https://x.com/${h}` },
];

/**
 * A store's social links plus a share action, revealed by the header kebab.
 *
 * THE BUG THIS FIXES: every glyph in here was an inline SVG painted
 * `fill="white"` — ten of them — sitting on a `bg-surface-subtle` pill, which is
 * very nearly white. The menu opened correctly and rendered a blank white
 * capsule, so it read as a control that did nothing. (Same fault as the mode
 * switch's white-on-yellow icon: artwork with a colour baked in, on a surface
 * that colour cannot be seen against.) They are icon components now, drawing in
 * `currentColor`, so the pill's own text colour carries them — and ~200 lines of
 * hand-drawn path data goes with them.
 *
 * The links are also LINKS. Tapping a store's Instagram icon used to copy the
 * handle to the clipboard and close the menu; nothing here ever opened a
 * profile.
 */
export default function ExpandableIconMenu({
  isOpen,
  setIsOpen,
  socialProfiles = {},
}: {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  socialProfiles?: SocialProfiles;
}) {
  const handleShare = async () => {
    // Only use Web Share API on mobile devices (desktop share sheets aren't useful)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (navigator.share && isMobile) {
      try {
        await navigator.share({
          title: "Check this out!",
          text: "Here's something cool I found.",
          url: window.location.href,
        });
      } catch {
        // The user dismissing the share sheet is not an error.
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied!", { duration: 2000 });
      } catch {
        toast.error("Failed to copy link");
      }
    }
  };

  /**
   * A stored profile can be a bare handle, an `@handle`, or a full URL, because
   * the store-details form accepts all three.
   */
  const hrefFor = (platform: (typeof PLATFORMS)[number], value: string) => {
    const raw = value.trim();
    if (/^https?:\/\//i.test(raw)) return raw;
    return platform.url(raw.replace(/^@/, ""));
  };

  const items = PLATFORMS.filter((p) => (socialProfiles[p.id] || "").trim() !== "").map((p) => ({
    ...p,
    href: hrefFor(p, socialProfiles[p.id] || ""),
  }));

  const pill =
    "inline-flex items-center gap-1 rounded-pill bg-surface-subtle px-2 py-1.5 text-foreground-primary shadow-card backdrop-blur-sm z-dropdown";
  const control = cn(
    "flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-surface-muted",
    focusRing
  );

  return (
    <div className="flex gap-2">
      {/* The pill only exists when it has something in it. It rendered
          unconditionally, so a closed menu — and any store with no social
          profiles — painted an empty disc beside the kebab. */}
      {isOpen && items.length > 0 && (
        <motion.div className={pill}>
          {items.map((item, index) => (
            <AnimatePresence key={item.id}>
              <motion.a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${item.label} profile`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => setIsOpen(false)}
                className={control}>
                <item.Icon size={20} aria-hidden="true" />
              </motion.a>
            </AnimatePresence>
          ))}
        </motion.div>
      )}

      {isOpen && (
        <motion.div className={pill}>
          <AnimatePresence>
            <motion.button
              type="button"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, delay: items.length * 0.05 }}
              onClick={() => {
                handleShare();
                setIsOpen(false);
              }}
              aria-label="Share this page"
              className={control}>
              <PiShareFatThin size={20} aria-hidden="true" />
            </motion.button>
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
