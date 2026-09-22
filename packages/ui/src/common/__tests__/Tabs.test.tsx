import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Tabs from "../Tabs";
import { listBlockGap, listContentGap } from "../../styles";

const setup = (onTabChange?: (i: number) => void) =>
  render(
    <Tabs
      tabs={["Orders", "Reviews", "About"]}
      tabContents={[<p key="a">Orders panel</p>, <p key="b">Reviews panel</p>, <p key="c">About panel</p>]}
      onTabChange={onTabChange}
    />
  );

// The tab PATTERN, not the styling. Before this the selected tab was only a
// border colour — no roles, no aria-selected, no panel association.
describe("Tabs", () => {
  it("exposes a tablist with one tab per label", () => {
    setup();
    expect(screen.getByRole("tablist")).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(3);
  });

  it("marks exactly one tab selected, and it is the first by default", () => {
    setup();
    const tabs = screen.getAllByRole("tab");
    expect(tabs.filter((t) => t.getAttribute("aria-selected") === "true")).toHaveLength(1);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  });

  it("moves the selected state on click and reports the index", async () => {
    const onTabChange = jest.fn();
    setup(onTabChange);
    await userEvent.click(screen.getByRole("tab", { name: "Reviews" }));
    expect(screen.getByRole("tab", { name: "Reviews" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Orders" })).toHaveAttribute("aria-selected", "false");
    expect(onTabChange).toHaveBeenCalledWith(1);
  });

  it("links the visible panel back to its tab", async () => {
    setup();
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveTextContent("Orders panel");
    expect(panel.getAttribute("aria-labelledby")).toBe(screen.getByRole("tab", { name: "Orders" }).id);
    await userEvent.click(screen.getByRole("tab", { name: "About" }));
    const next = screen.getByRole("tabpanel");
    expect(next).toHaveTextContent("About panel");
    expect(next.getAttribute("aria-labelledby")).toBe(screen.getByRole("tab", { name: "About" }).id);
  });

  it("is one tab stop, with arrows moving between tabs", async () => {
    setup();
    const [orders, reviews, about] = screen.getAllByRole("tab");
    expect(orders).toHaveAttribute("tabindex", "0");
    expect(reviews).toHaveAttribute("tabindex", "-1");
    orders.focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(reviews).toHaveAttribute("aria-selected", "true");
    // wraps backwards from the first tab
    await userEvent.click(orders);
    orders.focus();
    await userEvent.keyboard("{ArrowLeft}");
    expect(about).toHaveAttribute("aria-selected", "true");
  });

  it("renders only the active panel", async () => {
    setup();
    expect(screen.getByText("Orders panel")).toBeInTheDocument();
    expect(screen.queryByText("Reviews panel")).not.toBeInTheDocument();
  });

  /**
   * Every list screen is header (+ tabs) → a row of controls → the list. Four
   * pages each decided the gaps for themselves, so the controls sat flush under
   * the tab bar on one screen and 24px below it on another, and the gap beneath
   * them was 16px in one place and 32px in another. `listContentGap` (with
   * tabs) and `listBlockGap` (without) are the same 8px, each pairing with the
   * control row's own `py-2` for one 16px gap everywhere.
   */
  describe("list rhythm", () => {
    it("puts the control row in the tab bar's own sticky block", () => {
      render(
        <Tabs
          tabs={["One", "Two"]}
          tabContents={[<p key={0}>a</p>, <p key={1}>b</p>]}
          generalContent={<div data-testid="controls" />}
        />
      );
      const block = screen.getByRole("tablist").parentElement!;
      expect(block).toContainElement(screen.getByTestId("controls"));
      expect(block.className).toContain("sticky");
    });

    it("uses listContentGap below a control row", () => {
      render(
        <Tabs
          tabs={["One", "Two"]}
          tabContents={[<p key={0}>a</p>, <p key={1}>b</p>]}
          generalContent={<div />}
        />
      );
      expect(screen.getByRole("tabpanel").parentElement!.className).toBe(listContentGap);
    });

    it("is the same gap a page without tabs uses", () => {
      // Both are 8px; if one moves the other has to move with it.
      expect(listContentGap.replace("mt-", "")).toBe(listBlockGap.replace("space-y-", ""));
    });
  });
});
