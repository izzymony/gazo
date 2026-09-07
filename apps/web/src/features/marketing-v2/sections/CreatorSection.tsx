"use client";

import Image from "next/image";
import SlideProgress from "../components/SlideProgress";
import { useAudienceScene } from "../components/AudienceJourney";
import { marketingContent } from "../content";
import styles from "../MarketingSite.module.css";

/**
 * Creators — Figma "SECTION INTERACTIONS" 14:2710.
 *
 * The shell deliberately uses the same structural classes as Sellers: one
 * 469px copy column, the same gap, one 461x480 asset stage and the shared
 * progress component. Only the artwork inside that stage is creator-specific.
 *
 * Figma component set 14:4757 starts with an empty ground, then introduces an
 * analytics card, a creator filming, and a second analytics card. The two page
 * slides use the useful composed states rather than mistaking the first blank
 * variant for the complete source asset.
 */
export default function CreatorSection() {
  const { creator } = marketingContent;
  const { index, railRef, sectionRef, select } = useAudienceScene(
    creator.slides.length
  );

  return (
    <section
      className={`${styles.audiencePanel} ${styles.creatorSection}`}
      data-node-id="14:2710"
      id="creators"
      ref={sectionRef}
    >
      <div className={styles.audiencePanelPin} data-panel-pin>
        <div className={styles.sectionGlow} aria-hidden="true" />

        <div
          aria-label="What creating on Vibaar looks like"
          aria-roledescription="carousel"
          className={styles.audienceInner}
          role="group"
        >
          <div className={styles.audienceCopyStage}>
            <div className={styles.deckStage}>
              {creator.slides.map((slide, slot) => (
                <div
                  aria-label={`${slot + 1} of ${creator.slides.length}`}
                  aria-roledescription="slide"
                  className={`${styles.deckSlide} ${styles.audienceCopy} ${styles.creatorCopy}`}
                  data-active={slot === index}
                  key={slide.id}
                  role="group"
                >
                  <h2>{slide.title}</h2>
                  <p>{slide.body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.deckColumn}>
            <SlideProgress
              index={index}
              labels={creator.slides.map(
                (slide, slot) =>
                  `Slide ${slot + 1} of ${creator.slides.length}: ${slide.title}`
              )}
              onSelect={select}
              railRef={railRef}
            />

            <div className={styles.audienceVisualStage}>
              <div className={styles.deckStage}>
                {creator.slides.map((slide, slot) => (
                  <div
                    aria-hidden={slot !== index}
                    className={styles.deckSlide}
                    data-active={slot === index}
                    key={slide.id}
                  >
                    <CreatorVisual expanded={slot === 1} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CreatorVisual({ expanded }: { readonly expanded: boolean }) {
  return (
    <div
      aria-label={
        expanded
          ? "A creator filming content with reach and product-view analytics"
          : "A creator filming content with product-view analytics"
      }
      className={styles.creatorVisual}
      role="img"
    >
      <MetricCard
        className={styles.creatorMetricPrimary}
        label="Product views"
        trend="+12%"
        value="15.2K"
      />

      <div className={styles.creatorVideoCard}>
        <Image
          alt="A creator filming a video with a phone and ring light"
          fill
          sizes="(max-width: 900px) 62vw, 260px"
          src="/marketing-v2/creator-filming.jpg"
        />
      </div>

      {expanded ? (
        <MetricCard
          className={styles.creatorMetricSecondary}
          label="Content reach"
          trend="+30%"
          value="197.3K"
        />
      ) : null}
    </div>
  );
}

function MetricCard({
  className,
  label,
  trend,
  value,
}: {
  readonly className: string;
  readonly label: string;
  readonly trend: string;
  readonly value: string;
}) {
  return (
    <div className={`${styles.creatorMetricCard} ${className}`}>
      <span>{label}</span>
      <div className={styles.creatorMetricValue}>
        <strong>{value}</strong>
        <small>{trend} ↑</small>
      </div>
      {/* Seven bars of a fixed shape — the heights are styling, so they live
          in the stylesheet rather than an inline style object. */}
      <div className={styles.creatorChart} aria-hidden="true">
        {Array.from({ length: 7 }, (_, bar) => (
          <i key={`${label}-${bar}`} />
        ))}
      </div>
    </div>
  );
}
