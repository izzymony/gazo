"use client";

import type { RefObject } from "react";
import styles from "../MarketingSite.module.css";

type SlideProgressProps = {
  readonly index: number;
  /** One per slide, used as the button's accessible name. */
  readonly labels: readonly string[];
  readonly onSelect: (index: number) => void;
  readonly railRef: RefObject<HTMLDivElement>;
};

/**
 * The two-segment indicator above each audience asset — Figma 14:2802:
 * 160px wide, two 76x4 bars with an 8px gap, white at rest over white/20%.
 *
 * The active bar fills with the reader's progress through the pinned section.
 * That value arrives as the `--slide-fill` custom property written by
 * useSlideshow, so scrolling never re-renders this component.
 */
export default function SlideProgress({
  index,
  labels,
  onSelect,
  railRef,
}: SlideProgressProps) {
  return (
    <div className={styles.slideProgress} ref={railRef}>
      {labels.map((label, slot) => (
        <button
          aria-current={slot === index || undefined}
          aria-label={label}
          className={styles.slideProgressStep}
          key={label}
          onClick={() => onSelect(slot)}
          type="button"
        >
          <span
            className={styles.slideProgressFill}
            data-state={slot === index ? "active" : slot < index ? "done" : "todo"}
          />
        </button>
      ))}
    </div>
  );
}
