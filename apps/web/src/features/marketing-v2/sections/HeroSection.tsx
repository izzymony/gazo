import { Store } from "@vibaar/ui/icons";
import Image from "next/image";
import Link from "next/link";
import SellerLink from "../components/SellerLink";
import StarFaceIcon from "../components/StarFaceIcon";
import { marketingContent } from "../content";
import styles from "../MarketingSite.module.css";

/**
 * Hero — Figma 14:1995.
 *
 * Ported from the V1 landing hero, which already carried these elements as
 * unnamed Figma-export components. Each is now named for what it is and drawn
 * from tokens rather than raw values:
 *
 *   V1 `Elements` + `Ellipses` + `DoodlePatternPalette3`
 *        → `.heroDoodle`, a single static /marketing-v2/hero-doodle.svg
 *          (was 110 inline paths across ~24KB of JSX plus a 45KB paths module)
 *   V1 floating "Vendors/Buyers/Influencers" labels → `.floatingTag`
 *   V1 3D ornaments  → `.heroOrnament`
 *   V1 "Social" gradient word → `.heroAccent`
 *   V1 star-face chip → `.eyebrow` + `StarFaceIcon`
 */
const audienceOrnaments = {
  sellers: "/marketing-v2/ornament-instagram.webp",
  buyers: "/marketing-v2/ornament-avatars.webp",
  creators: "/marketing-v2/ornament-megaphone.webp",
} as const;

export default function HeroSection() {
  const { hero } = marketingContent;

  return (
    <section className={styles.hero} data-inview="false" data-node-id="14:1995">
      <div className={styles.heroDoodle} aria-hidden="true" />
      <div className={styles.heroGlow} aria-hidden="true" />

      <div className={styles.heroContent}>
        <p className={styles.eyebrow}>
          <StarFaceIcon className={styles.eyebrowStar} size={16} />
          {hero.eyebrow}
        </p>

        <h1 className={styles.heroTitle}>
          {hero.titleBefore}{" "}
          <span className={styles.heroAccent}>
            {/* The dashed edge is a stroked rounded rect rather than four edge
                gradients, so the dashes carry on round the corners. */}
            <svg
              aria-hidden="true"
              className={styles.heroAccentFrame}
              focusable="false"
            >
              <rect height="100%" rx="24" width="100%" x="0" y="0" />
            </svg>
            {hero.titleAccent}
          </span>
          <br />
          {hero.titleAfter}
        </h1>

        <p className={styles.heroBody}>{hero.body}</p>

        <div className={styles.heroActions}>
          {/* Same words for everyone — this is the page's argument, not a
              nav control — but a signed-in seller is sent to their own
              storefront rather than back through a sign-up screen that
              would clear their session on arrival. */}
          <SellerLink className={styles.primaryAction}>
            {hero.primaryAction} <span aria-hidden="true">↗</span>
          </SellerLink>
          {/* The marketplace is live at /shop, so this is a real link. It was
              a disabled span carrying a "Soon" chip long after the route
              shipped — a dead control on the page and a promise the sitemap
              already contradicted at priority 0.9. */}
          <Link className={styles.secondaryAction} href="/shop">
            <Store size={18} aria-hidden="true" />
            {hero.secondaryAction}
          </Link>
        </div>

        {/* Each audience label and its V1 ornament share one floating parent,
            preserving the connected diagonal compositions from Figma. */}
        <div className={styles.heroDecor} aria-hidden="true">
          {hero.floatingTags.map((tag) => {
            const ornament = audienceOrnaments[tag.id];

            return (
              <div
                className={`${styles.audienceCluster} ${styles[`audienceCluster--${tag.id}`]}`}
                key={tag.id}
              >
                <Image
                  alt=""
                  className={styles.heroOrnament}
                  height={56}
                  src={ornament}
                  width={56}
                />
                <span className={`${styles.floatingTag} ${styles[`floatingTag--${tag.id}`]}`}>
                  {tag.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className={styles.heroStage}>
        <div className={styles.heroImageFrame}>
          <Image
            alt={hero.imageAlt}
            className={styles.heroImage}
            fill
            priority
            sizes="(max-width: 768px) 92vw, 850px"
            src="/marketing-v2/hero-community.webp"
          />
        </div>
      </div>
    </section>
  );
}
