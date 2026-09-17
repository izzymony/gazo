import type { ReactNode } from "react";
import { AUTH_SCENES, SCENE_IMAGE_SIZES } from "@/features/auth/authScenes";

/**
 * The first scene's artwork, discovered at parse time instead of after React
 * hydrates.
 *
 * ## Why this cannot be a `<link rel="preload">`
 *
 * Server-rendered discovery was the preferred answer and it is not reachable
 * here. These routes are statically prerendered and **one document serves every
 * query string**, so any `<link>` or `<img>` in that HTML is discovered on
 * `/signin?step=1` exactly as it is on `/signin` — which is the defect
 * `useIsHydrated` exists to prevent, measured at 16 scene requests down to 0 on
 * a phone opening a password step. In production the document contains no page
 * content at all (a ~20KB shell, zero `<img>`), because the routes already
 * deopt to client rendering through an unguarded `useSearchParams()`. So there
 * is nothing to make discoverable without first making the route dynamic, and
 * static rendering is on the preserve-exactly list.
 *
 * Only something running on the client can see `?step=`, and the only thing
 * that runs before the bundles are parsed is an inline script. That is the
 * whole justification; it is a fallback, not a preference.
 *
 * The real fix is routing: give the steps their own paths (`/signin/verify`) so
 * each gets its own document. That is a refactor, not a performance patch.
 *
 * ## Why this is safe here
 *
 * Verified: no Content-Security-Policy exists anywhere in this app — no
 * `headers()` in `next.config.mjs`, no `_headers`, nothing in
 * `wrangler.jsonc` — so `script-src` cannot block it, and
 * `dangerouslySetInnerHTML` already has three JSON-LD precedents in this app.
 *
 * `next/script strategy="beforeInteractive"` cannot do this: Next only
 * supports it in the ROOT layout, so it could not be scoped to `(auth)`. A
 * middleware `Link:` header cannot either — `src/middleware.ts` does not match
 * these routes, WebKit does not honour HTTP preload, and the header would have
 * to vary on a query the document does not.
 *
 * ## The two things that keep it honest
 *
 * The URL comes from the scene data, never a literal, so it cannot drift from
 * what `AuthSceneMedia` requests — and a mismatch would not be silent: it
 * downloads the file twice and logs "preloaded using link preload but not used
 * within a few seconds". That is why the test asserts exactly ONE request
 * rather than merely that a preload happened.
 *
 * It does not fire on a client-side navigation into these routes, because React
 * does not execute a script it renders after hydration. That is the right
 * trade: a soft navigation already has the bundle, and it is the cold document
 * load that was slow.
 */
const PRELOAD_FIRST_SCENE = `(function(){try{
if(/[?&]step=/.test(location.search))return;
var l=document.createElement("link");
l.rel="preload";l.as="image";l.type="image/webp";
l.href=${JSON.stringify(AUTH_SCENES[0]!.image.src)};
l.setAttribute("imagesrcset",${JSON.stringify(AUTH_SCENES[0]!.image.srcSet)});
l.setAttribute("imagesizes",${JSON.stringify(SCENE_IMAGE_SIZES)});
l.setAttribute("fetchpriority","high");
document.head.appendChild(l);
}catch(e){}})()`;

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {/* eslint-disable-next-line react/no-danger */}
      <script dangerouslySetInnerHTML={{ __html: PRELOAD_FIRST_SCENE }} />
      {children}
    </>
  );
}
