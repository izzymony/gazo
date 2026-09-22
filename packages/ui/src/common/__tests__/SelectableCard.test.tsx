import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectableCard from "../SelectableCard";
import Button from "../Button";
import IconButton from "../IconButton";
import { Heart } from "../../icons";

describe("SelectableCard", () => {
  it("is a real button — these were bordered divs with an onClick", () => {
    render(<SelectableCard onSelect={() => {}}>Passport</SelectableCard>);
    expect(screen.getByRole("button", { name: "Passport" })).toBeInTheDocument();
  });

  it("says which option is selected rather than only colouring its border", () => {
    const { rerender } = render(<SelectableCard>Passport</SelectableCard>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    rerender(<SelectableCard selected>Passport</SelectableCard>);
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("reports the choice", async () => {
    const onSelect = jest.fn();
    render(<SelectableCard onSelect={onSelect}>Driver&apos;s licence</SelectableCard>);
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("is operable from the keyboard", async () => {
    const onSelect = jest.fn();
    render(<SelectableCard onSelect={onSelect}>NIN slip</SelectableCard>);
    screen.getByRole("button").focus();
    await userEvent.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalled();
  });

  it("takes a name when its content does not read as one", () => {
    render(
      <SelectableCard tone="dashed" ariaLabel="Upload the front of your document">
        <span aria-hidden="true">＋</span>
      </SelectableCard>
    );
    expect(
      screen.getByRole("button", { name: "Upload the front of your document" })
    ).toBeInTheDocument();
  });

  it("dashed marks an empty slot", () => {
    render(<SelectableCard tone="dashed">Add</SelectableCard>);
    expect(screen.getByRole("button")).toHaveClass("border-dashed");
  });

  it("blocks selection when disabled", async () => {
    const onSelect = jest.fn();
    render(
      <SelectableCard disabled onSelect={onSelect}>
        Unavailable
      </SelectableCard>
    );
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("Button variant=link", () => {
  // Eight screens hand-rolled `<button className="text-brandDeep font-medium">`
  // because filled / bordered / ghost all draw a pill, and a pill is wrong for
  // an action sitting inside prose.
  it("carries no pill box", () => {
    render(
      <Button variant="link" fullWidth={false}>
        Resend code
      </Button>
    );
    const button = screen.getByRole("button", { name: "Resend code" });
    expect(button).toHaveClass("text-brandDeep", "p-0");
    expect(button).not.toHaveClass("bg-brand");
  });

  it("drops the size padding that would otherwise win", () => {
    render(
      <Button variant="link" size="md" fullWidth={false}>
        Change
      </Button>
    );
    expect(screen.getByRole("button")).not.toHaveClass("py-3", "px-4");
  });
});

describe("IconButton variant=overlay", () => {
  it("carries its own scrim, because the image underneath is not a known colour", () => {
    render(<IconButton icon={Heart} label="Save" variant="overlay" />);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button).toHaveClass("bg-overlay/15", "text-white", "backdrop-blur-sm");
  });
});
