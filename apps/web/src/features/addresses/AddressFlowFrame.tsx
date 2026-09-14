"use client";

import React from "react";
import { useRouter } from "next/navigation";
import PageShell from "@vibaar/ui/PageShell";
import Header from "@vibaar/ui/common/Header";
import ResponsiveRouteDialog from "@vibaar/ui/common/ResponsiveRouteDialog";

export interface AddressFlowFrameProps {
  /** Render as the intercepted dialog rather than the canonical page. */
  dialog?: boolean;
  title: string;
  /** The commit control. The frame decides where it goes; the screen decides what it is. */
  action?: React.ReactNode;
  children: React.ReactNode;
  onClose?: () => void;
}

/**
 * One screen, two presentations: the canonical page and the intercepted dialog.
 *
 * WHY A FRAME RATHER THAN TWO COMPONENTS. Checkout's address screens are large
 * and stateful — a selection list that clears stale shipping quotes, a form that
 * branches on guest versus signed-in and on `?from=profile`. Writing a dialog
 * version of either means a second copy of that logic, and the two would answer
 * differently within a release. Here the screen is written once and passes its
 * body and its action to this, which supplies either a `PageShell` or a
 * `ResponsiveRouteDialog` around them.
 *
 * The screens do not know which one they are in, and neither one owns routing:
 * both dismiss through the same `onClose`, defaulting to unwinding the push that
 * opened them.
 */
export default function AddressFlowFrame({
  dialog = false,
  title,
  action,
  children,
  onClose,
}: AddressFlowFrameProps) {
  const router = useRouter();
  const dismiss = onClose ?? (() => router.back());

  if (dialog) {
    return (
      <ResponsiveRouteDialog title={title} onClose={dismiss} footer={action}>
        {children}
      </ResponsiveRouteDialog>
    );
  }

  return (
    <PageShell
      header={<Header onBack={dismiss} title={title} />}
      footerAction={action}>
      {children}
    </PageShell>
  );
}
