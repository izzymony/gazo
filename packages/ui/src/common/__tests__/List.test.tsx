import { render, screen } from "@testing-library/react";
import List from "../List";
import ListItem from "../ListItem";
import ListSectionHeader from "../ListSectionHeader";

describe("List", () => {
  it("announces itself as a list with a countable number of items", () => {
    render(
      <List label="Recent orders">
        {["a", "b", "c"].map((t) => (
          <ListItem key={t} asListItem title={t} />
        ))}
      </List>
    );
    expect(screen.getByRole("list", { name: "Recent orders" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("keeps the list role even though the list is unstyled", () => {
    const { container } = render(<List>{null}</List>);
    expect(container.querySelector("ul")).toHaveAttribute("role", "list");
  });

  it("ListItem renders bare when not marked asListItem", () => {
    render(<ListItem title="loose row" />);
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});

describe("ListSectionHeader", () => {
  it("renders its title as a real heading", () => {
    render(<ListSectionHeader title="Recent orders" />);
    expect(screen.getByRole("heading", { name: "Recent orders" }).tagName).toBe("H2");
  });

  it("honours titleAs", () => {
    render(<ListSectionHeader title="Nested" titleAs="h3" />);
    expect(screen.getByRole("heading", { name: "Nested" }).tagName).toBe("H3");
  });

  it("exposes the action as a button", () => {
    render(<ListSectionHeader title="Orders" action={{ label: "See all", onClick: () => {} }} />);
    expect(screen.getByRole("button", { name: "See all" })).toBeInTheDocument();
  });
});
