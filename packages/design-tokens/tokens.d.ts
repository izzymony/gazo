export type VibaarTokenContract = {
  color: {
    brand: { DEFAULT: string; hover: string; ink: string; deep: string };
    ink: Record<string, string>;
    line: string;
    status: {
      success: string;
      successStrong: string;
      error: string;
      warning: string;
      warningStrong: string;
      info: string;
    };
    landing: Record<string, string | Record<string, string>>;
  };
  radius: Record<string, string>;
  shadow: Record<string, string>;
  zIndex: Record<string, string>;
};

export const tokens: VibaarTokenContract;
export const cssVariables: Readonly<Record<string, string>>;
export const projectLiteralColorNames: readonly string[];
