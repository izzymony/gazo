"use client";

import BuyerRail from "../components/BuyerRail";
import SlideProgress from "../components/SlideProgress";
import { useAudienceScene } from "../components/AudienceJourney";
import { marketingContent } from "../content";
import styles from "../MarketingSite.module.css";

/**
 * Buyers — Figma "SECTION INTERACTIONS" 14:2778.
 *
 * Same structural contract as Sellers and Creators — one shared inner grid,
 * copy stage, 461x480 asset stage and progress component. Buyers is the one
 * audience the source mirrors, so the grid columns swap; nothing else does.
 *
 * Both halves change together. The asset is the same vendor list at a
 * different position, which is what the source's "infinite scroll" component
 * does across its scroll 1 / scroll 2 variants.
 */
export default function BuyerSection() {
  const { buyer } = marketingContent;
  const { index, railRef, sectionRef, select } = useAudienceScene(
    buyer.slides.length
  );

  return (
    <section
      className={`${styles.audiencePanel} ${styles.buyerSection}`}
      ref={sectionRef}
      data-node-id="14:2778"
      id="buyers"
    >
      <div className={styles.audiencePanelPin} data-panel-pin>
        <div className={styles.sectionGlow} aria-hidden="true" />

      <div
        aria-label="What buying on Vibaar looks like"
        aria-roledescription="carousel"
        className={`${styles.audienceInner} ${styles.audienceInnerMirrored}`}
        role="group"
      >
        <div className={styles.deckColumn}>
          {/* 14:2802 — above the card, on the section ground. */}
          <SlideProgress
            index={index}
            labels={buyer.slides.map(
              (slide, slot) =>
                `Slide ${slot + 1} of ${buyer.slides.length}: ${slide.title}`
            )}
            onSelect={select}
            railRef={railRef}
          />

          <div className={styles.audienceVisualStage}>
            <div className={styles.deckStage}>
              {buyer.slides.map((slide, slot) => (
                <div
                  aria-hidden={slot !== index}
                  className={`${styles.deckSlide} ${styles.buyerVisual}`}
                  data-active={slot === index}
                  key={slide.id}
                >
                  <BuyerRail
                    products={[
                      ...buyer.products.slice(slide.offset),
                      ...buyer.products.slice(0, slide.offset),
                    ]}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.audienceCopyStage}>
          <div className={styles.deckStage}>
            {buyer.slides.map((slide, slot) => (
              <div
                aria-label={`${slot + 1} of ${buyer.slides.length}`}
                aria-roledescription="slide"
                className={`${styles.deckSlide} ${styles.audienceCopy} ${styles.buyerCopy}`}
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
        </div>
      </div>
    </section>
  );
}
