import ChangePasswordDialog from "@/features/settings/ChangePasswordDialog";

/**
 * Intercepts a SOFT navigation to /dashboard/settings/change-password from
 * anywhere inside the settings segment — today, the Security row — and renders
 * the flow as a dialog over the page the seller was on.
 *
 * A hard navigation is not intercepted by design: a pasted URL or a reload falls
 * through to ../change-password/page.tsx and renders the canonical screen.
 */
export default function InterceptedChangePassword() {
  return <ChangePasswordDialog />;
}
