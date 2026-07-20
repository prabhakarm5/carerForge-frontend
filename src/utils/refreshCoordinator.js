// One browser tab may bootstrap the session while a protected request starts.
// Keep exactly one refresh request in flight so token rotation cannot race itself.
let activeRefreshPromise = null;

export function runRefreshSingleFlight(request) {
  if (activeRefreshPromise) return activeRefreshPromise;

  activeRefreshPromise = Promise.resolve()
    .then(request)
    .finally(() => {
      activeRefreshPromise = null;
    });

  return activeRefreshPromise;
}