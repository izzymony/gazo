/**
 * Focused form-input primitives (W3.4b) — the semantic API for the design
 * system, over the shared `InputField` implementation.
 *
 * These render identically to `InputField type="…"` (zero-risk, preserve
 * rendering) but give each input kind a clean, type-safe surface: no `type`
 * discriminator, and props irrelevant to the kind are omitted. Migrate call
 * sites to these incrementally; the internal `FieldFrame` decomposition of
 * InputField is a later step once adoption has contained the blast radius.
 */
import InputField, { InputFieldProps } from "./InputField";

/** Everything except the `type` discriminator. */
type FieldProps = Omit<InputFieldProps, "type">;
/** Text-like kinds that share the plain text field. */
type TextLikeProps = Omit<
  FieldProps,
  "options" | "flag" | "icon" | "drops" | "dropAction" | "modal"
>;

/** Single-line text input. Defaults to `text`; accepts the text-like HTML types. */
export const TextInput = ({
  type = "text",
  ...props
}: TextLikeProps & { type?: "text" | "email" | "tel" | "number" | "date" }) => (
  <InputField type={type} {...props} />
);

/** Password field — includes the show/hide toggle and (on signup) the criteria list. */
export const PasswordInput = (props: TextLikeProps) => (
  <InputField type="password" {...props} />
);

/** The app's multi-line-style field. */
export const Textarea = (props: TextLikeProps) => (
  <InputField type="textarea" {...props} />
);

/** Inline options dropdown (requires `options`). */
export const Select = (
  props: Omit<FieldProps, "flag" | "drops" | "dropAction"> & {
    options: InputFieldProps["options"];
  }
) => <InputField type="dropdown" {...props} />;

/** Country/phone selector — the display field with flag + chevron. */
export const PhoneInput = (props: Omit<FieldProps, "options">) => (
  <InputField type="drop" {...props} />
);
