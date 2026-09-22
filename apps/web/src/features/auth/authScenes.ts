import type { AuthScene } from "@vibaar/ui/authScene/authScene";

/**
 * Intrinsic size of all three masters, so the pane can reserve its box.
 *
 * They are one photographic set — same room, same light, same camera — which is
 * the point: the panel crossfades between them, and a change of lens or white
 * balance between scenes reads as a glitch rather than a transition.
 */
const SOURCE_WIDTH = 1448;
const SOURCE_HEIGHT = 1086;

/**
 * ## Focal points
 *
 * All three sources are 4:3 landscape, and every pane is narrower than that —
 * measured: 390×422 for the mobile band, 344×976 at 768, 557×576 at 1024×640,
 * 710×656 at 1280×720, 806×836 at 1440×900. So `cover` fills the HEIGHT and
 * crops the WIDTH nearly everywhere, which makes focal x do the work; focal y
 * only bites on a short, wide window (806×576), where it trims the empty
 * ceiling rather than the products. `y` sits below the midpoint for that
 * reason — the top quarter of each frame is bare wall, and cropping there keeps
 * the podium and the floor reflection that make the set read as one room.
 *
 * The three tiers are chosen by the pane's SHAPE, not its width, because the
 * two narrow panes are almost the same width and crop nothing alike:
 *
 *   mobile   390×422, aspect 0.92 — 69% of the image's width is visible, so
 *            the whole arrangement reads and the focal barely has to choose.
 *   compact  344×976, aspect 0.35 — only 26% of the width is visible. That is
 *            one object, not a scene, so the focal names WHICH object.
 *   desktop  557px and wider — enough room for the full arrangement again.
 *
 * `compact` is therefore pointed at each scene's single subject rather than at
 * the composition's centre, which in that slice would land on empty floor.
 *
 * This is a crop, not a resize. The mobile band keeps `h-auth-band` exactly as
 * it is — the artwork is positioned inside the existing box rather than the box
 * being grown to suit a landscape source.
 *
 * ## Overlay placement
 *
 * Coordinates are fractions of the PANE, and three regions are out of bounds —
 * all three measured, not assumed:
 *
 *  - `y < 0.28` across the middle — the mobile band carries the white wordmark
 *    there, at the same offset it has today.
 *  - `x < 0.6` with `y > 0.52` — the desktop caption is anchored to the pane's
 *    bottom, and on a short window (1024x640, 1440x640) a 576px pane leaves it
 *    starting at y = 0.52. Every secondary sits at 0.38, which clears it.
 *  - `y > 0.74` on mobile — the seam gradient is `h-24` at `z-20`, so it paints
 *    OVER a card rather than behind it.
 *
 * Which is why nothing is placed at the top-centre or the bottom-left, even
 * where the artwork would allow it. Also `x >= 0.05` on any `top-left` anchor:
 * the badge overhangs its card by 8px and the pane is `overflow-hidden`, so at
 * the narrowest 344px pane a smaller x would clip the mark.
 *
 * ## Every scene has its OWN arrangement, on both breakpoints
 *
 * The first version used one layout for all three — primary top-right,
 * secondary top-left, chip in the same corner — and across a crossfade that
 * reads as one template swapping its text rather than as three scenes. Each
 * scene now mirrors or rotates it:
 *
 *   discover  card right-high · card left-mid   · chip right-low
 *   order     card left-high  · card right-mid  · chip right-low
 *   deliver   card left-mid   · card right-low  · chip right-high
 *
 * Deliberate, not random. A shuffled offset would be irreproducible in a
 * capture and could not respect the constraints these have to satisfy — the
 * wordmark, the seam gradient, the caption and each other.
 *
 * Two of those constraints are worth knowing before moving anything. On the
 * split pane both CARDS stay above y≈0.44, because the caption is
 * bottom-anchored at a fixed pixel height so its fractional top runs from 0.52
 * on a 576px-tall pane to 0.67 on an 836px one, and 0.44 clears the shallowest
 * case. Chips sit at x≥0.93 for the same reason: the caption is `max-w-md`, so
 * on a 710px pane it reaches x 0.68.
 *
 * ## The band's coordinates are per scene, not one layout
 *
 * The three photographs put their subject in different places, and a card that
 * sits politely on a podium in one lands on the product in the next. Measured
 * against each render at 390: the secondary card was covering the trainer on
 * `discover` and `order` and the parcel on `deliver`, so its `y` differs per
 * scene (0.57 / 0.60 / 0.60) to drop it onto the podium or the floor instead.
 * The primary and the chip share coordinates because the top band of every
 * frame is bare wall.
 *
 * ## The copy states facts, not guarantees
 *
 * "Payment secured", "Funds released", "Buyer protected" and "protect the
 * payment" all imply a defined escrow, buyer-protection, dispute, refund and
 * automatic-release model. The payment and payout policies are still being
 * revised, so this panel must not promise more than the operational system
 * delivers — an auth screen is the first thing a seller reads and it sets the
 * expectation they will hold the product to.
 *
 * So: "Payment received", "Delivery confirmed", "Earnings updated",
 * "Checkout securely", "Track the order". Each is an observable event. Do not
 * reintroduce `escrow`, `buyer protected`, `funds held` or automatic
 * `funds released` language until the refund, dispute and payout policies
 * support the claim.
 *
 * ## Two cards, and one chip only where it means something
 *
 * Not a ceiling picked for tidiness. This artwork is editorial and already
 * detailed, so a fourth element competes with the scene rather than filling
 * empty space — the retired design's density belonged to flatter photography.
 * The one chip is on `discover`, where "Saved" is the only buyer-side signal in
 * the whole set; the other two scenes are complete with two.
 */

/**
 * The two derivatives, and the layout width that chooses between them.
 *
 * ## Why `sizes` is expressed in numbers above 100vw
 *
 * That looks wrong and is not. The artwork is `object-fit: cover` in a pane
 * narrower than 4:3, so it scales to fill the pane's HEIGHT and is cropped
 * horizontally — which means the RENDERED width is `paneHeight x 4/3`, not the
 * pane's width. Measured:
 *
 *   pane            rendered width   as vw of the viewport
 *   390x422           563px            144vw
 *   344x976  @768    1301px            169vw
 *   557x576  @1024    768px             75vw
 *   806x836  @1440   1115px             77vw
 *
 * Declaring the pane's own width instead would under-state the need by up to
 * 2.4x and the browser would pick a derivative too small to be crisp.
 *
 * ## Why only two widths, and none above 1448
 *
 * The source master is 1448x1086. A larger derivative would be an upscale —
 * more bytes, no more detail — so 1448 is the ceiling until a larger master
 * exists. 1152 is the one that earns its place: the mobile band at DPR2 needs
 * ~1125px, so the phone gets 47KB instead of 65KB.
 */
const SCENE_IMAGE_WIDTHS = [1152, 1448] as const;

export const SCENE_IMAGE_SIZES =
  "(min-width: 1024px) 80vw, (min-width: 768px) 170vw, 145vw";

/** One derivation, used by the image AND by the layout's preload hint. */
export const sceneSrcSet = (slot: string) =>
  SCENE_IMAGE_WIDTHS.map((w) => `/auth/${slot}-${w}.webp ${w}w`).join(", ");

/** The widest derivative: the `src` fallback, and what the preload names. */
export const sceneSrc = (slot: string) => `/auth/${slot}-1448.webp`;

export const AUTH_SCENES: readonly AuthScene[] = [
  {
    id: "discover",
    label: "01 · Discover",
    headline: "Discover products. Share what you sell.",
    description: "Shop independent stores or create a storefront you can share anywhere.",
    image: {
      slot: "auth-discover",
      src: sceneSrc("auth-discover"),
      srcSet: sceneSrcSet("auth-discover"),
      sizes: SCENE_IMAGE_SIZES,
      width: SOURCE_WIDTH,
      height: SOURCE_HEIGHT,
      alt: "A sunlit showroom of pale stone podiums holding a lilac trainer, a yellow leather handbag, a perfume bottle and a potted plant, with a yellow ribbon winding between them.",
      // The goods span the left three-quarters of this frame, so the focal
      // pulls slightly left of centre to keep the trainer in the crop; the
      // desktop pane is wide enough to hold the perfume bottle as well.
      focal: {
        mobile: { x: 0.44, y: 0.58 },
        // The handbag — the only object a 26% slice can hold whole.
        compact: { x: 0.52, y: 0.56 },
        desktop: { x: 0.48, y: 0.56 },
      },
    },
    overlays: [
      {
        // `order` (a bag of goods), not `store` — the card below it is the
        // storefront, and two Store glyphs side by side on one scene read as a
        // duplicated element rather than two facts.
        kind: "event",
        icon: "order",
        title: "New collection",
        value: "12 products",
        tone: "brand",
        badge: "tag",
        placement: {
          x: 0.94,
          y: 0.18,
          anchor: "top-right",
          priority: "primary",
          mobile: { x: 0.96, y: 0.27 },
        },
      },
      {
        // The tile names the SUBJECT and the badge names the state. `confirmed`
        // here put a tick in the tile under a tick in the badge — the same mark
        // twice on one card.
        kind: "status",
        icon: "store",
        title: "Store is live",
        description: "Ready to share",
        tone: "success",
        badge: "check",
        placement: {
          x: 0.06,
          y: 0.36,
          anchor: "top-left",
          priority: "secondary",
          mobile: { x: 0.04, y: 0.57 },
        },
      },
      {
        // A chip, not a card: one word in a card shape was a card carrying a
        // chip's content. `optional`, so it is dropped wherever the pane is
        // under 26rem wide or 38rem tall — the mobile band, the 344px pane at
        // 768, and every short desktop window all show two elements.
        kind: "chip",
        icon: "saved",
        label: "Saved",
        placement: {
          x: 0.95,
          y: 0.6,
          anchor: "bottom-right",
          priority: "optional",
          mobile: { x: 0.34, y: 0.37 },
        },
      },
    ],
  },
  {
    id: "order",
    label: "02 · Order",
    headline: "Turn interest into an order.",
    description: "Give buyers a simple path from product discovery to secure checkout.",
    image: {
      slot: "auth-order",
      src: sceneSrc("auth-order"),
      srcSet: sceneSrcSet("auth-order"),
      sizes: SCENE_IMAGE_SIZES,
      width: SOURCE_WIDTH,
      height: SOURCE_HEIGHT,
      alt: "The same showroom with a lilac trainer on a stone podium beside an open kraft shipping box lined with tissue paper, a yellow gift bag behind them and a ribbon threaded through the scene.",
      // Trainer and shipping box sit either side of centre and both matter —
      // one is the product, the other is the order — so this one stays
      // centred and gives up the outer bag and plant instead.
      focal: {
        mobile: { x: 0.52, y: 0.6 },
        // The shipping box, not the midpoint between it and the trainer —
        // centring there would slice both in half.
        compact: { x: 0.72, y: 0.58 },
        desktop: { x: 0.5, y: 0.58 },
      },
    },
    overlays: [
      {
        kind: "event",
        icon: "order",
        title: "New order",
        value: "₦24,500",
        metadata: "2 items",
        tone: "brand",
        badge: "tag",
        placement: {
          x: 0.06,
          y: 0.16,
          anchor: "top-left",
          priority: "primary",
          mobile: { x: 0.04, y: 0.28 },
        },
      },
      {
        kind: "status",
        icon: "payment",
        title: "Payment received",
        description: "Order confirmed",
        tone: "success",
        badge: "check",
        placement: {
          x: 0.94,
          y: 0.36,
          anchor: "top-right",
          priority: "secondary",
          mobile: { x: 0.96, y: 0.54 },
        },
      },
      {
        // The chip is what gives the mobile band a second element: below 30rem
        // of pane width the secondary card is dropped, and one lone card read
        // as a broken composition rather than a restrained one. It also states
        // one factual state neither card states.
        kind: "chip",
        icon: "secure",
        label: "Checkout securely",
        placement: {
          x: 0.93,
          y: 0.62,
          anchor: "bottom-right",
          priority: "optional",
          mobile: { x: 0.98, y: 0.34 },
        },
      },
    ],
  },
  {
    id: "deliver",
    label: "03 · Deliver",
    headline: "Deliver confidently. Get paid.",
    description:
      "Track orders, confirm delivery, and keep your earnings organized.",
    image: {
      slot: "auth-deliver",
      src: sceneSrc("auth-deliver"),
      srcSet: sceneSrcSet("auth-deliver"),
      sizes: SCENE_IMAGE_SIZES,
      width: SOURCE_WIDTH,
      height: SOURCE_HEIGHT,
      alt: "A sealed kraft parcel with a blank address label resting on a stone podium in the same sunlit room, a yellow ribbon curling around it and a leafy plant in the foreground.",
      // The parcel is the whole subject and sits just right of centre.
      focal: {
        mobile: { x: 0.56, y: 0.56 },
        // The parcel already sits near the centre, so this barely moves.
        compact: { x: 0.55, y: 0.55 },
        desktop: { x: 0.54, y: 0.55 },
      },
    },
    overlays: [
      {
        kind: "status",
        icon: "delivered",
        title: "Delivery confirmed",
        description: "Order complete",
        tone: "success",
        badge: "check",
        placement: {
          x: 0.07,
          y: 0.3,
          anchor: "top-left",
          priority: "primary",
          mobile: { x: 0.04, y: 0.3 },
        },
      },
      {
        kind: "event",
        icon: "payout",
        title: "Earnings updated",
        value: "₦22,800",
        tone: "brand",
        badge: "check",
        placement: {
          x: 0.94,
          y: 0.52,
          anchor: "top-right",
          priority: "secondary",
          mobile: { x: 0.96, y: 0.52 },
        },
      },
      {
        // Same job as the other two chips: an extra element for the band, and
        // a plain statement of what the product does rather than a guarantee
        // about what happens to the money.
        kind: "chip",
        icon: "tracking",
        label: "Track the order",
        placement: {
          x: 0.97,
          y: 0.2,
          anchor: "bottom-right",
          priority: "optional",
          mobile: { x: 0.34, y: 0.62 },
        },
      },
    ],
  },
];

/**
 * The auth landing's heading, and it does not rotate.
 *
 * The panel's scene headline changes every 6.5 seconds; this is what the page
 * is about. Keeping them separate is what lets the form and the actions stay
 * exactly where they are while the artwork tells a three-part story — and it
 * is why the scene headline is a `<p>` and this is the `h1`.
 */
export const AUTH_LANDING_HEADING = "Buy, sell, and grow with Vibaar.";

/** Supporting line. Rendered at `lg+` only, where there is room for it. */
export const AUTH_LANDING_SUPPORT =
  "One account for shopping, selling, and managing every order.";
