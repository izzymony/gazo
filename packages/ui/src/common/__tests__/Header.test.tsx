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

    it("keeps the 36px bar and the desktop max-width wrapper", () => {
      const { container } = render(<Header title="Orders" />);
      expect(container.querySelector(".lg\\:max-w-5xl")).toBeInTheDocument();
      expect(container.querySelector(".h-\\[36px\\]")).toBeInTheDocument();
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
