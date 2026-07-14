export interface ExpiringPromiseCacheEntry<T> {
  expiresAt: number;
  promise: Promise<T>;
}

export function getCachedPromise<T>(
  cache: Map<string, ExpiringPromiseCacheEntry<T>>,
  key: string,
  ttlMs: number,
  factory: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const existing = cache.get(key);

  if (existing && existing.expiresAt > now) {
    return existing.promise;
  }

  const trackedPromise = Promise.resolve()
    .then(factory)
    .catch((error) => {
      cache.delete(key);
      throw error;
    });

  cache.set(key, {
    expiresAt: now + ttlMs,
    promise: trackedPromise,
  });

  return trackedPromise;
}
