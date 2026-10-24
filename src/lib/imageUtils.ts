/**
 * Compresses and resizes an image data URI to fit within max dimensions and quality.
 * Prevents multi-megabyte payloads from locking up the browser or overflowing API limits.
 */
const DECODE_TIMEOUT_MS = 10_000;

export async function optimizeImage(
  dataUri: string,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.85
): Promise<string> {
  if (typeof window === 'undefined') return dataUri;

  // Some engines occasionally never fire onload/onerror (corrupt blob, killed
  // tab throttling); resolve regardless so the upload flow can't hang forever.
  return new Promise((resolve) => {
    let settled = false;
    const settle = (value: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => settle(dataUri), DECODE_TIMEOUT_MS);

    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      // Already small enough — keep the original bytes. Re-encoding would
      // gratuitously flatten PNG transparency to JPEG.
      if (width <= maxWidth && height <= maxHeight && dataUri.length < 500_000) {
        settle(dataUri);
        return;
      }

      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        settle(dataUri);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      settle(canvas.toDataURL('image/jpeg', quality));
    };

    img.onerror = () => {
      settle(dataUri);
    };

    img.src = dataUri;
  });
}
