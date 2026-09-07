/**
 * The type a picker claims, turned into one that actually exists.
 *
 * Android pickers report `image/jpg` for a JPEG. That is not a MIME type — it
 * never has been; the registered name is `image/jpeg` and `jpg` is only ever a
 * file extension. Storage rejected the upload with "mime type image/jpg is not
 * supported", which is correct and completely unhelpful to a driver standing
 * at a loading bay.
 *
 * Fixed here rather than by widening the bucket's allow-list. A bucket that
 * accepts `image/jpg` stores files labelled with a type no browser, viewer or
 * mail client recognises, and that label is what the office's preview and
 * every download after it will trust.
 */
const ALIASES: Record<string, string> = {
  // The one Android actually sends.
  'image/jpg': 'image/jpeg',
  // Internet Explorer's old upload type. Still emitted by some libraries.
  'image/pjpeg': 'image/jpeg',
  'image/x-png': 'image/png',
  // HEIF is the container, HEIC the profile phones write. The bucket takes heic.
  'image/heif': 'image/heic',
  'image/heif-sequence': 'image/heic',
  'image/heic-sequence': 'image/heic',
};

/**
 * A photograph, when the picker said nothing useful.
 *
 * Every path into this is a camera or a photo library, so a JPEG is the honest
 * guess — and a guess is better than an empty content type, which storage
 * stores as `application/octet-stream` and every viewer then refuses to draw.
 */
const FALLBACK = 'image/jpeg';

export function normaliseMimeType(value: string | null | undefined): string {
  // Parameters like "; charset=..." are legal and meaningless on an image.
  const clean = (value ?? '').split(';')[0].trim().toLowerCase();
  if (!clean) return FALLBACK;
  return ALIASES[clean] ?? clean;
}
