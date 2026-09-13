import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HeaderRow from "../HeaderRow";

/**
 * HeaderRow is the shared desktop contract for BOTH `Header` and
 * `PageHeaderBand`. Without it the app would carry two header systems — 36px
 * with a 16px title on ~48 screens, 48px with a 24px title on the rest.
 *
 * The mobile-parity assertions below are not decoration. "Mobile geometry
 * unchanged" is an acceptance criterion of the desktop work, and it was broken
 * twice while this was being specified — an unprefixed `gap-2` and an
 * unprefixed `shrink-0`, both of which change what a phone renders.
 */
describe("HeaderRow", () => {
  const row = (c: HTMLElement) => c.firstChild as HTMLElement;

  describe("mobile parity — nothing new applies below lg", () => {
    it("keeps the 36px row and adds height only at lg", () => {
      const { container } = render(<HeaderRow title="Store details" />);
      expect(row(container)).toHaveClass("h-9", "lg:h-auto", "lg:min-h-12");
    });

    it("keeps the trailing wrapper's mobile classes exactly", () => {
      render(<HeaderRow title="T" trailing={<button type="button">Menu</button>} />);
      const wrapper = screen.getByRole("button", { name: "Menu" }).parentElement!;
      expect(wrapper).toHaveClass("ml-auto", "flex", "flex-row", "items-center");
    });

    // THE REGRESSION. `shrink-0` unprefixed stops the analytics header's date
    // string compressing on a narrow phone, which forces the title to truncate
    // earlier. A `gap` unprefixed separates controls that today sit flush.
    it("gains no unprefixed gap, shrink or padding on the trailing wrapper", () => {
      render(<HeaderRow title="T" trailing={<button type="button">Menu</button>} />);
      const cls = screen.getByRole("button", { name: "Menu" }).parentElement!.className;
      expect(cls).not.toMatch(/(^|\s)gap-\d/);
      expect(cls).not.toMatch(/(^|\s)shrink-0/);
      expect(cls).not.toMatch(/(^|\s)pl-\d/);
    });

    it("puts the new trailing behaviour behind lg", () => {
      render(<HeaderRow title="T" trailing={<button type="button">Menu</button>} />);
      expect(screen.getByRole("button", { name: "Menu" }).parentElement).toHaveClass(
        "lg:gap-3",
        "lg:shrink-0",
        "lg:pl-3"
      );
    });
  });

  describe("title", () => {
    it("steps a string title up at lg and truncates it", () => {
      render(<HeaderRow title="A very long page title" />);
      const heading = screen.getByRole("heading", { level: 3 });
      expect(heading).toHaveClass("text-body-lg", "lg:text-h1", "flex-1", "min-w-0", "truncate");
    });

    // Wrapping a node would stretch BrandLogo on auth and double up
    // ChatThreadHeader's own flex. Bare is deliberate.
    it("renders a node title as given, with no layout of its own", () => {
      render(<HeaderRow title={<span data-testid="mark">logo</span>} />);
      expect(screen.getByTestId("mark").className).toBe("");
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });

    it("renders no heading when there is no title", () => {
      render(<HeaderRow onBack={() => {}} />);
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });
  });

  describe("leading", () => {
    it("onBack renders a real, named back button", async () => {
      const onBack = jest.fn();
      render(<HeaderRow onBack={onBack} title="T" />);
      await userEvent.click(screen.getByRole("button", { name: "Go back" }));
      expect(onBack).toHaveBeenCalled();
    });

    it("an explicit leading slot wins over onBack", () => {
      render(<HeaderRow onBack={() => {}} leading={<span>custom</span>} title="T" />);
      expect(screen.queryByRole("button", { name: "Go back" })).not.toBeInTheDocument();
    });

    it("emits no trailing wrapper when there is nothing trailing", () => {
      const { container } = render(<HeaderRow title="T" />);
      expect(container.querySelector(".ml-auto")).toBeNull();
    });
  });
});
