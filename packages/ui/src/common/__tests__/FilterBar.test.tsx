import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FilterBar from "../FilterBar";

const PILLS = ["All", "Dresses", "Shoes"];

describe("FilterBar", () => {
  it("renders every pill as a real button", () => {
    render(<FilterBar pills={PILLS} activePill={0} onPillChange={() => {}} />);
    for (const pill of PILLS) {
      expect(screen.getByRole("button", { name: pill })).toBeInTheDocument();
    }
  });

  describe("pill state", () => {
    // The defect: these were <div onClick> — not focusable, no role, ignoring
    // Enter and Space, so the filters could not be used from a keyboard at all.
    it("marks the active filter with aria-pressed rather than colour alone", () => {
      render(<FilterBar pills={PILLS} activePill={1} onPillChange={() => {}} />);
      expect(screen.getByRole("button", { name: "Dresses" })).toHaveAttribute(
        "aria-pressed",
        "true"
      );
      expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
    });

    it("reports the index that was chosen", async () => {
      const onPillChange = jest.fn();
      render(<FilterBar pills={PILLS} activePill={0} onPillChange={onPillChange} />);
      await userEvent.click(screen.getByRole("button", { name: "Shoes" }));
      expect(onPillChange).toHaveBeenCalledWith(2);
    });

    it("is operable from the keyboard", async () => {
      const onPillChange = jest.fn();
      render(<FilterBar pills={PILLS} activePill={0} onPillChange={onPillChange} />);
      screen.getByRole("button", { name: "Dresses" }).focus();
      await userEvent.keyboard("{Enter}");
      expect(onPillChange).toHaveBeenCalledWith(1);
    });

    it("names the filter set for screen readers", () => {
      render(
        <FilterBar
          pills={PILLS}
          activePill={0}
          onPillChange={() => {}}
          ariaLabel="Filter products"
        />
      );
      expect(screen.getByRole("group", { name: "Filter products" })).toBeInTheDocument();
    });
  });

  describe("search and sort", () => {
    it("names both controls — they were unlabelled divs wrapping bare SVGs", () => {
      render(<FilterBar pills={PILLS} activePill={0} onPillChange={() => {}} />);
      expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Sort" })).toBeInTheDocument();
    });

    it("reveals the search field and says so", async () => {
      render(<FilterBar pills={PILLS} activePill={0} onPillChange={() => {}} />);
      const toggle = screen.getByRole("button", { name: "Search" });
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      await userEvent.click(toggle);
      expect(screen.getByRole("button", { name: "Hide search" })).toHaveAttribute(
        "aria-expanded",
        "true"
      );
      expect(screen.getByPlaceholderText("Search")).toBeInTheDocument();
    });

    it("can hide either control", () => {
      render(
        <FilterBar
          pills={PILLS}
          activePill={0}
          onPillChange={() => {}}
          showSearch={false}
          showSort={false}
        />
      );
      expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Sort" })).not.toBeInTheDocument();
    });
  });
});
