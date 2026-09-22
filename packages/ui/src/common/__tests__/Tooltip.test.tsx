import { act, fireEvent, render, screen } from "@testing-library/react";
import Tooltip, { pointerCanHover } from "../Tooltip";

const hover = (el: HTMLElement) => fireEvent.pointerEnter(el, { pointerType: "mouse" });

const unhover = (el: HTMLElement) => fireEvent.pointerLeave(el);

/** jsdom has no :focus-visible heuristic, so the trigger is told what it is. */
const focusVisibly = (el: HTMLElement) => {
  jest.spyOn(el, "matches").mockReturnValue(true);
  fireEvent.focus(el);
};

const renderTip = (label = "Shop") =>
  render(
    <Tooltip label={label}>
      <button aria-label="Shop">glyph</button>
    </Tooltip>
  );

describe("Tooltip", () => {
  describe("describing, not naming", () => {
    /**
     * The controls this exists for already carry an accessible name. Wiring the
     * tooltip as a label would announce every destination twice, which is worse
     * than no tooltip at all.
     */
    it("describes the trigger and leaves its name alone", () => {
      renderTip();
      const trigger = screen.getByRole("button", { name: "Shop" });
      hover(trigger);

      expect(trigger).toHaveAttribute("aria-describedby");
      expect(trigger).not.toHaveAttribute("aria-labelledby");
      expect(trigger).toHaveAccessibleName("Shop");
    });

    it("points at the tooltip it actually rendered", () => {
      renderTip();
      const trigger = screen.getByRole("button", { name: "Shop" });
      hover(trigger);
      expect(document.getElementById(trigger.getAttribute("aria-describedby")!)).toHaveTextContent(
        "Shop"
      );
    });

    it("drops the association while closed, so nothing describes a hidden node", () => {
      renderTip();
      expect(screen.getByRole("button")).not.toHaveAttribute("aria-describedby");
    });
  });

  describe("opening", () => {
    it("opens on hover and closes on leave", () => {
      renderTip();
      const trigger = screen.getByRole("button");
      const tip = screen.getByRole("tooltip", { hidden: true });

      hover(trigger);
      expect(tip).toHaveClass("opacity-100");
      unhover(trigger);
      expect(tip).toHaveClass("opacity-0");
    });

    /** The half that usually goes missing: a keyboard user gets nothing. */
    it("opens on keyboard focus, not only on hover", () => {
      renderTip();
      const trigger = screen.getByRole("button");
      focusVisibly(trigger);
      expect(screen.getByRole("tooltip", { hidden: true })).toHaveClass("opacity-100");
    });

    it("closes on blur", () => {
      renderTip();
      const trigger = screen.getByRole("button");
      focusVisibly(trigger);
      fireEvent.blur(trigger);
      expect(screen.getByRole("tooltip", { hidden: true })).toHaveClass("opacity-0");
    });

    /**
     * Pointer and keyboard can both hold it open at once. Letting either one
     * close it would blink the tooltip out from under a mouse that never moved.
     */
    it("stays open while either pointer or focus still holds it", () => {
      renderTip();
      const trigger = screen.getByRole("button");
      const tip = screen.getByRole("tooltip", { hidden: true });

      hover(trigger);
      focusVisibly(trigger);
      fireEvent.blur(trigger);
      expect(tip).toHaveClass("opacity-100");

      unhover(trigger);
      expect(tip).toHaveClass("opacity-0");
    });

    /**
     * A tap fires a pointerenter once; flashing a tooltip on it is noise. Tested
     * on the helper rather than through the component, because jsdom has no
     * PointerEvent — `pointerType` arrives null however it is dispatched, so a
     * component-level test here would pass without exercising the branch.
     */
    it.each([
      ["touch", false],
      ["pen", false],
      ["mouse", true],
      [null, true],
      [undefined, true],
    ])("pointerCanHover(%s) is %s", (kind, expected) => {
      expect(pointerCanHover(kind as string | null | undefined)).toBe(expected);
    });

    it("does not open on a click's focus", () => {
      renderTip();
      const trigger = screen.getByRole("button");
      jest.spyOn(trigger, "matches").mockReturnValue(false);
      fireEvent.focus(trigger);
      expect(screen.getByRole("tooltip", { hidden: true })).toHaveClass("opacity-0");
    });
  });

  describe("Escape", () => {
    it("dismisses without moving focus, so it costs no tab position", () => {
      renderTip();
      const trigger = screen.getByRole("button");
      jest.spyOn(trigger, "matches").mockReturnValue(true);
      act(() => trigger.focus());

      fireEvent.keyDown(trigger, { key: "Escape" });
      expect(screen.getByRole("tooltip", { hidden: true })).toHaveClass("opacity-0");
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("keeps the trigger's own handlers working", () => {
    const onClick = jest.fn();
    render(
      <Tooltip label="Shop">
        <button onClick={onClick}>glyph</button>
      </Tooltip>
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });
});
