/**
 * Explicit inventory of @vibaar/ui's current surface.
 *
 * This is classification, not certification: `candidate` means the module is
 * shipped today but has not completed design-system review. Documentation and
 * tooling use this stable denominator instead of treating every TSX file as an
 * equivalent public component.
 */
const entries = [
  ["animated/AnimatedImages", "pattern"],
  ["animated/SlideContent", "pattern"],
  ["animated/slidesData", "internal"],
  ["AnimatedHeader", "pattern"],
  ["common/Accordion", "component"],
  ["common/ActivityItem", "component"],
  ["common/Avatar", "primitive"],
  ["common/BottomModal", "component"],
  ["common/Button", "primitive"],
  ["common/Surface", "primitive"],
  ["common/Checkbox", "primitive"],
  ["common/ComingSoonPill", "component"],
  ["common/DetailList", "component"],
  ["common/DetailRow", "component"],
  ["common/Dialog", "component"],
  ["common/DropdownMenu", "component"],
  ["common/EmptyState", "pattern"],
  ["common/ErrorState", "pattern"],
  ["common/FilterBar", "pattern"],
  ["common/Footer", "pattern"],
  ["common/header/BackButton", "component"],
  ["common/header/KebabMenu", "component"],
  ["common/HeaderSlides", "pattern"],
  ["common/HeroHeader", "pattern"],
  ["common/IconButton", "primitive"],
  ["common/InputField", "primitive"],
  ["common/inputs", "internal"],
  ["common/ListItem", "component"],
  ["common/ListSectionHeader", "component"],
  ["common/Loader", "primitive"],
  ["common/NavigationTabs", "component"],
  ["common/PasswordCriteria", "component"],
  ["common/RadioGroup", "component"],
  ["common/SearchField", "component"],
  ["common/Section", "primitive"],
  ["common/ShareModal", "pattern"],
  ["common/StepNavigation", "component"],
  ["common/StoreLogo", "component"],
  ["common/StoreStatusBadge", "component"],
  ["common/Switch", "primitive"],
  ["common/Tabs", "component"],
  ["common/TransactionIcon", "component"],
  ["common/TrendIndicator", "component"],
  ["common/Typography", "primitive"],
  ["common/UserProfileImage", "component"],
  ["common/VerifiedCheck", "component"],
  ["ConfettiCelebration", "pattern"],
  ["icons/index", "asset"],
  ["modal/Modal", "deprecated"],
  ["PageShell", "pattern"],
  ["slidingcomponent", "pattern"],
  ["svg", "asset"],
];

const uiRegistry = entries.map(([source, kind]) => ({
  source,
  kind,
  status: kind === "internal" ? "internal" : kind === "deprecated" ? "deprecated" : "candidate",
}));

module.exports = { uiRegistry };
