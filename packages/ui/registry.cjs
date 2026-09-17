/**
 * Explicit inventory of @vibaar/ui's current surface.
 *
 * WHAT EACH FIELD MEANS — and, more importantly, what it does NOT.
 *
 * `kind`         what the module is: primitive / component / pattern /
 *               internal / asset / deprecated.
 * `status`       a judgement about the PUBLIC API only. `stable` means the
 *               shape is settled and may be depended on. It is not a quality
 *               score and not a popularity score.
 * `disposition`  why a settled API has no consumer yet — `planned`, `keep` or
 *               `review`. Required only when a `stable` entry is unadopted.
 *
 * Two facts that used to be folded into `stable` are now DERIVED instead of
 * declared, because a hand-maintained claim is exactly the thing that drifts:
 *
 *   hasTestFile  a test file exists — checked against the filesystem by
 *                src/__tests__/registry.test.ts. Named honestly: a file
 *                existing cannot prove the behaviour is meaningfully covered.
 *   adopted      reachable from the app — computed by
 *                scripts/check-ui-adoption.cjs at the repo root, which follows
 *                intra-library imports too, so a primitive used only through
 *                another component (Avatar via StoreLogo) still counts as used.
 *
 * A SPECIMEN IS DELIBERATELY NOT PART OF THIS. The playground is git-ignored,
 * parked out of every build and absent from CI, so nothing tracked may depend
 * on it: a stable rating that required one would be unverifiable on a clean
 * checkout. Specimen coverage is reported by scripts/check-ui-documented.cjs,
 * run by hand, which no-ops when the playground is not present.
 *
 * The previous definition required a specimen AND real adoption AND a test
 * suite. That was three claims wearing one word — and 17 entries carried it
 * while having no test file at all.
 */
const entries = [
  ["animated/AnimatedImages", "pattern"],
  ["animated/SlideContent", "pattern"],
  ["animated/slidesData", "internal"],
  ["AuthSplitShell", "pattern", "stable"],
  // The auth scene panel, being built asset-independently. Everything but
  // the panel itself is `internal`: one slideshow does not justify an
  // application-wide public component API.
  ["authScene/authScene", "internal"],
  ["authScene/AuthEventCard", "internal"],
  ["authScene/AuthSceneOverlay", "internal"],
  ["authScene/AuthStatusCard", "internal"],
  ["authScene/sceneIcons", "internal"],
  ["authScene/scenePlacement", "internal"],
  ["authScene/useSceneRotation", "internal"],
  ["common/Accordion", "component", "candidate"],
  ["common/ActivityItem", "component", "candidate"],
  // Added 2026-09-11 with the seller-side pass. `candidate`, not `stable`:
  // stable requires a playground specimen as well as a behavioural test, and
  // none of these four has one yet.
  ["common/AppToaster", "component", "candidate"],
  ["common/Avatar", "primitive", "candidate"],
  ["common/Badge", "primitive", "stable"],
  ["common/BottomModal", "component", "candidate"],
  ["common/BrandLogo", "primitive", "candidate"],
  ["common/Button", "primitive", "stable"],
  ["common/Surface", "primitive", "stable"],
  ["common/Checkbox", "primitive", "stable"],
  // Added in 4de55ed and never registered — exactly the drift this guard catches.
  ["common/ChipToggle", "component", "candidate"],
  ["common/DetailList", "component", "candidate"],
  ["common/DetailRow", "component", "candidate"],
  ["common/Dialog", "component", "stable"],
  ["common/DisclosureButton", "primitive", "stable"],
  ["common/DropdownMenu", "component", "stable"],
  ["common/DropdownSelect", "component", "candidate"],
  ["common/EmptyState", "pattern"],
  ["common/ErrorState", "pattern"],
  ["common/FilterBar", "component", "stable"],
  ["common/Footer", "pattern"],
  ["common/Header", "component", "stable"],
  ["common/header/BackButton", "component", "stable"],
  ["common/header/KebabMenu", "component", "stable"],
  // The row's geometry and typography, shared by `Header` and (next)
  // `PageHeaderBand`, so the app cannot end up with two desktop header systems.
  ["common/HeaderRow", "primitive", "candidate"],
  ["common/HeaderSlides", "pattern"],
  ["common/HeroHeader", "pattern"],
  ["common/IconButton", "primitive", "stable"],
  ["common/InputField", "primitive", "stable"],
  ["common/inputs", "internal"],
  ["common/List", "component", "stable"],
  ["common/ListItem", "component", "stable"],
  ["common/ListSectionHeader", "component", "candidate"],
  ["common/Loader", "primitive", "candidate"],
  ["common/NavGlyph", "primitive", "stable"],
  ["common/NavItem", "primitive", "stable"],
  ["common/NavigationTabs", "component", "candidate"],
  ["common/PageActionButton", "primitive", "candidate"],
  ["common/PasswordCriteria", "component", "candidate"],
  ["common/RadioGroup", "component", "stable"],
  ["common/ReviewCard", "component", "candidate"],
  ["common/SearchField", "component", "stable"],
  ["common/SelectableCard", "primitive", "stable", "review"],
  ["common/Section", "primitive", "stable"],
  ["common/Spinner", "primitive", "stable"],
  ["common/StarRating", "component", "candidate"],
  ["common/ShareModal", "pattern"],
  ["common/StepNavigation", "component", "stable"],
  ["common/StoreLogo", "component", "candidate"],
  ["common/StoreStatusBadge", "component", "candidate"],
  ["common/Switch", "primitive", "stable"],
  ["common/Tooltip", "primitive", "stable"],
  ["common/Tabs", "component", "stable"],
  ["common/TransactionIcon", "component", "candidate"],
  ["common/TrendIndicator", "component", "candidate"],
  ["common/Typography", "primitive", "stable"],
  ["common/UserProfileImage", "component", "candidate"],
  ["common/useMediaActive", "internal"],
  ["common/useMediaQuery", "internal"],
  ["common/usePageVisible", "internal"],
  ["common/usePrefersReducedMotion", "internal"],
  ["common/useModalBehaviour", "internal"],
  ["common/VerifiedCheck", "component", "candidate"],
  ["ConfettiCelebration", "pattern"],
  ["icons/index", "asset"],
  ["modal/Modal", "deprecated"],
  // The desktop frame for screens that own a flow action: one action node,
  // last in the DOM, lifted into the header row at lg by grid placement.
  ["PageHeaderBand", "pattern", "candidate"],
  // A dialog whose mobile presentation is the full-screen route it replaces.
  ["common/ResponsiveRouteDialog", "primitive", "candidate"],

  ["PageShell", "pattern", "stable"],
  ["slidingcomponent", "pattern"],
  ["styles", "internal"],
  ["svg", "asset"],
];

const uiRegistry = entries.map(([source, kind, status, disposition]) => ({
  source,
  kind,
  disposition,
  status:
    kind === "internal" ? "internal" : kind === "deprecated" ? "deprecated" : status || "candidate",
}));

module.exports = { uiRegistry };
