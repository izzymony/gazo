import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KebabMenu from "../header/KebabMenu";
import ActivityItem from "../ActivityItem";

describe("KebabMenu", () => {
  // KebabMenu pulls its expandable social menu in via next/dynamic, which
  // resolves after the first paint. findBy* lets that settle inside act rather
  // than tripping the console.error guard on an act() warning.
  it("is a real button, not a clickable div", async () => {
    render(<KebabMenu isOpen={false} setIsOpen={() => {}} store={null} />);
    const trigger = await screen.findByRole("button", { name: /store menu/i });
    expect(trigger.tagName).toBe("BUTTON");
  });

  it("declares that it opens a menu and whether it is open", async () => {
    const { rerender } = render(<KebabMenu isOpen={false} setIsOpen={() => {}} store={null} />);
    const trigger = await screen.findByRole("button", { name: /store menu/i });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    rerender(<KebabMenu isOpen setIsOpen={() => {}} store={null} />);
    expect(screen.getByRole("button", { name: /store menu/i })).toHaveAttribute("aria-expanded", "true");
  });

  it("is keyboard-operable and toggles the controlled state", async () => {
    const setIsOpen = jest.fn();
    render(<KebabMenu isOpen={false} setIsOpen={setIsOpen} store={null} />);
    await screen.findByRole("button", { name: /store menu/i });
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(setIsOpen).toHaveBeenCalledWith(true);
  });
});

describe("ActivityItem", () => {
  it("renders its title and message", () => {
    render(<ActivityItem icon="new_order" title="New order" message="₦19,700" time="2h ago" />);
    expect(screen.getByText("New order")).toBeInTheDocument();
    expect(screen.getByText("₦19,700")).toBeInTheDocument();
  });

  it("becomes a real button when interactive, via ListItem", async () => {
    const onClick = jest.fn();
    render(<ActivityItem icon="new_order" title="New order" time="2h" onClick={onClick} />);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
  });

  it("announces an unread row rather than only showing a dot", () => {
    render(<ActivityItem icon="new_order" title="New order" time="2h" unread />);
    expect(screen.getByText("Unread")).toBeInTheDocument();
  });
});
