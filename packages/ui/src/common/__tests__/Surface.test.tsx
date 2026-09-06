import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Surface from "../Surface";
import Avatar from "../Avatar";
import StoreLogo from "../StoreLogo";
import UserProfileImage from "../UserProfileImage";

describe("Surface", () => {
  it("is a plain container when not interactive", () => {
    render(<Surface>content</Surface>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("becomes a real button when given onClick", async () => {
    const onClick = jest.fn();
    render(<Surface onClick={onClick}>tap me</Surface>);
    const el = screen.getByRole("button");
    expect(el.tagName).toBe("BUTTON");
    await userEvent.click(el);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is keyboard-operable when interactive", async () => {
    const onClick = jest.fn();
    render(<Surface onClick={onClick}>tap me</Surface>);
    await userEvent.tab();
    await userEvent.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalled();
  });

  it("takes an accessible name when its content is not self-describing", () => {
    render(<Surface onClick={() => {}} ariaLabel="Open settings"><span>⚙</span></Surface>);
    expect(screen.getByRole("button", { name: "Open settings" })).toBeInTheDocument();
  });

  it("keeps its token classes and merges a caller className", () => {
    render(<Surface className="mt-4">x</Surface>);
    expect(screen.getByText("x")).toHaveClass("rounded-card", "border", "mt-4");
  });
});

describe("Avatar presets", () => {
  it("falls back to initials from a full name", () => {
    render(<Avatar name="Adeola Balogun" />);
    expect(screen.getByText("AB")).toBeInTheDocument();
  });

  it("StoreLogo derives initials from the store name", () => {
    render(<StoreLogo storeName="Aduke Fabrics" />);
    expect(screen.getByText("AF")).toBeInTheDocument();
  });

  it("UserProfileImage derives initials from first and last name", () => {
    render(<UserProfileImage firstName="Chidi" lastName="Okonkwo" />);
    expect(screen.getByText("CO")).toBeInTheDocument();
  });

  it("gives the same person the same colour every render", () => {
    const { unmount } = render(<Avatar name="Adeola Balogun" />);
    const first = screen.getByText("AB").className;
    unmount();
    render(<Avatar name="Adeola Balogun" />);
    expect(screen.getByText("AB").className).toBe(first);
  });
});
