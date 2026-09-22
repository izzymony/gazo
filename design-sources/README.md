# Design sources

Masters for artwork that ships in a derived form — the original a webp or svg
was encoded from. Nothing here is served or bundled.

**It is deliberately not under `apps/web/public/`.** That directory is served,
so a master sitting there is publicly fetchable and deployed even when no code
references it: the two welcome PNGs were 3MB of exactly that, reachable at
`/images/…` and shipped to production for nothing.

Keep a master here when the shipped asset is a re-encode and the original would
otherwise be unrecoverable — a different size, crop or format cannot be derived
from a compressed derivative without loss.

| Source | Ships as | Encoded with |
|---|---|---|
| `welcome/welcome-hero.png` (1448×1086) | `apps/web/public/images/welcome-bg-v3.webp` (1440w, q80, 71KB) | sharp |

## welcome/welcome-hero.png

The `/welcome` hero. Carries **no baked fade** — verified by sampling: its
bottom rows stay chromatic (saturation 31–39) and never reach white
(`min(r,g,b)` plateaus around 207).

That matters, because the fade belongs to the layout, not the artwork: mobile
draws a CSS gradient at the band's seam and desktop draws none. An asset with
the fade painted in only works for one crop — the superseded v2 had 253 pure
white rows, 23% of its height, which would have sat in the middle of the
desktop pane. It is archived outside this repo at
`myInstaShop/design-archive/welcome/`.
