export type UiModuleKind = "primitive" | "component" | "pattern" | "asset" | "internal" | "deprecated";
/**
 * `stable` — has a specimen, a behavioural test suite, and no recorded
 * accessibility defect. `candidate` — shipped and documented, not signed off.
 */
export type UiModuleStatus = "stable" | "candidate" | "internal" | "deprecated";

export type UiRegistryEntry = {
  source: string;
  kind: UiModuleKind;
  status: UiModuleStatus;
};

export const uiRegistry: readonly UiRegistryEntry[];
