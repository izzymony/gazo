import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ListItem from "../ListItem";

describe("ListItem", () => {
  it("is a plain div when not interactive", () => {
    render(<ListItem title="Order #1" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("becomes a real button when given onClick", async () => {
    const onClick = jest.fn();
    render(<ListItem title="Order #1" onClick={onClick} />);
    const row = screen.getByRole("button");
    expect(row.tagName).toBe("BUTTON");
    await userEvent.click(row);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is keyboard-operable", async () => {
    const onClick = jest.fn();
    render(<ListItem title="Order #1" onClick={onClick} />);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });

  it("announces an unread row rather than only showing a dot", () => {
    render(<ListItem title="Order #1" leading={<span>icon</span>} showDot />);
    expect(screen.getByText("Unread")).toBeInTheDocument();
  });

  it("lets the caller name what the dot means", () => {
    render(<ListItem title="Order #1" leading={<span>icon</span>} showDot dotLabel="3 new messages" />);
    expect(screen.getByText("3 new messages")).toBeInTheDocument();
  });

  it("shows no dot text when showDot is unset", () => {
    render(<ListItem title="Order #1" leading={<span>icon</span>} />);
    expect(screen.queryByText("Unread")).not.toBeInTheDocument();
  });
});
