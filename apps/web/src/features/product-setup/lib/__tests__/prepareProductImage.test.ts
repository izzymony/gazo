import {
  computeTargetSize,
  chooseOutputType,
  prepareProductImage,
  ImagePreparationError,
  MAX_LONG_EDGE,
} from "../prepareProductImage";

describe("computeTargetSize", () => {
  it("never upscales", () => {
    expect(computeTargetSize(800, 600)).toEqual({ width: 800, height: 600, scaled: false });
    expect(computeTargetSize(100, 100)).toEqual({ width: 100, height: 100, scaled: false });
  });

  it("leaves an image already at the limit alone", () => {
    expect(computeTargetSize(MAX_LONG_EDGE, 900)).toEqual({
      width: MAX_LONG_EDGE, height: 900, scaled: false,
    });
  });

  it("scales the long edge down and preserves aspect ratio", () => {
    // A 12MP phone photo, 4:3 landscape.
    const r = computeTargetSize(4032, 3024);
    expect(r).toEqual({ width: 1800, height: 1350, scaled: true });
    expect(r.width / r.height).toBeCloseTo(4032 / 3024, 3);
  });

  it("works the same in portrait", () => {
    const r = computeTargetSize(3024, 4032);
    expect(r).toEqual({ width: 1350, height: 1800, scaled: true });
  });

  it("keeps a sub-pixel short edge at 1px rather than 0", () => {
    // A zero-height canvas throws; a panorama can round its short edge to zero.
    const r = computeTargetSize(20000, 5);
    expect(r.height).toBe(1);
    expect(r.width).toBe(1800);
  });

  it("does not divide by zero on a degenerate image", () => {
    expect(computeTargetSize(0, 0)).toEqual({ width: 0, height: 0, scaled: false });
  });
});

describe("chooseOutputType", () => {
  it("sends photographs to JPEG", () => {
    expect(chooseOutputType("image/jpeg", true)).toBe("image/jpeg");
    expect(chooseOutputType("image/heic", true)).toBe("image/jpeg");
  });

  it("never sends an alpha-capable source to JPEG", () => {
    // JPEG has no alpha channel: a transparent logo would come back on black.
    for (const t of ["image/png", "image/webp", "image/gif", "image/avif"]) {
      expect(chooseOutputType(t, true)).not.toBe("image/jpeg");
      expect(chooseOutputType(t, false)).not.toBe("image/jpeg");
    }
  });

  it("prefers WebP for alpha, and falls back to PNG where WebP cannot be encoded", () => {
    expect(chooseOutputType("image/png", true)).toBe("image/webp");
    expect(chooseOutputType("image/png", false)).toBe("image/png");
  });
});

describe("prepareProductImage", () => {
  it("rejects a non-image rather than passing it through", async () => {
    const file = new File(["not an image"], "invoice.pdf", { type: "application/pdf" });
    await expect(prepareProductImage(file)).rejects.toBeInstanceOf(ImagePreparationError);
    await expect(prepareProductImage(file)).rejects.toThrow(/is not an image/);
  });

  it("names the file in the error, so the seller knows which one to replace", async () => {
    const file = new File(["x"], "receipt.txt", { type: "text/plain" });
    await expect(prepareProductImage(file)).rejects.toThrow(/receipt\.txt/);
  });
});
