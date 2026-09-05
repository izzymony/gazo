export type UiModuleKind = "primitive" | "component" | "pattern" | "asset" | "internal" | "deprecated";
export type UiModuleStatus = "candidate" | "internal" | "deprecated";

export type UiRegistryEntry = {
  source: string;
  kind: UiModuleKind;
  status: UiModuleStatus;
};

export const uiRegistry: readonly UiRegistryEntry[];
