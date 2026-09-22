/// <reference types="@testing-library/jest-dom" />

// jest-dom's matchers (toBeInTheDocument, toHaveTextContent, …) are registered
// at runtime by jest.setup.js. That file is JavaScript, and this app's tsconfig
// only includes **/*.ts and **/*.tsx, so the type augmentation that comes with
// the import never entered the program and `tsc --noEmit` rejected every matcher
// in a test file. packages/ui does not have the problem because its setup file
// is jest.setup.ts and its tsconfig names it explicitly.
