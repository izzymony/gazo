import { PORT_TAKEN_MESSAGE, STUB_PORT, startStubApi } from "./helpers/stubApi";

/**
 * Starts the stub backend before the suite and closes it after.
 *
 * Playwright calls a returned function as teardown, which keeps the server's
 * lifetime tied to the run — no orphan holding the port for the next one.
 *
 * This is deliberately NOT a `webServer` entry in playwright.config.ts. That
 * option starts a child PROCESS and polls a URL; it is the right tool for a real
 * server. The stub is 200 lines of in-memory fixtures the specs also import, so
 * running it in-process is what lets a test assert against the exact data the
 * server actually sent.
 *
 * A bind failure does NOT throw. Throwing from globalSetup fails the WHOLE
 * suite, including `public`, `shop` and `cart`, which never make a
 * server-rendered fetch and would pass happily against a real backend. The specs
 * that genuinely need the stub check for it themselves — see `requireStub()` in
 * helpers/stubApi.ts, which probes the port rather than sharing state with this
 * module (globalSetup runs in the runner process; specs run in a worker, so an
 * exported flag would read `false` in both places regardless of the truth).
 */
export default async function globalSetup() {
  const stub = await startStubApi();

  if (!stub.started) {
    console.warn(
      "\n[smokeweb] STUB API UNAVAILABLE — storefront.spec.ts will fail.\n" +
        stub.reason.replace(/^/gm, "  ") +
        "\n"
    );
    return;
  }

  console.log(`[smokeweb] stub API on ${stub.url}`);

  return async () => {
    await stub.close();
    console.log(`[smokeweb] stub API on :${STUB_PORT} closed`);
  };
}