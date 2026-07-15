const requests = new Map();

/**
 * Shares an in-flight read request and briefly reuses its result. This keeps
 * widgets that mount together from asking the backend for identical data.
 */
export function dedupeRead(key, loader, cacheMs = 800) {
  const now = Date.now();
  const existing = requests.get(key);

  if (existing?.promise) return existing.promise;
  if (existing && existing.expiresAt > now) return Promise.resolve(existing.value);

  const promise = Promise.resolve()
    .then(loader)
    .then((value) => {
      requests.set(key, { value, expiresAt: Date.now() + cacheMs, promise: null });
      return value;
    })
    .catch((error) => {
      requests.delete(key);
      throw error;
    });

  requests.set(key, { promise, value: undefined, expiresAt: 0 });
  return promise;
}

export function invalidateRead(prefix) {
  for (const key of requests.keys()) {
    if (key.startsWith(prefix)) requests.delete(key);
  }
}
