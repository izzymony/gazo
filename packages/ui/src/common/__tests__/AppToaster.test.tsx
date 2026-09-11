import { render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import AppToaster from "../AppToaster";

/**
 * Toasts were the one piece of chrome the design system never covered: the app
 * mounted sonner bare, so every toast rendered at the library's own radius,
 * font and greys beside cards at `rounded-card` in Outfit. A toast is the most
 * interruptive thing on screen and it was the only thing not speaking the
 * system's language.
 */
describe("AppToaster", () => {
  it("gives a toast the card radius, not the library's own", async () => {
    render(<AppToaster />);
    toast("Saved");

    const el = await screen.findByText("Saved");
    const toastEl = el.closest("[data-sonner-toast]") as HTMLElement;
    expect(toastEl).not.toBeNull();
    expect(toastEl.className).toContain("rounded-card");
  });

  it("sits on the app's surface, outline and elevation tokens", async () => {
    render(<AppToaster />);
    toast("Saved");

    const toastEl = (await screen.findByText("Saved")).closest(
      "[data-sonner-toast]"
    ) as HTMLElement;
    for (const token of ["bg-surface", "border-outline", "shadow-pop", "text-body"]) {
      expect(toastEl.className).toContain(token);
    }
  });

  it("tones the icon per kind rather than shipping sonner's palette", async () => {
    render(<AppToaster />);
    toast.error("Nope");

    await waitFor(() => {
      const toastEl = screen.getByText("Nope").closest("[data-sonner-toast]") as HTMLElement;
      expect(toastEl.className).toContain("text-error-foreground");
    });
  });
});
