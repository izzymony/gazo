"use client";

import { useRouter } from "next/navigation";

/**
 * Minimal client island (P7) — wraps arbitrary (server-rendered) children in a
 * clickable element that calls `router.back()`. Lets an otherwise-static page
 * (privacy / terms) stay a Server Component while isolating the ONE bit of
 * interactivity — the back button — into this tiny client boundary. The children
 * (e.g. the back-arrow SVG) render on the server and pass through unchanged.
 */
export default function BackOnClick({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <div className={className} onClick={() => router.back()}>
      {children}
    </div>
  );
}
