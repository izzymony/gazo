#!/usr/bin/env node
/**
 * Refuse to run a production build while a dev server is serving the app's
 * `.next` directory.
 *
 *   node scripts/assert-no-dev-server.mjs <port> [label]
 *
 * `next build` replaces `.next` in place. A dev server reading that directory
 * keeps serving until it tries to fetch a chunk that no longer exists, at which
 * point the running app 404s on layout.css and main-app.js and renders
 * unstyled. It looks like a code bug and is not one.
 *
 * This lived only inside apps/web's playground guard, so `pnpm build` at the
 * root — which runs BOTH apps through turbo — silently wiped apps/admin/.next
 * under a running admin dev server. One implementation, used by both.
 */
import { createConnection } from "node:net";

const listening = (host, port) =>
  new Promise((resolve) => {
    const socket = createConnection({ host, port });
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.removeAllListeners();
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });

/** Checks IPv4 and IPv6 — Next binds ::1 on some setups and 127.0.0.1 on others. */
export async function portIsListening(port) {
  const results = await Promise.all([listening("127.0.0.1", port), listening("::1", port)]);
  return results.some(Boolean);
}

if (process.argv[1] && import.meta.url.endsWith(encodeURI(process.argv[1].split("/").pop()))) {
  const port = Number(process.argv[2]);
  const label = process.argv[3] ?? `port ${port}`;
  if (!Number.isInteger(port)) {
    console.error("[dev-guard] usage: assert-no-dev-server.mjs <port> [label]");
    process.exit(1);
  }
  if (await portIsListening(port)) {
    console.error(
      `[dev-guard] ${label} is active on ${port}. A Next build replaces .next while the dev ` +
        `server is still reading it, which leaves the running app serving stale or missing chunks.\n\n` +
        `Stop it, run the build, then restart development on ${port}.`
    );
    process.exit(1);
  }
  console.log(`[dev-guard] ${port} is free — safe to replace build output`);
}
