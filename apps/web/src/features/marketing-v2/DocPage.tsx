import type { ReactNode } from "react";
import MarketingFooter from "./components/MarketingFooter";
import MarketingHeader from "./components/MarketingHeader";
import styles from "./MarketingSite.module.css";

/**
 * The shell for the site's standing pages (About, Careers).
 *
 * They reuse the marketing scroller, header and footer rather than defining
 * their own, so the brand, the auto-hiding header and the footer's links stay
 * in one place — and so a link out of the footer does not land the reader on
 * something that looks like a different product.
 */
export default function DocPage({
  children,
  lede,
  title,
}: {
  readonly children: ReactNode;
  readonly lede: string;
  readonly title: string;
}) {
  return (
    <div className={styles.root} data-marketing-scroller data-marketing-v2>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <MarketingHeader />
      <main className={styles.docMain} id="main-content">
        <article className={styles.docArticle}>
          <h1 className={styles.docTitle}>{title}</h1>
          <p className={styles.docLede}>{lede}</p>
          {children}
        </article>
      </main>
      <MarketingFooter />
    </div>
  );
}
