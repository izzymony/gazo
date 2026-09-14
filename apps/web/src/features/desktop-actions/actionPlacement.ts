/**
 * Where every route's primary action goes on a desktop.
 *
 * THE RULE. At `lg` and above, no page CTA is viewport-fixed, content-wide, or
 * horizontally centred. A full-width bar welded to the bottom of a 1440px window
 * is a phone layout that nobody re-examined; it puts the commit a thousand pixels
 * from the field that produced it and stretches one button across a column meant
 * to hold six.
 *
 * WHY THIS IS CODE AND NOT A DOCUMENT. The classification below started life in a
 * plan, and a plan is read once and then drifts — within days, going by this
 * repo's own audit history. A registry with a test that walks it in BOTH
 * directions cannot drift: add a route without classifying it and the suite
 * fails; classify a route that does not exist and the suite fails; add an action
 * surface the registry has never heard of and the suite fails.
 *
 * It is deliberately keyed by route TEMPLATE, matching `SELLER_NAV_POLICY` and
 * `BUYER_NAV_POLICY`, so the same `:param` spelling reads the same way across all
 * three and one walker can check them all.
 */

/**
 * `header` — the action sits in the page's title row at lg and in the mobile
 *   action bar below it, rendered ONCE and moved by grid placement. Compact; no
 *   width floor.
 *
 * `inline` — a constrained, right-aligned row. Not full-width and not centred: a
 *   page action stretched across a 1280px column is the desktop equivalent of the
 *   bar this work removes. Carries the 160–200px floor, because a "Save" hugging
 *   its label reads as incidental next to the content it commits.
 *
 * `dialog` — a route-backed dialog over the page that opened it, with the same URL
 *   still resolving to a full page when pasted or reloaded. Buttons are intrinsic.
 *
 * `aside` — a bounded panel in a second column, beside the content it acts on.
 *   A panel action may fill its panel.
 *
 * `anchored-input` — NOT a CTA. A message composer anchored to the foot of a
 *   thread, which is an input. The one category that may look like a bottom bar,
 *   and the reason it is named: so that a bottom bar cannot be filed under it by
 *   accident. Only ChatThreadScreen qualifies.
 *
 * `none` — the route has no page-level action. Not "not done yet": no action
 *   exists, and inventing one is out of scope.
 */
export type ActionPlacement =
  | "header"
  | "inline"
  | "dialog"
  | "aside"
  | "anchored-input"
  | "none";

/** Who owns the surface. `auth` routes are another agent's and are not modified here. */
export type PlacementOwner = "app" | "auth";

export interface PlacementEntry {
  placement: ActionPlacement;
  owner?: PlacementOwner;
  /** Why, when the answer is not obvious from the route name. */
  note?: string;
}

export const ACTION_PLACEMENT: ReadonlyArray<readonly [string, PlacementEntry]> = [
  // ─── buyer (26) ────────────────────────────────────────────────────────────
  ["/:handle", { placement: "none" }],
  [
    "/:handle/p/:slugAndId",
    {
      placement: "aside",
      note: "Purchase panel in the product's second column, stacked with the variants and delivery it commits. Was an `absolute` content-wide centred bar — compliant to any check that greps for `fixed`, and the exact defect the rule names.",
    },
  ],
  ["/cart", { placement: "inline", note: "Summary row below the tabs and above the list." }],
  ["/cart/complete-order/review", { placement: "aside", note: "Order summary panel." }],
  ["/cart/order-confirmed/:id", { placement: "inline" }],
  ["/cart/payment-successful", { placement: "inline" }],
  ["/cart/shipping-profile", { placement: "dialog", note: "Family 5 — checkout address." }],
  ["/cart/shipping-profile/new", { placement: "dialog", note: "Family 5. Context-dependent: ?from=profile changes where it returns to." }],
  ["/inbox", { placement: "none" }],
  [
    "/inbox/message/:messageId",
    { placement: "anchored-input", note: "ChatThreadScreen's composer. An input, not a CTA." },
  ],
  ["/notification", { placement: "none" }],
  ["/orders", { placement: "none" }],
  ["/orders/:orderId", { placement: "none" }],
  ["/profile", { placement: "none" }],
  ["/profile/edit-profile", { placement: "header" }],
  [
    "/profile/new-address",
    {
      placement: "dialog",
      note: "Family 6. NOT converted: no screen links here, so there is no navigation to intercept. Its canonical page meets the rule through the shell fallback.",
    },
  ],
  ["/profile/referrals", { placement: "inline" }],
  ["/profile/settings", { placement: "none" }],
  ["/profile/settings/change-password", { placement: "dialog", note: "Family 4, second route of one component." }],
  ["/profile/shipping-address", { placement: "header", note: "Add Address in the page header." }],
  ["/profile/shipping-address/edit", { placement: "dialog", note: "Family 6." }],
  ["/profile/support", { placement: "none" }],
  ["/sharespotlights", { placement: "none" }],
  ["/shop", { placement: "none" }],
  ["/shop/recently-viewed", { placement: "none" }],
  ["/shop/spotlights", { placement: "none" }],

  // ─── seller (33) ───────────────────────────────────────────────────────────
  ["/dashboard", { placement: "none" }],
  ["/dashboard/analytics", { placement: "none" }],
  ["/dashboard/catalog", { placement: "none" }],
  ["/dashboard/catalog/discount/new", { placement: "header" }],
  ["/dashboard/catalog/product/:productId", { placement: "none" }],
  ["/dashboard/catalog/product/create", { placement: "none" }],
  ["/dashboard/catalog/product/create/manual", { placement: "none" }],
  ["/dashboard/catalog/product/create/manual/edit/:productId", { placement: "header", note: "Button group: Cancel + Update." }],
  ["/dashboard/catalog/product/create/manual/new", { placement: "header", note: "Steps in their own row, plus the preview overlay." }],
  ["/dashboard/inbox", { placement: "none" }],
  ["/dashboard/inbox/:conversationId", { placement: "anchored-input", note: "The same ChatThreadScreen as the buyer thread." }],
  ["/dashboard/notification", { placement: "none" }],
  ["/dashboard/orders", { placement: "none" }],
  ["/dashboard/orders/:orderId", { placement: "header", note: "Action beside the support control, which stays header chrome." }],
  ["/dashboard/payouts", { placement: "header", note: "Add account." }],
  ["/dashboard/payouts/addaccount", { placement: "dialog", note: "Family 2 — creation and OTP as two steps in one dialog." }],
  ["/dashboard/payouts/withdraw", { placement: "inline", note: "Four states on one route." }],
  ["/dashboard/settings", { placement: "none" }],
  ["/dashboard/settings/billing", { placement: "none", note: "The section action is a TRIGGER, not a commit. No fifth placement." }],
  ["/dashboard/settings/billing/add-card", { placement: "dialog", note: "Family 3. Layout lands; submission is broken upstream and stays broken." }],
  ["/dashboard/settings/change-password", { placement: "dialog", note: "Family 4 — the pilot." }],
  ["/dashboard/settings/security", { placement: "none" }],
  ["/dashboard/storefront", { placement: "none" }],
  ["/dashboard/storefront/address", { placement: "header" }],
  ["/dashboard/storefront/create", { placement: "header", note: "Steps 1-2 in the header. Step 3's success screen has no header to lift an action into and keeps the bar, which the shell's desktop fallback handles." }],
  ["/dashboard/storefront/customise", { placement: "header" }],
  ["/dashboard/storefront/details", { placement: "header" }],
  ["/dashboard/storefront/shipping", { placement: "header", note: "Uses the band's status slot for the unsaved-changes notice." }],
  ["/dashboard/transactions", { placement: "none" }],
  ["/dashboard/transactions/summary", { placement: "none", note: "No action exists today; do not invent one." }],
  ["/dashboard/wallet", { placement: "none" }],
  ["/dashboard/wallet/settings", { placement: "none" }],
  ["/setup", { placement: "none" }],

  // ─── account / auth / marketing (11) ───────────────────────────────────────
  ["/verify", { placement: "inline", note: "KYC — seven surfaces on one route." }],
  [
    "/signup/social-auth",
    {
      placement: "inline",
      note: "Legacy route auth deliberately did not redesign. Reaches the rule through the shared shell fallback, which satisfies the classification without editing an auth screen component.",
    },
  ],
  ["/welcome", { placement: "inline", owner: "auth" }],
  ["/signin", { placement: "inline", owner: "auth", note: "Valid states render in AuthSplitShell's left pane. Invalid/legacy states fall through to PageShell and inherit its desktop fallback." }],
  ["/signup", { placement: "inline", owner: "auth" }],
  ["/forgot-password", { placement: "inline", owner: "auth" }],
  ["/", { placement: "none" }],
  ["/about", { placement: "none" }],
  ["/careers", { placement: "none" }],
  ["/privacy", { placement: "none" }],
  ["/terms", { placement: "none" }],
];

/**
 * Every file that renders a page-level action, and what it implements.
 *
 * The placement registry above answers "what should this route do"; this answers
 * "which code does it", which is the half that catches drift. A new
 * `footerAction` appearing on a route classified `header` is a silent regression
 * of exactly the kind this work exists to undo — here it fails the suite instead.
 *
 * `markers` are the mechanical evidence: `pageHeader` for a header placement,
 * `footerAction` for the shell bar that the desktop fallback constrains,
 * `ResponsiveRouteDialog` for a route-backed dialog, and `ownBar` for a screen
 * that declares its own responsive action row because the shell cannot place it
 * — today only the cart, whose summary belongs between the tabs and the list.
 * A file may carry more than one, and store-setup legitimately does: its wizard
 * steps are `header` and its success screen keeps a bar.
 */
export interface SurfaceOwner {
  file: string;
  routes: readonly string[];
  markers: readonly ("pageHeader" | "footerAction" | "ResponsiveRouteDialog" | "ownBar")[];
  note?: string;
}

export const SURFACE_OWNERS: readonly SurfaceOwner[] = [
  // ── header placement ──────────────────────────────────────────────────────
  { file: "app/(buyer)/profile/edit-profile/page.tsx", routes: ["/profile/edit-profile"], markers: ["pageHeader"] },
  { file: "app/(buyer)/profile/shipping-address/page.tsx", routes: ["/profile/shipping-address"], markers: ["pageHeader"] },
  { file: "app/(seller)/dashboard/catalog/discount/new/page.tsx", routes: ["/dashboard/catalog/discount/new"], markers: ["pageHeader"] },
  { file: "app/(seller)/dashboard/orders/[orderId]/page.tsx", routes: ["/dashboard/orders/:orderId"], markers: ["pageHeader"] },
  { file: "app/(seller)/dashboard/payouts/view.tsx", routes: ["/dashboard/payouts"], markers: ["pageHeader"] },
  { file: "app/(seller)/dashboard/storefront/address/page.tsx", routes: ["/dashboard/storefront/address"], markers: ["pageHeader"] },
  { file: "app/(seller)/dashboard/storefront/customise/page.tsx", routes: ["/dashboard/storefront/customise"], markers: ["pageHeader"] },
  { file: "app/(seller)/dashboard/storefront/details/page.tsx", routes: ["/dashboard/storefront/details"], markers: ["pageHeader"] },
  { file: "app/(seller)/dashboard/storefront/shipping/page.tsx", routes: ["/dashboard/storefront/shipping"], markers: ["pageHeader"] },
  { file: "features/product-setup/edit/EditProductSetup.tsx", routes: ["/dashboard/catalog/product/create/manual/edit/:productId"], markers: ["pageHeader"] },
  {
    file: "features/product-setup/manual/Preview.tsx",
    routes: ["/dashboard/catalog/product/create/manual/new"],
    markers: ["pageHeader"],
    note: "An overlay on the wizard's last step rather than a route of its own.",
  },
  { file: "features/product-setup/progressive/ProgressiveProductSetup.tsx", routes: ["/dashboard/catalog/product/create/manual/new"], markers: ["pageHeader"] },
  {
    file: "features/store-setup/index.tsx",
    routes: ["/dashboard/storefront/create"],
    markers: ["pageHeader", "footerAction"],
    note: "BOTH, legitimately: steps 1-2 put their action in the header, and step 3's success screen has no header to lift one into, so it keeps the bar the shell's fallback constrains.",
  },

  // ── inline placement, served by the shell's desktop fallback ───────────────
  { file: "app/(account)/verify/component/KycFlow.tsx", routes: ["/verify"], markers: ["footerAction"], note: "Seven surfaces on one route." },
  {
    file: "app/(buyer)/cart/page.tsx",
    routes: ["/cart"],
    markers: ["ownBar"],
    note: "Owns its own responsive row rather than a shell `footerAction`: at lg the summary sits under the tabs and above the list, which the shell cannot place. Last in the DOM, lifted into row 2 by the grid so the checkout button is not announced before the cart.",
  },
  { file: "app/(buyer)/profile/referrals/page.tsx", routes: ["/profile/referrals"], markers: ["footerAction"] },
  { file: "features/auth/signup/SocialAuth.tsx", routes: ["/signup/social-auth"], markers: ["footerAction"] },
  { file: "features/payouts/withdraw.tsx", routes: ["/dashboard/payouts/withdraw"], markers: ["footerAction"] },
  { file: "features/payouts/confirm.tsx", routes: ["/dashboard/payouts/withdraw"], markers: ["footerAction"] },
  { file: "features/payouts/details.tsx", routes: ["/dashboard/payouts/withdraw"], markers: ["footerAction"], note: "Renders nothing for a non-refund transaction." },
  { file: "features/payouts/withdrawalInitiated.tsx", routes: ["/dashboard/payouts/withdraw"], markers: ["footerAction"] },

  // ── aside placement ───────────────────────────────────────────────────────
  {
    file: "app/(buyer)/cart/complete-order/review/page.tsx",
    routes: ["/cart/complete-order/review"],
    markers: ["ownBar"],
    note: "Two columns at lg — the order on the left, the money on the right — so Pay Now lives inside the summary panel, which no shell slot can place. Below lg it is the same fixed bar.",
  },
  {
    file: "features/storefront/product/ProductCTA.tsx",
    routes: ["/:handle/p/:slugAndId"],
    markers: [],
    note: "Never a `footerAction`: a hand-rolled bar, which is why the original footer census missed it. Now a bounded panel in the product's aside at lg and the same absolute bar below it.",
  },

  // ── dialog placement ──────────────────────────────────────────────────────
  {
    file: "features/settings/ChangePasswordDialog.tsx",
    routes: ["/dashboard/settings/change-password", "/profile/settings/change-password"],
    markers: ["ResponsiveRouteDialog"],
    note: "One component, two routes.",
  },
  { file: "features/billing/AddCardDialog.tsx", routes: ["/dashboard/settings/billing/add-card"], markers: ["ResponsiveRouteDialog"] },
  {
    file: "features/settings/ChangePasswordScreen.tsx",
    routes: ["/dashboard/settings/change-password", "/profile/settings/change-password"],
    markers: ["footerAction"],
    note: "The canonical page, which is also the direct-URL and hard-refresh fallback for the dialog.",
  },
  {
    file: "app/(seller)/dashboard/settings/billing/add-card/page.tsx",
    routes: ["/dashboard/settings/billing/add-card"],
    markers: ["footerAction"],
    note: "Canonical page / dialog fallback.",
  },
  { file: "app/(buyer)/cart/shipping-profile/page.tsx", routes: ["/cart/shipping-profile"], markers: ["footerAction"], note: "Family 5 — not yet converted; the canonical page meets the rule through the shell fallback." },
  { file: "app/(buyer)/cart/shipping-profile/new/page.tsx", routes: ["/cart/shipping-profile/new"], markers: ["footerAction"], note: "Family 5 — not yet converted." },
  { file: "app/(buyer)/profile/new-address/page.tsx", routes: ["/profile/new-address"], markers: ["footerAction"], note: "Family 6 — no trigger exists, so nothing to intercept." },
  { file: "app/(buyer)/profile/shipping-address/edit/page.tsx", routes: ["/profile/shipping-address/edit"], markers: ["footerAction"], note: "Family 6 — not yet converted." },
  { file: "app/(seller)/dashboard/payouts/addaccount/page.tsx", routes: ["/dashboard/payouts/addaccount"], markers: ["footerAction"], note: "Family 2 — not yet converted." },

  // ── anchored input — not a CTA ─────────────────────────────────────────────
  {
    file: "features/chat/ChatThreadScreen.tsx",
    routes: ["/inbox/message/:messageId", "/dashboard/inbox/:conversationId"],
    markers: ["footerAction"],
    note: "A message composer, not a button and not a CTA bar. One component, two routes. Nothing else may be filed here.",
  },

  // ── auth-owned ────────────────────────────────────────────────────────────
  { file: "app/(auth)/welcome/page.tsx", routes: ["/welcome"], markers: ["footerAction"] },
  { file: "features/auth/signin/SignInOverview.tsx", routes: ["/signin"], markers: ["footerAction"] },
  { file: "features/auth/signup/SignUpOverview.tsx", routes: ["/signup"], markers: ["footerAction"] },
  { file: "features/auth/signin/ForgotPassword.tsx", routes: ["/forgot-password"], markers: ["footerAction"] },
];
