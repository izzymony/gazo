import { isTaxonomyId } from "../useCategories";

/**
 * The publish path submits `category_id` / `sub_category_id` straight to an API
 * that validates them as `uuid4` and resolves them by primary key. Everything
 * below is a value the picker actually put on the wire at some point, and each
 * one came back as a bare "category not found" after the seller hit Publish.
 */
describe("isTaxonomyId", () => {
  it("rejects an index from the hardcoded taxonomy", () => {
    // The picker fell back to a hardcoded list whose ids are "1".."13".
    expect(isTaxonomyId("9")).toBe(false);
    expect(isTaxonomyId("13")).toBe(false);
  });

  it("rejects a display name used in place of a missing id", () => {
    // `sub.id || sub.name` — the hardcoded subcategories carry no id at all.
    expect(isTaxonomyId("Auto Accessories")).toBe(false);
    expect(isTaxonomyId("Men's Fashion")).toBe(false);
  });

  it("does NOT catch the retired fallback uuids — shape is all it checks", () => {
    // These are v4-shaped and dead: 003_emergency_category_fix.sql migrated
    // products off them. A shape guard cannot know that, so the guard passes
    // them and only the API rejects them. Recorded so nobody mistakes this
    // function for existence checking: the real fix was deleting the code that
    // invented them, not validating them afterwards.
    expect(isTaxonomyId("9aebee99-0435-4ca1-bf82-7657bd35691a")).toBe(true);
  });

  it("rejects empty and non-string values", () => {
    expect(isTaxonomyId("")).toBe(false);
    expect(isTaxonomyId(undefined)).toBe(false);
    expect(isTaxonomyId(null)).toBe(false);
    expect(isTaxonomyId(42)).toBe(false);
  });

  it("accepts real taxonomy ids", () => {
    // Auto & Accessories, and its Auto Accessories child.
    expect(isTaxonomyId("48ca40e6-d62d-449a-b086-9363eb3eafc4")).toBe(true);
    expect(isTaxonomyId("010590e6-af3c-4a35-a643-f0104639b13e")).toBe(true);
  });

  it("rejects uuids that are not v4", () => {
    expect(isTaxonomyId("48ca40e6-d62d-149a-b086-9363eb3eafc4")).toBe(false); // version 1
    expect(isTaxonomyId("48ca40e6-d62d-449a-c086-9363eb3eafc4")).toBe(false); // bad variant
  });
});
