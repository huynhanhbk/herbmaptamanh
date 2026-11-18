/**
 * Utility for client-side image compression and resizing
 * Drastically reduces image payload sizes to prevent Storage Quota errors
 */

export async function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function compressBase64Image(
  dataUrl: string,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.78,
  force = false
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  // If already small (< 150KB) and not forced, no need to compress
  if (!force && dataUrl.length < 200000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export async function compressBase64ToLimit(
  dataUrl: string,
  maxChars = 140000,
  initialMaxDim = 900
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image') || dataUrl.length <= maxChars) {
    return dataUrl;
  }

  const attempts: Array<{ dim: number; quality: number }> = [
    { dim: initialMaxDim, quality: 0.72 },
    { dim: Math.min(initialMaxDim, 760), quality: 0.6 },
    { dim: Math.min(initialMaxDim, 640), quality: 0.5 },
    { dim: Math.min(initialMaxDim, 520), quality: 0.42 },
    { dim: 420, quality: 0.35 },
    { dim: 320, quality: 0.3 },
  ];

  let current = dataUrl;
  for (const step of attempts) {
    const next = await compressBase64Image(current, step.dim, step.dim, step.quality, true);
    if (next && next.startsWith('data:image') && next.length < current.length) {
      current = next;
    }
    if (current.length <= maxChars) {
      return current;
    }
  }

  return current;
}

export async function compressImageFileToLimit(
  file: File,
  maxChars = 140000,
  maxWidth = 900,
  maxHeight = 900
): Promise<string> {
  const initial = await compressImageFile(file, maxWidth, maxHeight, 0.75);
  if (!initial || !initial.startsWith('data:image') || initial.length <= maxChars) {
    return initial;
  }
  return compressBase64ToLimit(initial, maxChars, Math.max(maxWidth, maxHeight));
}

