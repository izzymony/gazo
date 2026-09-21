"use client";

import SlideProgress from "../components/SlideProgress";
import { useAudienceScene } from "../components/AudienceJourney";
import { marketingContent } from "../content";
import styles from "../MarketingSite.module.css";

/**
 * Sellers — Figma "SECTION INTERACTIONS" 14:2851 / 14:2928 (slide 1 / slide 2).
 *
 * Was running its own timer and its own indicator markup; now on the shared
 * deck so sellers, buyers and creators behave identically. Copy left, asset
 * right, as the source has it.
 */
export default function SellerSection() {
  const { seller } = marketingContent;
  const { index, railRef, sectionRef, select } = useAudienceScene(
    seller.slides.length
  );

  return (
    <section
      className={`${styles.audiencePanel} ${styles.sellerSection}`}
      ref={sectionRef}
      data-node-id="14:2851"
      id="sellers"
    >
      <div className={styles.audiencePanelPin} data-panel-pin>
        <div className={styles.sectionGlow} aria-hidden="true" />

      <div
        aria-label="What selling on Vibaar looks like"
        aria-roledescription="carousel"
        className={styles.audienceInner}
        role="group"
      >
        <div className={styles.audienceCopyStage}>
          <div className={styles.deckStage}>
            {seller.slides.map((slide, slot) => (
              <div
                aria-label={`${slot + 1} of ${seller.slides.length}`}
                aria-roledescription="slide"
                className={`${styles.deckSlide} ${styles.audienceCopy} ${styles.sellerCopy}`}
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
            labels={seller.slides.map(
              (slide, slot) =>
                `Slide ${slot + 1} of ${seller.slides.length}: ${slide.title}`
            )}
            onSelect={select}
            railRef={railRef}
          />

          <div className={styles.audienceVisualStage}>
            <div className={styles.deckStage}>
              <div
                aria-hidden={index !== 0}
                className={styles.deckSlide}
                data-active={index === 0}
              >
                <ConversationVisual />
              </div>
              <div
                aria-hidden={index !== 1}
                className={styles.deckSlide}
                data-active={index === 1}
              >
                <StorefrontVisual />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}

function ConversationVisual() {
  const { seller } = marketingContent;

  return (
    <div
      aria-label="A customer conversation moving from a price question to a confirmed order"
      className={styles.sellerVisual}
      role="img"
    >
      <span className={styles.lostSaleGhost} aria-hidden="true">👻</span>

      <div className={styles.storefrontSheet}>
        <div className={styles.storeIdentity}>
          <div className={styles.storeMark} aria-hidden="true">V</div>
          <div>
            <strong>Vibaar Goods</strong>
            <span>A storefront made for social selling</span>
          </div>
        </div>

        <div className={styles.chatDivider}><span>Earlier</span></div>
        <div className={styles.chatThread}>
          <div className={styles.customerMessage}>
            <span aria-hidden="true">A</span>
            <p className={styles.customerBubble}>{seller.chat.customer}</p>
          </div>
          <div className={styles.sellerMessage}>
            <p className={styles.sellerBubble}>Welcome — this one is available.</p>
            <span aria-hidden="true">V</span>
          </div>
          <div className={styles.sellerMessage}>
            <p className={styles.sellerBubble}>{seller.chat.seller}</p>
            <span aria-hidden="true">V</span>
          </div>
        </div>

        <div className={styles.chatDivider}><span>Now</span></div>
        <p className={styles.checkoutBubble}>
          <span aria-hidden="true">✓</span>
          {seller.chat.status}
        </p>
      </div>

      <span className={styles.orderChip}>Store link sent</span>
    </div>
  );
}

function StorefrontVisual() {
  return (
    <div
      aria-label="A trusted Vibaar storefront profile"
      className={`${styles.sellerVisual} ${styles.sellerProfileVisual}`}
      role="img"
    >
      <div className={styles.sellerProfileCard}>
        <div className={styles.sellerProfileHeader}>
          <span className={styles.sellerProfileAvatar} aria-hidden="true">V</span>
          <div>
            <p className={styles.sellerProfileName}>
              Vibaar Goods <span aria-label="Verified seller">✓</span>
            </p>
            <div className={styles.sellerProfileStats}>
              <span><strong>412</strong> posts</span>
              <span><strong>22k</strong> followers</span>
              <span><strong>1,200</strong> following</span>
            </div>
          </div>
        </div>

        <div className={styles.sellerProfileBody}>
          <strong>Vibaar Goods Store</strong>
          <p>Everyday pieces, simple checkout and delivery you can track.</p>
          <span className={styles.sellerProfileLink}>vibaar.com/vibaar-goods</span>
        </div>

        <span className={styles.sellerProfileAction}>View storefront</span>
      </div>
    </div>
  );
}
