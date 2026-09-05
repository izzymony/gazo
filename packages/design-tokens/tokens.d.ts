export type VibaarTokenContract = {
  color: {
    brand: { DEFAULT: string; hover: string; ink: string; deep: string };
    neutral: Record<"50" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "950", string>;
    foreground: Record<"primary" | "secondary" | "muted" | "disabled" | "inverse", string>;
    outline: Record<"subtle" | "DEFAULT" | "strong" | "emphasis" | "contrast", string>;
    ink: Record<string, string>;
    line: string;
    status: Record<
      "success" | "error" | "warning" | "info",
      { foreground: string; surface: string; border: string }
    >;
  };
  radius: Record<string, string>;
  shadow: Record<string, string>;
  zIndex: Record<string, string>;
};

export const tokens: VibaarTokenContract;
export const cssVariables: Readonly<Record<string, string>>;
export const brandRoleSteps: Readonly<{ hover: 600; deep: 900 }>;
export const brandNeutralRoleSteps: Readonly<{ ink: 950 }>;
export const semanticColorSteps: Readonly<{
  success: { family: "green"; foreground: 600; surface: 50; border: 200 };
  error: { family: "red"; foreground: 600; surface: 50; border: 200 };
  warning: { family: "amber"; foreground: 600; surface: 50; border: 200 };
  info: { family: "blue"; foreground: 600; surface: 50; border: 200 };
}>;
export const neutralRoleSteps: Readonly<{
  foreground: { primary: 900; secondary: 700; muted: 500; disabled: 400; inverse: 50 };
  outline: { subtle: 100; DEFAULT: 200; strong: 300; emphasis: 400; contrast: 900 };
  /** `DEFAULT` is the literal "white", not a neutral step — a card must read as raised on a tinted page. */
  surface: { DEFAULT: "white"; subtle: 50; muted: 100; strong: 200; inverse: 900 };
}>;
export const projectLiteralColorNames: readonly string[];
