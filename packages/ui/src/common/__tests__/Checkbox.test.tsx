import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Checkbox from "../Checkbox";
import Accordion from "../Accordion";
import Loader from "../Loader";
import DetailRow from "../DetailRow";
import DetailList from "../DetailList";
import ComingSoonPill from "../ComingSoonPill";
import StoreStatusBadge from "../StoreStatusBadge";
import VerifiedCheck from "../VerifiedCheck";

describe("Checkbox", () => {
  it("exposes a real checkbox role", () => {
    render(<Checkbox checked={false} onChange={() => {}} label="Save card" />);
    expect(screen.getByRole("checkbox", { name: "Save card" })).toBeInTheDocument();
  });

  it("reflects checked state", () => {
    render(<Checkbox checked onChange={() => {}} label="Save card" />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("is keyboard-operable", async () => {
    const onChange = jest.fn();
    render(<Checkbox checked={false} onChange={onChange} label="Save card" />);
    await userEvent.tab();
    await userEvent.keyboard(" ");
    expect(onChange).toHaveBeenCalled();
  });
});

describe("Accordion", () => {
  it("exposes expanded state on its trigger", () => {
    render(<Accordion title="Shipping">body</Accordion>);
    expect(screen.getByRole("button", { name: /Shipping/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens on click and links the trigger to its panel", async () => {
    render(<Accordion title="Shipping">panel body</Accordion>);
    const trigger = screen.getByRole("button", { name: /Shipping/ });
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls");
    expect(screen.getByText("panel body")).toBeInTheDocument();
  });

  it("honours initiallyOpen", () => {
    render(<Accordion title="Details" initiallyOpen>visible</Accordion>);
    expect(screen.getByText("visible")).toBeInTheDocument();
  });
});

describe("Loader", () => {
  it("announces itself as busy rather than being a silent spinner", () => {
    render(<Loader />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});

describe("DetailRow / DetailList", () => {
  it("pairs a label with its value", () => {
    render(<DetailRow label="Total" value="₦19,700" />);
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("₦19,700")).toBeInTheDocument();
  });

  it("children override value", () => {
    render(<DetailRow label="Status" value="ignored"><span>Delivered</span></DetailRow>);
    expect(screen.getByText("Delivered")).toBeInTheDocument();
    expect(screen.queryByText("ignored")).not.toBeInTheDocument();
  });

  it("DetailList renders an optional group title", () => {
    render(<DetailList title="Payment"><DetailRow label="Method" value="Paystack" /></DetailList>);
    expect(screen.getByText("Payment")).toBeInTheDocument();
  });
});

describe("Badges", () => {
  it("VerifiedCheck renders nothing when not verified, so trust is never implied", () => {
    const { container } = render(<VerifiedCheck verified={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("VerifiedCheck is announced when verified", () => {
    render(<VerifiedCheck verified />);
    expect(screen.getByLabelText("Verified")).toBeInTheDocument();
  });

  it("ComingSoonPill states its own label", () => {
    render(<ComingSoonPill />);
    expect(screen.getByText("Soon")).toBeInTheDocument();
  });

  it("StoreStatusBadge does not rely on colour alone", () => {
    render(<StoreStatusBadge isActive />);
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("StoreStatusBadge distinguishes inactive", () => {
    render(<StoreStatusBadge isActive={false} />);
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });
});
