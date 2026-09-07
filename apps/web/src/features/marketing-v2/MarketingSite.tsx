import { AudienceJourney, AudienceStack } from "./components/AudienceJourney";
import AudienceNavigation from "./components/AudienceNavigation";
import MarketingFooter from "./components/MarketingFooter";
import MarketingHeader from "./components/MarketingHeader";
import BuyerSection from "./sections/BuyerSection";
import CreatorSection from "./sections/CreatorSection";
import ClosingBand from "./sections/ClosingBand";
import FaqSection from "./sections/FaqSection";
import HeroSection from "./sections/HeroSection";
import SellerSection from "./sections/SellerSection";
import ViewportSignals from "./components/ViewportSignals";
import styles from "./MarketingSite.module.css";

export default function MarketingSite() {
  return (
    <div className={styles.root} data-marketing-scroller data-marketing-v2>
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <MarketingHeader />
      {/* One controller for every pinned section on the page — the three
          audience panels and the FAQ. The sticky tab belongs only to the
          audience stack, so that wrapper is separate from the provider. */}
      <AudienceJourney>
      <main id="main-content">
        <HeroSection />

        {/*
          Sellers, buyers and creators are one journey, and the audience tab
          belongs to it rather than to the page. Wrapping them together lets
          the tab be sticky *within* the journey: it arrives with sellers,
          holds the viewport bottom across all three, and is then released by
          the wrapper's own bottom edge so creators carries it out of view
          instead of it fading on its own or hanging over the FAQ.
        */}
        <AudienceStack>
          <SellerSection />
          <BuyerSection />
          <CreatorSection />
          <AudienceNavigation />
        </AudienceStack>

        <FaqSection />
        <ClosingBand />
      </main>
      </AudienceJourney>
      <MarketingFooter />
      <ViewportSignals />
    </div>
  );
}
