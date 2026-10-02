import zlib from "node:zlib";

/**
 * Real image bytes for the upload journeys.
 *
 * The local suite set `input[type=file]` to a 1×1 PNG embedded as base64, which
 * is fine when the upload is intercepted. Against staging the file actually
 * travels: the client resizes it, encodes it as a data URI, and the backend
 * decodes that base64 and pushes it to Cloudinary. A 1×1 pixel exercises none of
 * that, and an https URL is not accepted at all — the backend answers with a
 * bare "something went wrong".
 *
 * Generated rather than committed, for the same reason as the photo-upload
 * fixture: five real photos would put megabytes of binaries in the repo.
 */

const table = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buf: Buffer) => {
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
};

const ihdr = (side: number) => {
  const head = Buffer.alloc(13);
  head.writeUInt32BE(side, 0);
  head.writeUInt32BE(side, 4);
  head[8] = 8; // bit depth
  head[9] = 2; // 8-bit RGB
  return head;
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * A multi-megabyte PNG of pure noise.
 *
 * Noise on purpose: a solid colour compresses to a few hundred bytes, which
 * would skip the resizing, re-encoding and upload budget the upload journeys
 * exist to measure.
 */
export function noisePng(side: number): Buffer {
  const rows: Buffer[] = [];
  for (let y = 0; y < side; y++) {
    const row = Buffer.alloc(side * 3 + 1);
    for (let i = 1; i < row.length; i++) row[i] = Math.floor(Math.random() * 256);
    rows.push(row);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr(side)),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows), { level: 1 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** A small solid-colour PNG. Cheap enough for "does a file get stored at all". */
export function solidPng(size: number, rgb: [number, number, number]): Buffer {
  const row = Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: size }, () => Buffer.from(rgb)))]);
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", ihdr(size)),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** The shape `setInputFiles` takes. */
export function uploadFile(name: string, buffer: Buffer) {
  return { name, mimeType: "image/png", buffer };
}