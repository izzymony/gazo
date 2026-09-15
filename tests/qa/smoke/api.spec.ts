import { test, expect, request } from "@playwright/test";
import { resolveTargets } from "../env.cjs";

const targets = resolveTargets();

test.describe("API smoke", () => {
  test("healthcheck responds OK", async ({ request: api }) => {
    const res = await api.get(`${targets.api}/healthcheck`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ Status: "OK" });
  });

  test("products endpoint answers with the paginated envelope", async ({ request: api }) => {
    const res = await api.get(`${targets.api}/products?page=1&limit=1`);
    expect(res.status()).toBe(200);
    // Shape, not contents — an empty catalog is a seeding problem, not an API fault.
    expect(await res.json()).toHaveProperty("data");
  });

  test("CORS allows the web origin", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      extraHTTPHeaders: { Origin: targets.web },
    });
    const res = await ctx.get(`${targets.api}/healthcheck`);
    expect(res.headers()["access-control-allow-origin"]).toBe(targets.web);
    await ctx.dispose();
  });

  test("CORS refuses an unknown origin", async ({ playwright }) => {
    const ctx = await playwright.request.newContext({
      extraHTTPHeaders: { Origin: "https://attacker.example" },
    });
    const res = await ctx.get(`${targets.api}/healthcheck`);
    // The backend answers with its canonical origin rather than echoing, so the
    // browser refuses the response. Echoing the attacker's origin back is the
    // failure this guards against.
    expect(res.headers()["access-control-allow-origin"]).not.toBe("https://attacker.example");
    await ctx.dispose();
  });

  // Signature verification is the only thing standing between a public endpoint
  // and forged "payment succeeded" calls. Needs no secret to test the refusal.
  for (const provider of ["paystack", "shipbubble"]) {
    test(`${provider} webhook rejects an unsigned call`, async ({ request: api }) => {
      const res = await api.post(`${targets.api}/webhook/${provider}`, {
        data: { event: "charge.success" },
        failOnStatusCode: false,
      });
      expect(res.status()).toBe(401);
    });
  }
});
