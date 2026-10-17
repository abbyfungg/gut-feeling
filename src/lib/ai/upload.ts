/** Image upload validation by size and magic bytes (the declared MIME type is not trusted). */

export const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
export const MIN_IMAGE_BYTES = 1024;

export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/heic";

export function sniffImageType(buf: Uint8Array): ImageMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => buf[i] === b)) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...buf.slice(from, to));
  if (buf.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (buf.length >= 12 && ascii(4, 8) === "ftyp" && ["heic", "heix", "mif1", "msf1", "heis"].includes(ascii(8, 12))) return "image/heic";
  return null;
}

export type UploadCheck = { ok: true; mime: ImageMime } | { ok: false; error: string };

export function validateImageUpload(buf: Uint8Array): UploadCheck {
  if (buf.length < MIN_IMAGE_BYTES) return { ok: false, error: "That file is too small to be a photo." };
  if (buf.length > MAX_IMAGE_BYTES) return { ok: false, error: "That photo is over 6 MB. Try a smaller one." };
  const mime = sniffImageType(buf);
  if (!mime) return { ok: false, error: "Please use a JPEG, PNG, WebP or HEIC photo." };
  return { ok: true, mime };
}
