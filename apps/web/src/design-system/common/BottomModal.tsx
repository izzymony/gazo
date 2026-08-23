// BottomModal is now an alias of the canonical responsive Dialog (W3.5):
// sheet on mobile, centered dialog on desktop, with focus-trap / Escape /
// scroll-lock / aria added. Existing call sites keep the same { isOpen, onClose,
// children } API. New code should import Dialog from "@/design-system/common/Dialog".
import Dialog from "./Dialog";

export default Dialog;
