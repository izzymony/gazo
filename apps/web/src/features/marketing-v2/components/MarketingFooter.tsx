import { BubbleChat, Call, FaInstagram, FaTiktok, FaXTwitter } from "@vibaar/ui/icons";
import Image from "next/image";
import Link from "next/link";
import { marketingContent } from "../content";
import styles from "../MarketingSite.module.css";

/**
 * Footer — Figma 14:2660 (1120x160), two rows:
 *   14:2661  logo left  ·  contact CTAs right   (1120x80)
 *   14:2675  socials left  ·  legal links right (1120x40)
 *
 * Destinations come from the accounts V1 already publishes. Anything without
 * a published route (the phone line) still renders as pending rather than
 * pointing at an invented number. About/Careers are omitted until those
 * routes exist.
 */
const contactIcons = { whatsapp: BubbleChat, phone: Call } as const;
const socialIcons = {
  instagram: FaInstagram,
  tiktok: FaTiktok,
  x: FaXTwitter,
} as const;

export default function MarketingFooter() {
  const { footer } = marketingContent;

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        {/* 14:2661 — logo · contact CTAs */}
        <div className={styles.footerPrimaryRow}>
          <Image
            alt="Vibaar"
            className={styles.footerLogo}
            height={48}
            src="/brand/logo-yellow.svg"
            width={168}
          />

          <ul className={styles.footerContacts}>
            {footer.contacts.map((contact) => {
              const Icon = contactIcons[contact.id as keyof typeof contactIcons];
              // Emphasis follows what actually works: the live route gets the
              // solid chip, anything still pending gets the outlined one.
              const className = contact.href
                ? styles.footerContactSolid
                : styles.footerContactOutline;
              return (
                <li key={contact.id}>
                  {contact.href ? (
                    <a
                      className={className}
                      href={contact.href}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <Icon size={18} aria-hidden="true" />
                      {contact.label}
                    </a>
                  ) : (
                    <span aria-disabled="true" className={className}>
                      <Icon size={18} aria-hidden="true" />
                      {contact.label}
                      <span className={styles.footerContactStatus}>
                        {footer.contactStatus}
                      </span>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* 14:2675 — socials left · legal right */}
        <div className={styles.footerMetaRow}>
          <ul aria-label="Vibaar social accounts" className={styles.footerSocials}>
            {footer.socials.map((social) => {
              const Icon = socialIcons[social.id as keyof typeof socialIcons];
              return (
                <li key={social.id}>
                  <a
                    aria-label={social.label}
                    className={styles.footerSocial}
                    href={social.href}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <Icon size={18} aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>

          <nav aria-label="Legal" className={styles.footerLinks}>
            {footer.links.map((link) => (
              <Link href={link.href} key={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <p className={styles.footerBuiltBy}>{footer.builtBy}</p>
      </div>
    </footer>
  );
}
