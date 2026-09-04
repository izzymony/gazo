// Jest config for @vibaar/ui. This package ships raw TS/TSX (consumed via the
// apps' `transpilePackages`), so there is no build to test against — jest
// transpiles the source directly with @swc/jest (same SWC pipeline the Next
// build uses), renders it in jsdom, and asserts with @testing-library/react
// (the exact testing-library the web app uses). Behavioural safety net for the
// primitives before their APIs get hardened across ~57 call sites.
module.exports = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "typescript", tsx: true },
          transform: { react: { runtime: "automatic" } },
        },
      },
    ],
  },
  moduleNameMapper: {
    // @vibaar/utils is a raw-TS workspace pkg — map to source so @swc/jest
    // transpiles it rather than jest choking on untransformed TS in node_modules.
    "^@vibaar/utils$": "<rootDir>/../utils/src/index.ts",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{ts,tsx}",
    "<rootDir>/src/**/*.{spec,test}.{ts,tsx}",
  ],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  clearMocks: true,
};
