"use client";

import { ReactNode } from "react";
import AuthSplitShell, { type AuthSplitAction, type AuthSplitMedia } from "../AuthSplitShell";
import usePageVisible from "../common/usePageVisible";
import usePrefersReducedMotion from "../common/usePrefersReducedMotion";
import AuthSceneCaption from "./AuthSceneCaption";
import AuthSceneMedia from "./AuthSceneMedia";
import useSceneRotation from "./useSceneRotation";
import type { AuthScene } from "./authScene";

export interface AuthSceneControllerProps {
  scenes: readonly AuthScene[];
  /**
   * Auto-advance. `false` shows one static scene with no dots and no pause
   * control — which is what every progressive form step shows, not a special
   * case with its own code path.
   */
  rotate?: boolean;
  /**
   * Content-column copy that must sit ABOVE the mobile caption: the desktop
   * wordmark and the page's fixed heading.
   *
   * It is a slot rather than part of `children` because the mobile caption
   * goes between the two, and the caption is this component's to place — the
   * app cannot receive it without also receiving the scene state, which is the
   * thing that must not be handed out.
   */
  lead?: ReactNode;
  children: ReactNode;
  header?: ReactNode;
  footerAction?: ReactNode;
  mediaOn?: AuthSplitMedia;
  actionMode?: AuthSplitAction;
  contentClassName?: string;
}

/**
 * The auth slideshow, entire: one index, one timer, one media renderer.
 *
 * ```text
 * AuthSceneController          one index, one timer
 * └── AuthSplitShell
 *     ├── media slot
 *     │   ├── AuthSceneMedia   active + outgoing layers only
 *     │   └── AuthSceneCaption variant="panel"  — hidden below md
 *     └── content column
 *         ├── lead            wordmark + fixed heading
 *         ├── AuthSceneCaption variant="column" — hidden at md+
 *         └── children        form, actions, copy
 * ```
 *
 * It sits ABOVE `AuthSplitShell` and renders it, rather than inside its media
 * slot, because `media` and `children` are separate props: a component mounted
 * in the media slot cannot reach the content column, and the media wrapper
 * clips overflow, so the mobile caption could not be placed from there.
 *
 * What is shared and what is duplicated is the point. Shared: the index, the
 * timer and the image renderer. Duplicated: a small block of text and its dots,
 * at two positions, only one of which is displayed.
 * The system this replaces had it the other way round — two complete slideshow
 * subtrees under `md:hidden` / `hidden md:flex`, both mounted, two controllers
 * running, all three backgrounds fetched twice with `priority`.
 *
 * ## The four guarantees, and where each one is
 *
 *  - **Timer only on the landing** — `enabled: rotate`, and only the landing
 *    passes `rotate`. A form step renders a static scene.
 *  - **No timer on a mobile progressive step** — the same flag; and the pane
 *    itself is never mounted there, because those screens pass
 *    `mediaOn="desktop"`.
 *  - **Cleanup on a loading or redirect return** — the page returns a `Loader`
 *    instead of this subtree, so the controller unmounts and
 *    `useSceneRotation`'s effect cleanup is the whole teardown. There is no
 *    handle held anywhere else.
 *  - **One image request policy** — `AuthSceneMedia` is rendered exactly once
 *    and mounts at most two layers.
 */
export default function AuthSceneController({
  scenes,
  rotate = false,
  lead,
  children,
  header,
  footerAction,
  mediaOn = "always",
  actionMode = "landing",
  contentClassName,
}: AuthSceneControllerProps) {
  const reducedMotion = usePrefersReducedMotion();
  const pageVisible = usePageVisible();

  const { index, outgoing, goTo } = useSceneRotation({
    count: scenes.length,
    enabled: rotate,
    // Reduced motion stops the auto-advance, and no CSS rule can do that:
    // content changing on its own is motion whatever the transition duration
    // is. It is now the ONLY thing that stops it — the visible pause control
    // was removed by product decision, and `AuthSceneCaption`'s docblock
    // records the SC 2.2.2 consequence. Page visibility suspends separately,
    // without being a mechanism a viewer can reach.
    paused: reducedMotion || !pageVisible,
  });

  // Absent for a static scene. Its absence is what removes the dots from both
  // captions — one flag, not a `showControls` prop that could disagree with
  // whether anything is actually rotating.
  const onSelect = rotate && scenes.length > 1 ? goTo : undefined;

  const captionProps = { scenes, index, onSelect };

  return (
    <AuthSplitShell
      mediaOn={mediaOn}
      actionMode={actionMode}
      header={header}
      footerAction={footerAction}
      contentClassName={contentClassName}
      // The panel holds real copy now, so the pane cannot be `aria-hidden`:
      // that attribute cannot be undone by a descendant. The decorative parts
      // inside declare themselves individually instead — `alt=""` on the
      // photographs, `aria-hidden` on the overlay layer.
      mediaLive
      media={
        // `scene-ground` so the pane is the artwork's own average colour from
        // its first painted frame, rather than a white hole until the
        // photograph arrives.
        <div className="scene-ground relative h-full w-full">
          <AuthSceneMedia scenes={scenes} index={index} outgoing={outgoing} />

          {/* Inset from the pane's own edges, matching the shell's padding
              step. `hidden` below `md`, where this copy lives in the content
              column instead — so exactly one of the two is ever displayed, and
              `display: none` keeps the other out of the accessibility tree
              too. */}
          <div className="pointer-events-none absolute inset-x-6 bottom-6 hidden md:block lg:inset-x-8 lg:bottom-8">
            <AuthSceneCaption
              {...captionProps}
              variant="panel"
              // Re-enabled here: the wrapper is inert so the caption cannot
              // swallow clicks meant for nothing, but its own controls must
              // still be operable.
              className="pointer-events-auto max-w-md"
            />
          </div>
        </div>
      }>
      {/* One flex item below `md`, `contents` at `md+` — and that is load-bearing,
          not tidying.

          The content column is `flex flex-col gap-4`. `lead` and the caption as
          two separate children would take TWO gaps where the caption alone used
          to take one, and because `lead` has no height on mobile (its wordmark
          is `hidden` and its heading `sr-only`) the extra 16px would land as a
          pure downward shift of the caption and everything under it. Measured:
          the caption moved 422 → 438 and the first action 556 → 638.

          Grouping them costs one wrapper and restores the child count exactly.
          At `md` the wrapper dissolves, so `lead` is a direct column child
          again and the caption — `md:hidden` there — is not in the way. */}
      <div className="md:contents">
        {lead}

        {/* Mobile only, and present only where the mobile artwork band is —
            `mediaOn="always"` is exactly the landing. A progressive step's
            content column is the form and nothing else. */}
        {mediaOn === "always" && (
          <AuthSceneCaption {...captionProps} variant="column" className="md:hidden" />
        )}
      </div>

      {children}
    </AuthSplitShell>
  );
}
