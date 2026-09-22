import { render, screen } from "@testing-library/react";
import StorefrontHeader from "../StorefrontHeader";

jest.mock("next/navigation", () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));

const VENDOR = {
  name: "Bukky Styles",
  category: "Fashion Store",
  is_verified: true,
  address: { province: "Lagos", address_line: "12 Admiralty Way" },
  business_setting: {
    personalised_settings: { background_color: "#2F5D50", background_state: "color" },
  },
};

describe("StorefrontHeader", () => {
  it("names the vendor in both variants", () => {
    const { rerender } = render(
      <StorefrontHeader variant="hero" store={VENDOR} backMaskId="a" />
    );
    expect(screen.getByText("Bukky Styles")).toBeInTheDocument();
    rerender(<StorefrontHeader variant="compact" store={VENDOR} backMaskId="a" />);
    expect(screen.getByText("Bukky Styles")).toBeInTheDocument();
  });

  it("always offers a back control", () => {
    render(<StorefrontHeader variant="compact" store={VENDOR} backMaskId="b" />);
    expect(screen.getByRole("button", { name: "Go back" })).toBeInTheDocument();
  });

  // The dangling-preposition bug: the subtitle was `{category} in {province}`,
  // so a vendor with no province rendered "Fashion Store in".
  it("joins only the identity parts that exist", () => {
    render(
      <StorefrontHeader
        variant="hero"
        store={{ name: "Corner Shop", category: "Fashion Store" }}
        backMaskId="c"
      />
    );
    expect(screen.getByText("Fashion Store")).toBeInTheDocument();
    expect(screen.queryByText(/\bin\s*$/)).not.toBeInTheDocument();
  });

  it("renders no identity line at all when there is nothing to say", () => {
    const { container } = render(
      <StorefrontHeader variant="hero" store={{ name: "Corner Shop" }} backMaskId="d" />
    );
    expect(container.textContent).toContain("Corner Shop");
    expect(container.textContent).not.toContain("·");
  });

  it("puts caller-supplied controls in the trailing and action slots", () => {
    render(
      <StorefrontHeader
        variant="hero"
        store={VENDOR}
        backMaskId="e"
        trailing={<button type="button">Follow</button>}
        actions={<button type="button">Edit store</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Follow" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit store" })).toBeInTheDocument();
  });

  // The leak this pins: three headers resolved the theme three ways, two of them
  // falling back to the SIGNED-IN seller's global theme. This component reads the
  // passed vendor and nothing else, so a shopper always sees the vendor's banner.
  it("derives the banner from the vendor it was given", () => {
    const { container } = render(
      <StorefrontHeader variant="hero" store={VENDOR} backMaskId="f" />
    );
    const banner = container.firstElementChild as HTMLElement;
    expect(banner.style.background).toContain("rgb(47, 93, 80)");
  });

  it("falls back to a colour seeded by the vendor's own name", () => {
    // No colour set: the seed must be the store name, so the same vendor looks
    // the same on its storefront and on every one of its products.
    const { container: a } = render(
      <StorefrontHeader variant="hero" store={{ name: "Corner Shop" }} backMaskId="g" />
    );
    const { container: b } = render(
      <StorefrontHeader variant="compact" store={{ name: "Corner Shop" }} backMaskId="h" />
    );
    const bg = (c: HTMLElement) => (c.firstElementChild as HTMLElement).style.background;
    expect(bg(a)).toBe(bg(b));
    expect(bg(a)).not.toBe("");
  });
});
