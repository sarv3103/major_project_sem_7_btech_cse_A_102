/**
 * Resilient API Client with Direct Backend Routing, Retry Logic & Client-Side Image Compression.
 * Ensures large multi-photo claims never hit Vercel's 4.5MB / 25s edge rewrite proxy ceiling
 * and handles Render free-tier cold boots gracefully.
 */

const PROD_BACKEND_ORIGIN = 'https://securewheels-backend.onrender.com';

export function resolveApiUrl(input: string): string {
  if (!input.startsWith('/api/')) return input;
  if (input.startsWith('/api/send-email')) return input;

  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    if (!isLocal) {
      return `${PROD_BACKEND_ORIGIN}${input}`;
    }
  }
  return input;
}

/**
 * Compresses an uploaded image File via HTML5 Canvas so multi-angle photo sets (4-12 images)
 * remain crisp for AI vision & ELA inspection while staying lightweight (~60-110 KB each).
 */
export function compressImageFile(
  file: File,
  maxDim = 1024,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) {
        reject(new Error('Empty image data'));
        return;
      }

      const img = new Image();
      img.onerror = () => resolve(rawDataUrl);
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(rawDataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed.length < rawDataUrl.length ? compressed : rawDataUrl);
        } catch {
          resolve(rawDataUrl);
        }
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export interface ResilientFetchOptions extends RequestInit {
  retries?: number;
  retryDelayMs?: number;
  onWarmup?: (isWarming: boolean) => void;
}

export async function resilientFetch(
  input: string,
  options: ResilientFetchOptions = {}
): Promise<Response> {
  const {
    retries = 2,
    retryDelayMs = 2500,
    onWarmup,
    ...fetchOptions
  } = options;

  const targetUrl = resolveApiUrl(input);
  let attempt = 0;
  let isWarmupTriggered = false;

  while (attempt <= retries) {
    attempt++;

    // Inform UI if server takes >2.5s (meaning cloud instance is waking up)
    const warmupTimer = setTimeout(() => {
      isWarmupTriggered = true;
      if (onWarmup) onWarmup(true);
    }, 2500);

    try {
      const response = await fetch(targetUrl, fetchOptions);
      clearTimeout(warmupTimer);

      // Retry on transient 502/503/504 gateway/cold-start errors
      if ([502, 503, 504].includes(response.status) && attempt <= retries) {
        if (onWarmup) onWarmup(true);
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }

      if (onWarmup && isWarmupTriggered) onWarmup(false);
      return response;
    } catch (err: any) {
      clearTimeout(warmupTimer);

      if (attempt <= retries) {
        if (onWarmup) onWarmup(true);
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }

      if (onWarmup && isWarmupTriggered) onWarmup(false);
      throw err;
    }
  }

  return fetch(targetUrl, fetchOptions);
}
