import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal OpenNext → Cloudflare config for staging. Defaults (in-worker cache,
// no R2/KV/D1 bindings) are fine for a functional staging deploy; add an
// incremental cache (R2) later if ISR/on-demand revalidation needs persistence.
export default defineCloudflareConfig({});
