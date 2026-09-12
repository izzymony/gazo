import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Welcome from "../page";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// The screen's own logic is the tab, not the stores: they exist to fetch
// shipping/products and to name the user. Held still so the assertions are
// about what switching intent does to the page.
jest.mock("@/store/authStore", () => ({
  __esModule: true,
  default: () => ({
    socialCallback: jest.fn(),
    user: { user_name: "michael" },
    authtypes: null,
    isAuthenticated: true,
  }),
}));
jest.mock("@/store/productStore", () => ({
  __esModule: true,
  default: () => ({ setAllProducts: jest.fn(), fetchAllProduct: jest.fn() }),
}));
jest.mock("@/store/shippingStore", () => ({
  __esModule: true,
  default: () => ({ fetchShippings: jest.fn() }),
}));
jest.mock("../pagination", () => ({ paginatedFetcher: jest.fn() }));

beforeEach(() => push.mockClear());

describe("the welcome screen", () => {
  it("greets the user by name", () => {
    render(<Welcome />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("michael");
  });

  it("offers both intents, selling first", () => {
    render(<Welcome />);
    expect(screen.getByRole("button", { name: "I want to sell" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "I want to buy" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  describe("switching intent", () => {
    it("swaps the reasons to the buyer's", async () => {
      render(<Welcome />);
      expect(screen.getByText("Set Up Your Store in Minutes")).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "I want to buy" }));

      expect(screen.queryByText("Set Up Your Store in Minutes")).not.toBeInTheDocument();
      expect(screen.getByText("Shop from verified Instagram sellers")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Why buyers love Vibaar" })).toBeInTheDocument();
    });

    it("swaps the action, since the two intents lead to different places", async () => {
      render(<Welcome />);
      expect(screen.getByRole("button", { name: /Launch your store/ })).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "I want to buy" }));

      expect(screen.getByRole("button", { name: /Start shopping/ })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Launch your store/ })).not.toBeInTheDocument();
    });

    it("sends a buyer to the marketplace", async () => {
      render(<Welcome />);
      await userEvent.click(screen.getByRole("button", { name: "I want to buy" }));
      await userEvent.click(screen.getByRole("button", { name: /Start shopping/ }));
      expect(push).toHaveBeenCalledWith("/shop");
    });
  });

  it("renders the action once — the shell positions it rather than duplicating it", () => {
    render(<Welcome />);
    expect(screen.getAllByRole("button", { name: /Launch your store/ })).toHaveLength(1);
  });
});
