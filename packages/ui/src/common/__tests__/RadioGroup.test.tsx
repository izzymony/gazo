import { render, screen } from "@testing-library/react";
import RadioGroup from "../RadioGroup";

const OPTIONS = [
  { label: "Standard", value: "standard" },
  { label: "Express", value: "express" },
];

describe("RadioGroup", () => {
  it("exposes a radiogroup with an accessible name", () => {
    render(
      <RadioGroup label="Delivery speed" options={OPTIONS} name="d" selectedValue={null} onChange={() => {}} />
    );
    expect(screen.getByRole("radiogroup", { name: "Delivery speed" })).toBeInTheDocument();
  });

  it("renders each option as a real radio", () => {
    render(<RadioGroup label="Delivery" options={OPTIONS} name="d" selectedValue={null} onChange={() => {}} />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("marks the selected option checked", () => {
    render(<RadioGroup label="Delivery" options={OPTIONS} name="d" selectedValue="express" onChange={() => {}} />);
    expect(screen.getByRole("radio", { name: /Express/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /Standard/ })).not.toBeChecked();
  });

  it("groups both orientations", () => {
    render(
      <RadioGroup label="Delivery" orientation="column" options={OPTIONS} name="d2" selectedValue={null} onChange={() => {}} />
    );
    expect(screen.getByRole("radiogroup", { name: "Delivery" })).toBeInTheDocument();
  });
});
