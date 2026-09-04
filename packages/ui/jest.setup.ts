import "@testing-library/jest-dom";

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
