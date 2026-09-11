/**
 * The 401 → refresh → retry path in `@vibaar/api-client`.
 *
 * THE REGRESSION: refresh state was a boolean flag plus a list of subscribers,
 * and the two could not be kept in step. The refresher flushed the list the
 * instant the refresh settled, but the flag stayed true for the whole of its own
 * retry afterwards — so a request that 401'd inside that window saw the flag,
 * added itself to an already-flushed list, and waited on a promise nobody would
 * ever settle. No rejection, no timeout (axios' timeout covers the request, not
 * the wrapper). It hung until the page was reloaded.
 */
import Axios from "axios";
import Cookies from "js-cookie";
import { Client } from "@vibaar/api-client/client";

jest.mock("axios");
jest.mock("js-cookie");

const mockAxios = Axios as unknown as jest.Mock & { post: jest.Mock };
const mockCookies = Cookies as jest.Mocked<typeof Cookies>;
// `Cookies.get` is overloaded (no-arg returns every cookie), so the mocked type
// resolves to the wrong signature; address it as a plain mock.
const cookieGet = Cookies.get as unknown as jest.Mock;

const unauthorized = () =>
  Object.assign(new Error("Request failed with status code 401"), {
    isAxiosError: true,
    response: { status: 401, data: {} },
  });

beforeEach(() => {
  jest.resetAllMocks();
  (Axios as unknown as { isAxiosError: unknown }).isAxiosError = (e: unknown) =>
    Boolean((e as { isAxiosError?: boolean })?.isAxiosError);
  cookieGet.mockImplementation((name?: string) =>
    name === "accessToken" ? "stale-access" : "valid-refresh"
  );
  mockCookies.set.mockImplementation(() => undefined as never);
});

it("settles a request that 401s while an earlier refresh is retrying", async () => {
  // THE EXACT WINDOW. The second request must 401 AFTER the refresh has
  // resolved (so the old subscriber list is already flushed) but BEFORE the
  // first request's retry finishes (so the old `isRefreshing` flag is still
  // true). Firing both at once does NOT reproduce it — the old code handled
  // that fine, because the second subscribed before the flush.
  mockAxios.post = jest.fn(async () => ({
    data: { data: { access_token: "fresh", refresh_token: "fresh-r" } },
  }));

  let retryStarted: () => void = () => {};
  const retryInFlight = new Promise<void>((r) => (retryStarted = r));
  let releaseRetry: () => void = () => {};
  const retryHeld = new Promise<void>((r) => (releaseRetry = r));

  mockAxios.mockImplementation(async (config: { headers?: Record<string, string> }) => {
    if (config.headers?.Authorization === "Bearer fresh") {
      retryStarted(); // the refresh has settled and the retry is now running
      await retryHeld;
      return { status: 200, data: {} };
    }
    throw unauthorized();
  });

  const first = Client({ path: "/a", method: "GET" });
  await retryInFlight;

  // Now open the second request, inside the window.
  const second = Client({ path: "/b", method: "GET" });
  await Promise.resolve();
  releaseRetry();

  // Before the fix, `second` never settled and this timed out.
  const results = await Promise.all([first, second]);
  expect(results.map((r) => r.status)).toEqual([200, 200]);
});

it("rejects every waiting request when the refresh itself fails", async () => {
  cookieGet.mockImplementation(() => undefined);
  mockAxios.post = jest.fn();
  mockAxios.mockImplementation(async () => {
    throw unauthorized();
  });

  // A guest has no refresh token: both must reject rather than hang.
  await expect(Client({ path: "/a", method: "GET" })).rejects.toThrow(
    "No refresh token available"
  );
  await expect(Client({ path: "/b", method: "GET" })).rejects.toThrow(
    "No refresh token available"
  );
  expect(mockAxios.post).not.toHaveBeenCalled();
});

it("starts a fresh attempt for a later 401 rather than reusing the last outcome", async () => {
  mockAxios.post = jest
    .fn()
    .mockResolvedValueOnce({ data: { data: { access_token: "one" } } })
    .mockResolvedValueOnce({ data: { data: { access_token: "two" } } });

  mockAxios.mockImplementation(async (config: { headers?: Record<string, string> }) => {
    const auth = config.headers?.Authorization;
    if (auth === "Bearer one" || auth === "Bearer two") return { status: 200, data: {} };
    throw unauthorized();
  });

  await Client({ path: "/a", method: "GET" });
  await Client({ path: "/b", method: "GET" });
  expect(mockAxios.post).toHaveBeenCalledTimes(2);
});
