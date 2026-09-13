import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Header from "../Header";
import BrandLogo from "../BrandLogo";
import StepNavigation from "../StepNavigation";

describe("Header", () => {
  describe("positioning contract", () => {
    /**
     * PageShell offsets its content by mt-16 on the assumption that the header
     * takes itself out of flow. If these classes drift, 54 pages either collide
     * with their content or gain a gap — and nothing else would catch it, since
     * every class here is individually valid. ChatThreadHeader had to duplicate
     * this wrapper verbatim for exactly this reason.
     */
    it("takes itself out of flow on mobile and sticks on desktop", () => {
      const { container } = render(<Header title="Orders" />);
      expect(container.firstChild).toHaveClass(
        "absolute",
        "lg:sticky",
        "lg:top-0",
        "w-full",
        "z-sticky",
        "bg-surface"
      );
    });

    // The bar is 36px on a phone and 48px from lg. It was 36px at every width,
    // which is why a 27" display showed a phone's header. The mobile half of
    // this pair is the part that must not move.
    it("keeps the 36px bar on mobile, steps to 48px at lg, and keeps the column", () => {
      const { container } = render(<Header title="Orders" />);
      expect(container.querySelector(".lg\\:max-w-5xl")).toBeInTheDocument();
      const row = container.querySelector(".h-9");
      expect(row).toBeInTheDocument();
      expect(row).toHaveClass("lg:min-h-12");
    });

    // The row's geometry and typography live in HeaderRow so this header and
    // the flow-page band cannot drift into two desktop systems.
    it("steps the title up at lg without touching its mobile size", () => {
      render(<Header title="Orders" />);
      expect(screen.getByRole("heading", { level: 3 })).toHaveClass(
        "text-body-lg",
        "lg:text-h1"
      );
    });

    it("still positions itself when a caller adds classes", () => {
      const { container } = render(<Header title="Orders" className="shadow-card" />);
      expect(container.firstChild).toHaveClass("absolute", "lg:sticky", "shadow-card");
    });
  });

  describe("title", () => {
    it("renders a string as the page heading", () => {
      render(<Header title="Your orders" />);
      const heading = screen.getByRole("heading", { name: "Your orders" });
      expect(heading).toHaveClass("truncate", "flex-1");
    });

    it("renders a node as given — the case the old string-only prop forced a fork for", () => {
      render(
        <Header
          title={
            <span>
              <img alt="Aduke" src="/a.png" />
              Aduke Fabrics
            </span>
          }
        />
      );
      expect(screen.getByAltText("Aduke")).toBeInTheDocument();
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });

    it("carries the brand mark on auth screens without needing a flag", () => {
      render(<Header title={<BrandLogo />} />);
      expect(screen.getByAltText("Vibaar")).toBeInTheDocument();
    });

    it("renders no heading when there is no title", () => {
      render(<Header onBack={() => {}} />);
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    });
  });

  describe("leading", () => {
    it("onBack renders a real, named back button", async () => {
      const onBack = jest.fn();
      render(<Header onBack={onBack} title="Cart" />);
      await userEvent.click(screen.getByRole("button", { name: "Go back" }));
      expect(onBack).toHaveBeenCalledTimes(1);
    });

    it("renders nothing leading when onBack is omitted", () => {
      render(<Header title="Cart" />);
      expect(screen.queryByRole("button", { name: "Go back" })).not.toBeInTheDocument();
    });

    it("an explicit leading slot wins over onBack", () => {
      const onBack = jest.fn();
      render(<Header onBack={onBack} leading={<button type="button">Close</button>} title="Cart" />);
      expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Go back" })).not.toBeInTheDocument();
    });
  });

  describe("trailing", () => {
    it("pins actions to the right", () => {
      render(<Header title="Cart" trailing={<button type="button">Menu</button>} />);
      expect(screen.getByRole("button", { name: "Menu" }).parentElement).toHaveClass("ml-auto");
    });

    it("adds no wrapper when there is nothing trailing", () => {
      const { container } = render(<Header title="Cart" />);
      expect(container.querySelector(".ml-auto")).toBeNull();
    });
  });

  describe("progress", () => {
    it("renders beneath the bar and keeps its own semantics", () => {
      render(<Header onBack={() => {}} progress={<StepNavigation step={2} totalSteps={4} />} />);
      const bar = screen.getByRole("progressbar");
      expect(bar).toHaveAttribute("aria-valuetext", "Step 2 of 4");
    });
  });
});
