/**
 * Focused form-input primitives (W3.4b) — the semantic API for the design
 * system, over the shared `InputField` implementation.
 *
 * These render identically to `InputField type="…"` but give each input kind a
 * clean, type-safe surface: no `type` discriminator, and props irrelevant to
 * the kind are omitted.
 *
 * Only the kinds the app actually imports live here. TextInput, Textarea,
 * Select and PhoneInput were written alongside PasswordInput and never
 * imported by anything — and two of them wrapped InputField variants that were
 * themselves unreachable (`type="dropdown"`, and the `flag` display that no
 * caller ever set). Add a wrapper back when a screen needs it, rather than
 * keeping four unused surfaces in step with the implementation beneath them.
 */
import InputField, { InputFieldProps } from "./InputField";

/** Everything except the `type` discriminator. */
type FieldProps = Omit<InputFieldProps, "type">;
/** Text-like kinds that share the plain text field. */
type TextLikeProps = Omit<FieldProps, "icon" | "drops" | "dropAction">;

/** Password field — includes the show/hide toggle and (on signup) the criteria list. */
export const PasswordInput = (props: TextLikeProps) => (
  <InputField type="password" {...props} />
);
