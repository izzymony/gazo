import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "node:util";

// jsdom ships neither, and `react-dom/server` reaches for `TextEncoder` at
// module load. Server rendering is how the auth scene panel proves it emits
// nothing into the prerendered HTML — an assertion that cannot be made from the
// DOM, because by then the artwork has already been requested.
Object.assign(globalThis, { TextEncoder, TextDecoder });

// Primitives that reach for next/image or next/navigation get those mocked here
// (mirrors apps/web/jest.setup.js) so a component under test doesn't drag the
// whole Next runtime in. Add more mocks here as more primitives get covered.
jest.mock(
  "next/image",
  () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, jsx-a11y/alt-text
    default: (props: any) => {
      const React = require("react");
      return React.createElement("img", props);
    },
  }),
  { virtual: true }
);

jest.mock(
  "next/navigation",
  () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), prefetch: jest.fn() }),
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
  }),
  { virtual: true }
);

// Fail any test that logs a console.error — React's invalid-DOM-property, act(),
// and key warnings all go through console.error, and for a primitive library a
// warning IS a defect. Errors are collected during the test and thrown in
// afterEach (cleaner stack than throwing inside React's render). Add a narrow
// RegExp to IGNORED_CONSOLE_ERRORS only when a warning is genuinely expected.
const IGNORED_CONSOLE_ERRORS: RegExp[] = [];
let consoleErrors: string[] = [];
let consoleErrorSpy: jest.SpyInstance;
beforeEach(() => {
  consoleErrors = [];
  const original = console.error.bind(console);
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const msg = args.map((a) => (a instanceof Error ? a.message : String(a))).join(" ");
    if (IGNORED_CONSOLE_ERRORS.some((re) => re.test(msg))) return;
    consoleErrors.push(msg);
    original(...(args as Parameters<typeof console.error>));
  });
});
afterEach(() => {
  consoleErrorSpy.mockRestore();
  if (consoleErrors.length) {
    throw new Error(
      `Unexpected console.error during test (${consoleErrors.length}):\n` +
        consoleErrors.join("\n---\n")
    );
  }
});
