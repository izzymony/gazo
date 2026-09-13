import ChangePasswordDialog from "@/features/settings/ChangePasswordDialog";

/**
 * Intercepts a soft navigation to /profile/settings/change-password from inside
 * the buyer settings segment. A pasted URL or a reload falls through to
 * ../change-password/page.tsx and renders the canonical screen.
 */
export default function InterceptedChangePassword() {
  return <ChangePasswordDialog />;
}
