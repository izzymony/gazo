import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageActionButton from "../PageActionButton";

/**
 * ONE node serves the mobile bar and the desktop action. The alternative —
 * rendering it twice and hiding one per breakpoint — was rejected because two
 * submit buttons for one form make the FIRST IN DOM the implicit-submission
 * default, i.e. the hidden one, and because loading/disabled would then need
 * keeping in sync across two copies.
 */
describe("PageActionButton", () => {
  it("is full-width on mobile and hugs its content at lg", () => {
    render(<PageActionButton onClick={() => {}}>Save changes</PageActionButton>);
    expect(screen.getByRole("button", { name: "Save changes" })).toHaveClass(
      "w-full",
      "mt-4",
      "lg:w-fit",
      "lg:mt-0"
    );
  });

  // 44px against the 48px desktop row — the same node is the same size in both
  // positions, so only width and margin are responsive.
  it("keeps the md size in both positions", () => {
    render(<PageActionButton onClick={() => {}}>Save</PageActionButton>);
    expect(screen.getByRole("button", { name: "Save" })).toHaveClass("py-3", "text-body");
  });

  it("maps kind onto the button variants", () => {
    const { rerender } = render(<PageActionButton onClick={() => {}}>Go</PageActionButton>);
    expect(screen.getByRole("button")).toHaveClass("bg-brand");
    rerender(
      <PageActionButton kind="secondary" onClick={() => {}}>
        Cancel
      </PageActionButton>
    );
    expect(screen.getByRole("button")).toHaveClass("border-brandDeep");
  });

  it("carries loading and disabled through to one node", async () => {
    const onClick = jest.fn();
    render(
      <PageActionButton onClick={onClick} disabled>
        Save
      </PageActionButton>
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders exactly one node for one action", () => {
    render(<PageActionButton onClick={() => {}}>Save changes</PageActionButton>);
    expect(screen.getAllByRole("button", { name: "Save changes" })).toHaveLength(1);
  });
});
