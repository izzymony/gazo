"use client";

import { Clock, FiUsers, ShoppingBag, Store } from "@vibaar/ui/icons";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAudienceJourney } from "./AudienceJourney";
import styles from "../MarketingSite.module.css";

const audienceLinks = [
  { id: "sellers", label: "Sellers", Icon: Store },
  { id: "buyers", label: "Buyers", Icon: ShoppingBag },
  { id: "creators", label: "Creators", Icon: FiUsers },
] as const;

type AudienceId = (typeof audienceLinks)[number]["id"];

/**
 * The audience tab belongs to the seller → buyer → creator journey, not to the
 * page, so it lives inside the journey wrapper and is sticky *within* it
 * rather than fixed to the viewport.
 *
 * That one change gives the whole lifecycle for free: the tab cannot appear
 * before the journey scrolls in, it holds the viewport bottom for as long as
 * the wrapper is taller than the space below it, and the wrapper's own bottom
 * edge releases it so creators carries it up and out. Nothing fades on its
 * own, nothing is pinned over the FAQ, and reversing the scroll reverses the
 * whole thing because it is all layout rather than scripted state.
 *
 * Two things still need script: which audience is current, and the tab's own
 * height — the negative top margin has to cancel it exactly or the wrapper
 * would grow by a tab's worth of empty ground between creators and the FAQ.
 */
export default function AudienceNavigation() {
  const navRef = useRef<HTMLElement>(null);
  const journey = useAudienceJourney();
  const [activeAudience, setActiveAudience] = useState<AudienceId>("sellers");
  const [isVisible, setIsVisible] = useState(false);

  // Which audience is current comes from the scroll controller, which knows
  // exactly which panel holds the screen. It used to come from an observer
  // over the three sections, and that was wrong after a jump: the panels are
  // four viewports tall and overlap, so their intersection ratios are close,
  // and the observer only ever compared the entries in one callback batch.
  // Tapping a tab landed on the right section under the wrong label.
  useEffect(
    () =>
      journey?.subscribeActive((id) => {
        // The controller drives every pinned section on the page, the FAQ
        // included, so only the ids this bar knows about are its own. Anything
        // else means the journey is over and the last audience should stand —
        // taking "faq" here left no tab current and shrank the bar.
        if (audienceLinks.some((link) => link.id === id)) {
          setActiveAudience(id as AudienceId);
        }
      }),
    [journey]
  );

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    // The tab reserves no ground of its own: it is pulled back over the last
    // of creators by exactly its own height, so releasing it cannot open a gap.
    const sizeObserver = new ResizeObserver(([entry]) => {
      nav.style.setProperty(
        "--audience-nav-h",
        `${entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height}px`
      );
    });
    sizeObserver.observe(nav);

    // Presence is tied to the wrapper, not to any one section, so the tab
    // arrives once sellers is genuinely on screen and stays put for the whole
    // journey. On the way out it is already scrolling away with creators
    // before this can go false, so it never reads as an independent fade.
    const wrapper = nav.closest<HTMLElement>("[data-audience-journey]");
    const presenceObserver = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "0px 0px -38% 0px", threshold: 0 }
    );
    if (wrapper) presenceObserver.observe(wrapper);

    return () => {
      sizeObserver.disconnect();
      presenceObserver.disconnect();
    };
  }, []);

  return (
    <nav
      aria-label="Explore by audience"
      className={styles.audienceNavigation}
      data-visible={isVisible ? "true" : "false"}
      ref={navRef}
    >
      <div className={styles.audienceLinks}>
        {audienceLinks.map(({ id, label, Icon }) => (
          <a
            aria-current={activeAudience === id ? "location" : undefined}
            className={styles.audienceLink}
            href={`#${id}`}
            key={id}
            onClick={(event) => {
              if (!journey) return;
              // The controller scrolls to the panel's settled position, so a
              // tap arrives the same way scrolling does — smoothly, and
              // without leaving a fragment in the address bar.
              event.preventDefault();
              journey.scrollToPanel(id);
            }}>
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </a>
        ))}
      </div>

      {activeAudience === "sellers" ? (
        <Link className={styles.audienceAction} href="/signup">Start selling</Link>
      ) : (
        <span className={styles.audienceAction} aria-disabled="true">
          {activeAudience === "buyers" ? "Explore stores" : "Creator tools"}
          {/* On a phone the status shrinks to the clock; the word stays in the
              accessible name rather than being dropped with it. */}
          <small className={styles.audienceActionStatus}>
            <Clock className={styles.audienceActionClock} size={12} aria-hidden="true" />
            <span>{activeAudience === "buyers" ? "Soon" : "Later"}</span>
          </small>
        </span>
      )}
    </nav>
  );
}
