"use client";

import { Minus, Plus } from "@vibaar/ui/icons";
import Image from "next/image";
import { useId, useState } from "react";
import { useAudienceScene } from "../components/AudienceJourney";
import { marketingContent } from "../content";
import styles from "../MarketingSite.module.css";

/**
 * FAQ — Figma 14:2572.
 *
 * The design renders questions as outgoing chat bubbles and answers as
 * incoming ones, which is the page's organising idea: the brand answering
 * you in the DMs. That visual has no equivalent in the product primitives,
 * so this is deliberately app-local (see WEBSITE-V2-REBUILD.md — marketing
 * components may be custom where shared components do not fit).
 *
 * Layout follows the source exactly: a 40px toggle sits 24px to the LEFT of
 * each question bubble (14:2597 / 14:2599) rather than inside it, and the
 * answer pairs a 60px avatar with a left-aligned bubble (14:2602 / 14:2610).
 * One question is open at a time; 14:2595 is the only group in the source
 * whose answer is visible, the rest are hidden.
 *
 * The metaphor is visual only. Underneath it is a real tablist plus real
 * disclosure buttons, so keyboard and screen-reader behaviour survive it.
 */
/** Share of a viewport one question holds the screen for. */
const FAQ_STRIDE = 0.6;

export default function FaqSection() {
  const { faq } = marketingContent;
  const baseId = useId();
  const [activeGroup, setActiveGroup] = useState<string>(faq.groups[0].id);

  const group = faq.groups.find((g) => g.id === activeGroup) ?? faq.groups[0];

  /*
   * The FAQ is a pinned step-through, like the audience panels above it. It
   * used to open questions from an observer while the page carried on
   * scrolling underneath, so two movements ran at once and neither finished.
   * Here the page holds while the reader moves through the questions, and one
   * question is open per step — the scroll position IS the open question, so a
   * click and a scroll can never disagree.
   *
   * A question is a line to read rather than a scene to take in, so each step
   * costs well under a viewport.
   */
  const { index, sectionRef, select } = useAudienceScene(
    group.items.length,
    FAQ_STRIDE
  );
  const openIndex = Math.min(index, group.items.length - 1);

  const selectGroup = (id: string) => {
    setActiveGroup(id);
    // Back to the first question of the new set, so the step the reader is
    // standing on still means something.
    select(0);
  };

  // Roving arrow-key movement across the tabs, as a tablist is expected to have.
  const onTabKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = faq.groups.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    selectGroup(faq.groups[next].id);
    document.getElementById(`${baseId}-tab-${faq.groups[next].id}`)?.focus();
  };

  return (
    <section
      className={`${styles.faqPanel} ${styles.faqSection}`}
      data-node-id="14:2572"
      data-steps={group.items.length}
      id="faq"
      ref={sectionRef}
    >
      <div className={styles.faqPin} data-panel-pin>
      <div className={styles.faqInner}>
        {/* 14:2583 — heading only; the source's supporting line (14:2585) is
            switched off in the design, so it is not rendered here. */}
        <header className={styles.faqHeader} data-reveal="false">
          <h2>{faq.title}</h2>
        </header>

        <div
          aria-label="Choose who you are"
          className={styles.faqTabs}
          role="tablist"
        >
          {faq.groups.map((tab, index) => {
            const selected = tab.id === activeGroup;
            return (
              <button
                aria-controls={`${baseId}-panel-${tab.id}`}
                aria-selected={selected}
                className={styles.faqTab}
                data-selected={selected || undefined}
                id={`${baseId}-tab-${tab.id}`}
                key={tab.id}
                onClick={() => selectGroup(tab.id)}
                onKeyDown={(event) => onTabKeyDown(event, index)}
                role="tab"
                tabIndex={selected ? 0 : -1}
                type="button"
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          aria-labelledby={`${baseId}-tab-${group.id}`}
          className={styles.faqThread}
          id={`${baseId}-panel-${group.id}`}
          role="tabpanel"
          tabIndex={0}
        >
          {group.items.map((item, slot) => {
            const key = String(slot);
            const isOpen = openIndex === slot;
            return (
              <div className={styles.faqItem} key={item.q}>
                {/* 14:2596 — the whole row is the control, so the toggle and
                    the bubble are one target rather than two. */}
                <h3 className={styles.faqQuestionRow}>
                  <button
                    aria-expanded={isOpen}
                    aria-controls={`${baseId}-answer-${group.id}-${key}`}
                    className={styles.faqQuestion}
                    id={`${baseId}-question-${group.id}-${key}`}
                    onClick={() => select(slot)}
                    type="button"
                  >
                    <span className={styles.faqToggle} aria-hidden="true">
                      {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                    </span>
                    <span className={styles.faqBubble}>{item.q}</span>
                  </button>
                </h3>

                {/* 14:2601. The answer collapses by animating a grid row from
                    0fr to 1fr, so it opens to its own height without one being
                    measured in JS. `visibility` carries the a11y side: it flips
                    to visible instantly on open and only hides once the collapse
                    has finished, keeping the answer out of the tab order and the
                    accessibility tree while closed. */}
                <div
                  aria-labelledby={`${baseId}-question-${group.id}-${key}`}
                  className={styles.faqAnswerWrap}
                  data-open={isOpen || undefined}
                  id={`${baseId}-answer-${group.id}-${key}`}
                  role="region"
                >
                  <div className={styles.faqAnswerRow}>
                    <span className={styles.faqAvatar} aria-hidden="true">
                      <Image
                        alt=""
                        height={26}
                        src="/brand/icon-black.svg"
                        width={26}
                      />
                    </span>
                    <p className={styles.faqAnswer}>{item.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </section>
  );
}
