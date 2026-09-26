/**
 * Caché de imágenes de ejercicios con la Cache API (la misma caché que usa el service worker,
 * `exercise-images`), para que estén disponibles sin conexión.
 */
export const IMAGE_CACHE = 'exercise-images'

export async function cachedCount(urls: readonly string[]) {
  if (!('caches' in window)) return 0
  const cache = await caches.open(IMAGE_CACHE)
  const keys = new Set((await cache.keys()).map((r) => new URL(r.url).pathname))
  return urls.filter((u) => keys.has(u)).length
}

/** Descarga (con concurrencia limitada) las imágenes que aún no estén en caché. */
export async function cacheImages(
  urls: readonly string[],
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
) {
  if (!('caches' in window)) return 0
  const cache = await caches.open(IMAGE_CACHE)
  const cached = new Set((await cache.keys()).map((r) => new URL(r.url).pathname))
  const pending = urls.filter((u) => !cached.has(u))
  const total = urls.length
  let done = total - pending.length
  let failed = 0
  onProgress?.(done, total)
  let next = 0
  const worker = async () => {
    while (next < pending.length && !signal?.aborted) {
      const url = pending[next++]!
      try {
        const response = await fetch(url, { signal })
        if (response.ok) await cache.put(url, response)
        else failed++
      } catch {
        failed++
      }
      onProgress?.(++done, total)
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker))
  return failed
}
