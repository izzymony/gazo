/**
 * Explicit inventory of @vibaar/ui's current surface.
 *
 * Classification AND certification. `candidate` means shipped but not signed
 * off; `stable` means it has cleared a real bar — a specimen documenting its
 * variants and states, a behavioural test suite, and no accessibility defect
 * recorded against it.
 *
 * Six of thirty-five meet that bar today. Documenting the library is what
 * revealed why: most components carry a recorded a11y gap — an unnamed dialog,
 * a menu without arrow-key roving, a rating conveyed by colour alone, a section
 * title that is a <p>. Those are listed on each specimen and are the work that
 * turns candidate into stable. Documentation and
 * tooling use this stable denominator instead of treating every TSX file as an
 * equivalent public component.
 */
const entries = [
  ["animated/AnimatedImages", "pattern"],
  ["animated/SlideContent", "pattern"],
  ["animated/slidesData", "internal"],
  ["AnimatedHeader", "pattern"],
  ["common/Accordion", "component", "stable"],
  ["common/ActivityItem", "component", "stable"],
  ["common/Avatar", "primitive", "stable"],
  ["common/BottomModal", "component", "stable"],
  ["common/Button", "primitive", "stable"],
  ["common/Surface", "primitive", "stable"],
  ["common/Checkbox", "primitive", "stable"],
  ["common/ComingSoonPill", "component", "stable"],
  ["common/DetailList", "component", "stable"],
  ["common/DetailRow", "component", "stable"],
  ["common/Dialog", "component", "stable"],
  ["common/DisclosureButton", "primitive", "stable"],
  ["common/DropdownMenu", "component", "stable"],
  ["common/EmptyState", "pattern"],
  ["common/ErrorState", "pattern"],
  ["common/FilterBar", "pattern"],
  ["common/Footer", "pattern"],
  ["common/header/BackButton", "component", "stable"],
  ["common/header/KebabMenu", "component", "stable"],
  ["common/HeaderSlides", "pattern"],
  ["common/HeroHeader", "pattern"],
  ["common/IconButton", "primitive", "stable"],
  ["common/InputField", "primitive"],
  ["common/inputs", "internal"],
  ["common/List", "component", "stable"],
  ["common/ListItem", "component", "stable"],
  ["common/ListSectionHeader", "component", "stable"],
  ["common/Loader", "primitive", "stable"],
  ["common/NavigationTabs", "component", "stable"],
  ["common/PasswordCriteria", "component", "stable"],
  ["common/RadioGroup", "component", "stable"],
  ["common/SearchField", "component", "stable"],
  ["common/Section", "primitive", "stable"],
  ["common/ShareModal", "pattern"],
  ["common/StepNavigation", "component", "stable"],
  ["common/StoreLogo", "component", "stable"],
  ["common/StoreStatusBadge", "component", "stable"],
  ["common/Switch", "primitive", "stable"],
  ["common/Tabs", "component", "stable"],
  ["common/TransactionIcon", "component", "stable"],
  ["common/TrendIndicator", "component", "stable"],
  ["common/Typography", "primitive", "stable"],
  ["common/UserProfileImage", "component", "stable"],
  ["common/VerifiedCheck", "component", "stable"],
  ["ConfettiCelebration", "pattern"],
  ["icons/index", "asset"],
  ["modal/Modal", "deprecated"],
  ["PageShell", "pattern", "stable"],
  ["slidingcomponent", "pattern"],
  ["svg", "asset"],
];

const uiRegistry = entries.map(([source, kind, status]) => ({
  source,
  kind,
  status:
    kind === "internal" ? "internal" : kind === "deprecated" ? "deprecated" : status || "candidate",
}));

module.exports = { uiRegistry };
