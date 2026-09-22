import Image from "next/image";
import { marketingContent } from "../content";
import styles from "../MarketingSite.module.css";

/**
 * Closing image band — Figma 14:2658 (1120x432), the upper half of section
 * 14:2656. The source overlays "Where social meets shopping" on a photograph;
 * that line is pre-rebrand, so the approved launch tagline carries the same
 * position.
 *
 * Imagery is a rights-safe placeholder pending gate G1 (asset rights); the
 * band deliberately reuses the owned hero photograph rather than introducing
 * an unowned one.
 */
export default function ClosingBand() {
  const { closing } = marketingContent;

  return (
    <section className={styles.closingBand} data-node-id="14:2658">
      <div className={styles.closingFrame}>
        <Image
          alt={closing.imageAlt}
          className={styles.closingImage}
          fill
          sizes="(max-width: 767px) 100vw, 1120px"
          src="/marketing-v2/hero-community.webp"
        />
        <div className={styles.closingScrim} aria-hidden="true" />
        <p className={styles.closingStatement} data-reveal="false">
          {closing.statement}
        </p>
      </div>
    </section>
  );
}
