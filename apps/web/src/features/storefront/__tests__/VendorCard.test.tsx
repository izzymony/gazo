import { render, screen } from "@testing-library/react";
import VendorCard from "../VendorCard";

jest.mock("../useFollowVendor", () => ({
  __esModule: true,
  default: (vendorId?: string) => ({
    isFollowing: vendorId === "followed",
    toggle: jest.fn(),
    canFollow: Boolean(vendorId),
  }),
}));

const PRODUCTS = [
  { id: "p1", title: "Ankara wrap dress", image: ["/a.png"], price: 18500, old_price: 24000, rating: 4 },
];

describe("VendorCard", () => {
  it("names the vendor once, as a link", () => {
    render(<VendorCard href="/@bukky" name="Bukky Styles" products={[]} productHref={() => "#"} />);
    expect(screen.getByRole("link", { name: "Bukky Styles" })).toHaveAttribute("href", "/@bukky");
  });

  it("is a section, not a button — it contains buttons", () => {
    const { container } = render(
      <VendorCard href="#" name="Bukky Styles" products={[]} productHref={() => "#"} />
    );
    expect(container.querySelector("section")).not.toBeNull();
  });

  // THE REGRESSION. The profile page's copy hardcoded category "fashion",
  // rating 5.4, 100k followers and 4.5 on every product, so the same vendor read
  // completely differently there and on the marketplace.
  describe("shows only what the vendor actually has", () => {
    it("omits the rating and follower row entirely when both are zero", () => {
      render(
        <VendorCard
          href="#"
          name="Corner Shop"
          rating={0}
          followers={0}
          products={[]}
          productHref={() => "#"}
        />
      );
      expect(screen.queryByText(/average rating/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/followers/i)).not.toBeInTheDocument();
      expect(screen.queryByText("5.4")).not.toBeInTheDocument();
      expect(screen.queryByText("100k")).not.toBeInTheDocument();
    });

    it("shows real values when there are some", () => {
      render(
        <VendorCard
          href="#"
          name="Bukky Styles"
          category="Fashion"
          rating={4.8}
          followers={1240}
          products={[]}
          productHref={() => "#"}
        />
      );
      expect(screen.getByText("4.8")).toBeInTheDocument();
      expect(screen.getByText("1240")).toBeInTheDocument();
      expect(screen.getByText("Fashion")).toBeInTheDocument();
    });

    it("omits a product's rating rather than inventing one", () => {
      render(
        <VendorCard
          href="#"
          name="Corner Shop"
          products={[{ id: "p1", title: "Plain tee", price: 5000 }]}
          productHref={() => "#"}
        />
      );
      expect(screen.queryByText("4.5")).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Plain tee" })).toBeInTheDocument();
    });
  });

  describe("follow", () => {
    // The profile copy defaulted its label to "Following", so every vendor in
    // the list claimed to be followed whether the shopper followed them or not.
    it("says Follow when the shopper does not follow the vendor", () => {
      render(
        <VendorCard href="#" vendorId="other" name="Bukky" products={[]} productHref={() => "#"} />
      );
      const control = screen.getByRole("button", { name: "Follow" });
      expect(control).toHaveAttribute("aria-pressed", "false");
    });

    it("says Following only when they do", () => {
      render(
        <VendorCard href="#" vendorId="followed" name="Bukky" products={[]} productHref={() => "#"} />
      );
      expect(screen.getByRole("button", { name: "Following" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
    });

    it("hides the control entirely with no vendor id to act on", () => {
      render(<VendorCard href="#" name="Bukky" products={[]} productHref={() => "#"} />);
      expect(screen.queryByRole("button", { name: /follow/i })).not.toBeInTheDocument();
    });
  });

  /**
   * The rail must span the whole card, not the padded column inside it. Boxed
   * in the card's `p-3` the last product stopped at a hard vertical edge 12px
   * short of the card, so the row read as a finished list that happened to be
   * clipped rather than as something you can scroll.
   */
  describe("product rail", () => {
    const rail = (container: HTMLElement) => container.querySelector("ul")!;

    it("breaks out of the card's padding so it can scroll edge to edge", () => {
      const { container } = render(
        <VendorCard href="#" name="Bukky" products={PRODUCTS} productHref={() => "#"} />
      );
      expect(rail(container).className).toContain("-mx-3");
    });

    it("keeps the start inset, so the first product lines up with the name", () => {
      const { container } = render(
        <VendorCard href="#" name="Bukky" products={PRODUCTS} productHref={() => "#"} />
      );
      expect(rail(container).className).toContain("pl-3");
    });

    // jsdom gives every element zero width, so scrollWidth === clientWidth and
    // the rail reports itself as fully scrolled — which is the correct state
    // for a row with nothing more to show.
    it("drops the trailing fade when there is nothing further to scroll to", () => {
      const { container } = render(
        <VendorCard href="#" name="Bukky" products={PRODUCTS} productHref={() => "#"} />
      );
      expect(rail(container).className).not.toContain("fade-edge-r");
    });
  });

  it("names each wishlist toggle after its product", () => {
    render(
      <VendorCard
        href="#"
        name="Bukky"
        products={PRODUCTS}
        productHref={() => "#"}
        onSaveProduct={() => {}}
      />
    );
    expect(
      screen.getByRole("button", { name: "Add Ankara wrap dress to wishlist" })
    ).toBeInTheDocument();
  });

  it("reflects a saved product", () => {
    render(
      <VendorCard
        href="#"
        name="Bukky"
        products={PRODUCTS}
        productHref={() => "#"}
        savedProductIds={["p1"]}
        onSaveProduct={() => {}}
      />
    );
    expect(
      screen.getByRole("button", { name: "Remove Ankara wrap dress from wishlist" })
    ).toHaveAttribute("aria-pressed", "true");
  });
});
