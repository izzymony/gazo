import { render, screen } from "@testing-library/react";
import ReviewCard from "../ReviewCard";

describe("ReviewCard", () => {
  // THE BUG. The product page wrapped the comment in `&quot;…&quot;`
  // unconditionally, so a rating left without any written review rendered as a
  // bare pair of quotation marks with nothing between them.
  it("renders no comment paragraph when there is no comment", () => {
    const { container } = render(<ReviewCard rating={4} date="2026-01-02" />);
    expect(container.textContent).not.toContain('"');
    expect(container.textContent).not.toContain("“");
  });

  it("treats a whitespace-only comment as no comment", () => {
    const { container } = render(
      <ReviewCard rating={4} comment="   " date="2026-01-02" />
    );
    expect(container.textContent).not.toContain('"');
  });

  it("shows the comment when there is one, unquoted", () => {
    render(<ReviewCard rating={5} comment="Arrived next day, perfect fit." />);
    expect(screen.getByText("Arrived next day, perfect fit.")).toBeInTheDocument();
  });

  // The seller's "Reviewed" tab hardcoded "Gucci Store" / "Product name goes
  // here" / "Bought White, M" behind an always-empty data array. The API gives
  // a rating a `user_id` and nothing else — no name, no avatar, no variant.
  describe("says only what it was given", () => {
    it("does not invent a reviewer", () => {
      render(<ReviewCard rating={3} />);
      expect(screen.getByText("A shopper")).toBeInTheDocument();
    });

    it("uses a real name when one is supplied", () => {
      render(<ReviewCard rating={3} author={{ name: "Bukky A." }} />);
      expect(screen.getByText("Bukky A.")).toBeInTheDocument();
      expect(screen.queryByText("A shopper")).not.toBeInTheDocument();
    });

    it("omits the subject row unless there is a subject", () => {
      const { rerender } = render(<ReviewCard rating={3} />);
      expect(screen.queryByText("Ankara wrap dress")).not.toBeInTheDocument();
      rerender(<ReviewCard rating={3} subject={{ title: "Ankara wrap dress" }} />);
      expect(screen.getByText("Ankara wrap dress")).toBeInTheDocument();
    });
  });

  describe("date", () => {
    it("renders nothing for a missing or unparseable date", () => {
      const { container, rerender } = render(<ReviewCard rating={4} />);
      expect(container.textContent).not.toMatch(/Invalid Date|NaN/);
      // The optimistic local write used to omit `created_at` entirely.
      rerender(<ReviewCard rating={4} date="not-a-date" />);
      expect(container.textContent).not.toMatch(/Invalid Date|NaN/);
    });

    it("reads as recency when recent", () => {
      render(<ReviewCard rating={4} date={new Date().toISOString()} />);
      expect(screen.getByText("Today")).toBeInTheDocument();
    });
  });

  it("announces the score rather than leaving five shapes", () => {
    render(<ReviewCard rating={4} />);
    expect(screen.getByText("4 out of 5 stars")).toBeInTheDocument();
  });
});
