/**
 * PasswordCriteria — the single shared password-requirements checklist.
 *
 * Replaces the two byte-identical copies that lived inline in InputField and
 * in SignUpOverview. Computes its own state from the `password` string; met
 * rules turn semantic `success-foreground`, unmet stay `ink-40`.
 */
export default function PasswordCriteria({ password }: { password: string }) {
  const criteria = {
    minLength: password.length >= 8,
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    hasUppercase: /[A-Z]/.test(password),
  };

  const cls = (met: boolean) =>
    `list-disc ${met ? "text-success-foreground" : "text-foreground-muted"}`;

  return (
    <ul className="text-body-sm mt-2 pl-5 space-y-0.5">
      <li className={cls(criteria.minLength)}>8 or more characters</li>
      <li className={cls(criteria.hasNumber)}>At least 1 number</li>
      <li className={cls(criteria.hasSpecialChar)}>
        At least 1 special character:
        &quot;!&quot;#$%&apos;()*+,-./:;&lt;=&gt;?@[\]^\
      </li>
      <li className={cls(criteria.hasUppercase)}>At least 1 uppercase letter</li>
    </ul>
  );
}
