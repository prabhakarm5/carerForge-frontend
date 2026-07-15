const ACTIVE_WINDOW_MS = 5 * 60 * 1000;
const ACTIVITY_EVENT = "cf:foreground-activity";

let lastInteractionAt = Date.now();
let foregroundWorkCount = 0;
let installed = false;
let lastNotificationAt = 0;

function notifyActivity() {
  const now = Date.now();
  lastInteractionAt = now;
  if (now - lastNotificationAt < 1_000) return;
  lastNotificationAt = now;
  window.dispatchEvent(new Event(ACTIVITY_EVENT));
}

function installActivityTracking() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  ["pointerdown", "keydown", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, notifyActivity, { passive: true });
  });
  window.addEventListener("focus", notifyActivity);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") notifyActivity();
  });
}

export function isForegroundActive() {
  installActivityTracking();
  return document.visibilityState === "visible"
    && (foregroundWorkCount > 0 || Date.now() - lastInteractionAt <= ACTIVE_WINDOW_MS);
}

export function onForegroundActivity(listener) {
  installActivityTracking();
  window.addEventListener(ACTIVITY_EVENT, listener);
  return () => window.removeEventListener(ACTIVITY_EVENT, listener);
}

export function beginForegroundWork() {
  installActivityTracking();
  foregroundWorkCount += 1;
  notifyActivity();
}

export function endForegroundWork() {
  foregroundWorkCount = Math.max(0, foregroundWorkCount - 1);
}
