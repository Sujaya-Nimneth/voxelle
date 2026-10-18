/**
 * Compresses and resizes an image data URI to fit within max dimensions and quality.
 * Prevents multi-megabyte payloads from locking up the browser or overflowing API limits.
 */
export async function optimizeImage(
  dataUri: string,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.85
): Promise<string> {
  if (typeof window === 'undefined') return dataUri;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;

      if (width <= maxWidth && height <= maxHeight && dataUri.length < 500_000) {
        resolve(dataUri);
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
        resolve(dataUri);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      const optimized = canvas.toDataURL('image/jpeg', quality);
      resolve(optimized);
    };

    img.onerror = () => {
      resolve(dataUri);
    };

    img.src = dataUri;
  });
}
