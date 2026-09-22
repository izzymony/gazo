import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import CategorySelector from "../CategorySelector";

// The taxonomy is the only thing this component reads from the network.
const mockUseCategories = jest.fn();
jest.mock("@/hooks/useCategories", () => ({
  useCategories: () => mockUseCategories(),
}));

type Sub = { id?: string; name: string };
const taxonomy = (subs: Sub[]) => [
  {
    id: "cat-uuid-1",
    name: "Men's Fashion",
    description: "",
    created_at: "",
    updated_at: "",
    sub_categories: subs.map((s) => ({
      id: s.id,
      name: s.name,
      description: "",
      category_id: "cat-uuid-1",
      created_at: "",
      updated_at: "",
    })),
  },
];

const withTaxonomy = (categories: unknown[]) =>
  mockUseCategories.mockReturnValue({ categories, loading: false, error: null });

const openPicker = async () => {
  const user = userEvent.setup();
  // The trigger is a div with an onClick and a floating label.
  await user.click(screen.getByText("Product category"));
  return user;
};

beforeEach(() => {
  mockUseCategories.mockReset();
});

/**
 * Why these exist.
 *
 * Product publish failed with "category not found" and the picker looked fine.
 * Three things combined: an empty backend taxonomy fell back to a hardcoded
 * list whose ids are "1".."13" with no ids on its subcategories at all; a
 * `sub.id || sub.name` fallback then submitted a NAME where an id belonged;
 * and the confirm button stayed live throughout, so the seller was invited to
 * submit something unsaveable and told the failure was theirs.
 *
 * Each test below pins one of those states. None of them is visible to
 * type-checking: every value involved is a string.
 */
describe("CategorySelector · product mode · taxonomy unavailable", () => {
  it("offers Retry and does NOT offer a Select category button", async () => {
    // The request succeeded and returned nothing — which looks like neither
    // loading nor an error, and is the case that used to fall back.
    withTaxonomy([]);
    render(<CategorySelector mode="product" onCategorySelect={jest.fn()} />);
    await openPicker();

    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByText("Categories aren't available right now")).toBeInTheDocument();
    // A second full-width primary button under Retry that cannot do anything.
    expect(screen.queryByRole("button", { name: "Select category" })).toBeNull();
  });

  it("shows no category rows to choose from", async () => {
    withTaxonomy([]);
    render(<CategorySelector mode="product" onCategorySelect={jest.fn()} />);
    await openPicker();
    expect(screen.queryByText("Men's Fashion")).toBeNull();
  });
});

describe("CategorySelector · product mode · confirmation gating", () => {
  it("disables confirmation until a category is chosen", async () => {
    withTaxonomy(taxonomy([{ id: "sub-uuid-1", name: "Clothing" }]));
    render(<CategorySelector mode="product" onCategorySelect={jest.fn()} />);
    await openPicker();

    expect(screen.getByRole("button", { name: "Select category" })).toBeDisabled();
  });

  it("keeps confirmation disabled when the chosen sub-category has no id", async () => {
    // The shape the hardcoded fallback produced: a named sub-category with no
    // id. Confirming here is what submitted a name as an id.
    withTaxonomy(taxonomy([{ name: "Clothing" }]));
    const onCategorySelect = jest.fn();
    render(<CategorySelector mode="product" onCategorySelect={onCategorySelect} />);
    const user = await openPicker();

    await user.click(screen.getByText("Men's Fashion"));
    await user.click(screen.getByText("Clothing"));

    expect(screen.getByRole("button", { name: "Select category" })).toBeDisabled();
    // And selecting it must not have submitted anything on its own.
    expect(onCategorySelect).not.toHaveBeenCalled();
  });

  it("enables confirmation only once both ids exist, and submits the IDS", async () => {
    withTaxonomy(taxonomy([{ id: "sub-uuid-1", name: "Clothing" }]));
    const onCategorySelect = jest.fn();
    render(<CategorySelector mode="product" onCategorySelect={onCategorySelect} />);
    const user = await openPicker();

    await user.click(screen.getByText("Men's Fashion"));
    await user.click(screen.getByText("Clothing"));

    const confirm = screen.getByRole("button", { name: "Select category" });
    expect(confirm).toBeEnabled();

    await user.click(confirm);
    expect(onCategorySelect).toHaveBeenCalledWith({
      categoryId: "cat-uuid-1",
      subCategoryId: "sub-uuid-1",
    });
  });
});

describe("CategorySelector · product mode · never submits a name as an id", () => {
  /**
   * Selecting a sub-category ALSO auto-submits, from inside a
   * `setTimeout(..., 200)`. Fake timers are not decoration here: without
   * advancing them the callback never runs, and an assertion that
   * `onCategorySelect` was not called passes for the wrong reason. Verified by
   * mutation — restoring the `sub.id || sub.name` fallback left the earlier
   * version of these tests green.
   */
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const setupWithTimers = () =>
    userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

  it("auto-submits the IDS when both exist", async () => {
    withTaxonomy(taxonomy([{ id: "sub-uuid-1", name: "Clothing" }]));
    const onCategorySelect = jest.fn();
    render(<CategorySelector mode="product" onCategorySelect={onCategorySelect} />);
    const user = setupWithTimers();

    await user.click(screen.getByText("Product category"));
    await user.click(screen.getByText("Men's Fashion"));
    await user.click(screen.getByText("Clothing"));

    // Nothing has been emitted yet — the submit is deferred.
    expect(onCategorySelect).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(onCategorySelect).toHaveBeenCalledWith({
      categoryId: "cat-uuid-1",
      subCategoryId: "sub-uuid-1",
    });
  });

  it("emits NOTHING when the sub-category carries no id, even after the timer fires", async () => {
    // The shape the hardcoded fallback produced. `sub.id || sub.name` used to
    // live on this path, which is how a display name reached the wire as an id
    // and the API answered "category not found".
    withTaxonomy(taxonomy([{ name: "Clothing" }]));
    const onCategorySelect = jest.fn();
    render(<CategorySelector mode="product" onCategorySelect={onCategorySelect} />);
    const user = setupWithTimers();

    await user.click(screen.getByText("Product category"));
    await user.click(screen.getByText("Men's Fashion"));
    await user.click(screen.getByText("Clothing"));

    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(onCategorySelect).not.toHaveBeenCalled();
  });

  it("never puts a NAME in either id field, on any path", async () => {
    withTaxonomy(taxonomy([{ id: "sub-uuid-1", name: "Clothing" }]));
    const onCategorySelect = jest.fn();
    render(<CategorySelector mode="product" onCategorySelect={onCategorySelect} />);
    const user = setupWithTimers();

    await user.click(screen.getByText("Product category"));
    await user.click(screen.getByText("Men's Fashion"));
    await user.click(screen.getByText("Clothing"));
    act(() => {
      jest.advanceTimersByTime(250);
    });

    expect(onCategorySelect).toHaveBeenCalled();
    for (const [payload] of onCategorySelect.mock.calls as [
      { categoryId: string; subCategoryId: string }
    ][]) {
      expect(payload.categoryId).not.toBe("Men's Fashion");
      expect(payload.subCategoryId).not.toBe("Clothing");
      expect(payload.categoryId).toBe("cat-uuid-1");
      expect(payload.subCategoryId).toBe("sub-uuid-1");
    }
  });
});

describe("CategorySelector · store mode is a different contract", () => {
  it("still offers its own list and is unaffected by the backend taxonomy", async () => {
    // Store mode reads the name-keyed `storeCategories`, so an empty backend
    // list must not disable it.
    withTaxonomy([]);
    render(<CategorySelector mode="store" onCategorySelect={jest.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByText("Store category"));

    expect(screen.queryByText("Categories aren't available right now")).toBeNull();
    // No product-mode confirm button in store mode.
    expect(screen.queryByRole("button", { name: "Select category" })).toBeNull();
  });
});
