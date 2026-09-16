/**
 * Prepare a product photo for the publish payload.
 *
 * Product images travel as base64 INSIDE the JSON body, so their size is the
 * request's size. Nothing compressed them: every picker called
 * `FileReader.readAsDataURL` on the raw `File`, which ships the whole thing and
 * adds 33% for the encoding. A 4MB phone photo became a 5.3MB request body, and
 * the client aborts at 30s — so on a 1.5 Mbps mobile uplink three ordinary
 * photos exceeded the timeout on transfer alone, before the server decoded
 * anything or called Cloudinary once. That is the default path for a product
 * whose sellers are overwhelmingly on mobile.
 *
 * This resizes to a long edge of 1800px and re-encodes at quality 0.82, which is
 * plenty for a storefront gallery on any screen we serve, and returns the same
 * data-URL shape the API already accepts. The backend contract does not change.
 *
 * It deliberately does NOT:
 *   - upscale. A small photo is returned re-encoded at its own size, or
 *     untouched if re-encoding would make it bigger.
 *   - flatten transparency. A PNG with an alpha channel re-encoded as JPEG gets
 *     a black background, so alpha-capable sources go to WebP and fall back to
 *     PNG where WebP cannot be encoded.
 *   - swallow failures. A caller that cannot prepare an image must not quietly
 *     send the raw one instead; that is the bug this exists to remove.
 */

/** Long edge, in CSS pixels, of a prepared product image. */
export const MAX_LONG_EDGE = 1800;

/** Encoder quality for lossy output. */
export const OUTPUT_QUALITY = 0.82;

export interface PreparedImage {
  /** `data:<mime>;base64,…` — the shape every product picker already stores. */
  dataUrl: string;
  /** Decoded byte size of the source file. */
  originalBytes: number;
  /** Decoded byte size of the result (not the base64 length). */
  preparedBytes: number;
  width: number;
  height: number;
  /** Mime actually produced, which may differ from the source. */
  type: string;
  /** False when the original was returned as-is because re-encoding cost more. */
  recompressed: boolean;
}

export class ImagePreparationError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "ImagePreparationError";
  }
}

/**
 * Target dimensions preserving aspect ratio, never upscaling.
 * Pure, so the rule is testable without a canvas.
 */
export function computeTargetSize(
  width: number,
  height: number,
  maxLongEdge: number = MAX_LONG_EDGE
): { width: number; height: number; scaled: boolean } {
  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge || longEdge === 0) {
    return { width, height, scaled: false };
  }
  const scale = maxLongEdge / longEdge;
  return {
    // `round`, then floor at 1: a very wide panorama can scale its short edge
    // below a pixel, and a zero-height canvas throws.
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scaled: true,
  };
}

/**
 * Which encoder to use for a given source type.
 *
 * JPEG cannot carry an alpha channel, so anything that might have one must not
 * go to JPEG — a logo on a transparent background would come back on black.
 */
export function chooseOutputType(sourceType: string, canEncodeWebp: boolean): string {
  const alphaCapable = /^image\/(png|webp|gif|avif)$/i.test(sourceType);
  if (!alphaCapable) return "image/jpeg";
  return canEncodeWebp ? "image/webp" : "image/png";
}

/** Does this browser's canvas actually encode WebP? Safari did not, for years. */
function canvasSupportsWebp(): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

/** Decode to a bitmap, honouring EXIF orientation so phone photos are upright. */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    // `from-image` applies the EXIF rotation. Without it a portrait photo taken
    // on a phone is drawn sideways, because the rotation lives in metadata that
    // canvas drawing ignores.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("the browser could not decode this image"));
      el.src = url;
    });
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("could not read the prepared image"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Resize and re-encode one product photo.
 *
 * @throws {ImagePreparationError} when the file is not an image, cannot be
 * decoded, or cannot be encoded. Callers must surface this — never fall back to
 * sending the original.
 */
export async function prepareProductImage(
  file: File,
  { maxLongEdge = MAX_LONG_EDGE, quality = OUTPUT_QUALITY } = {}
): Promise<PreparedImage> {
  if (!file || !file.type.startsWith("image/")) {
    throw new ImagePreparationError(`"${file?.name ?? "That file"}" is not an image.`);
  }

  let decoded: Awaited<ReturnType<typeof decode>>;
  try {
    decoded = await decode(file);
  } catch (error) {
    throw new ImagePreparationError(`Couldn't read "${file.name}". It may be damaged.`, error);
  }

  try {
    const { width, height, scaled } = computeTargetSize(decoded.width, decoded.height, maxLongEdge);
    const outputType = chooseOutputType(file.type, canvasSupportsWebp());

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new ImagePreparationError(`Couldn't prepare "${file.name}".`);
    ctx.drawImage(decoded.source, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      // PNG ignores the quality argument; passing it is harmless.
      canvas.toBlob(resolve, outputType, quality)
    );
    if (!blob) throw new ImagePreparationError(`Couldn't prepare "${file.name}".`);

    // Re-encoding can cost more than it saves — an already-optimised JPEG under
    // the size limit, for instance. Keep whichever is smaller, so this can only
    // ever shrink the payload.
    if (!scaled && blob.size >= file.size) {
      return {
        dataUrl: await toDataUrl(file),
        originalBytes: file.size,
        preparedBytes: file.size,
        width: decoded.width,
        height: decoded.height,
        type: file.type,
        recompressed: false,
      };
    }

    return {
      dataUrl: await toDataUrl(blob),
      originalBytes: file.size,
      preparedBytes: blob.size,
      width,
      height,
      type: blob.type || outputType,
      recompressed: true,
    };
  } catch (error) {
    if (error instanceof ImagePreparationError) throw error;
    throw new ImagePreparationError(`Couldn't prepare "${file.name}".`, error);
  } finally {
    decoded.release();
  }
}

/**
 * Prepare several files, keeping the caller's order.
 *
 * Serial on purpose: decoding a 4MB photo to a full-size bitmap is memory-heavy,
 * and five at once is how a mid-range Android tab dies.
 */
export async function prepareProductImages(
  files: File[],
  options?: { maxLongEdge?: number; quality?: number }
): Promise<PreparedImage[]> {
  const prepared: PreparedImage[] = [];
  for (const file of files) {
    prepared.push(await prepareProductImage(file, options));
  }
  return prepared;
}
