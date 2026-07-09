// ============================================================
// generateFingerprint.js
// ------------------------------------------------------------
// Goal:
// 1. Cookie-safe fingerprint create karna.
// 2. Raw userAgent/screen/timezone ko cookie value me directly nahi bhejna.
// 3. Backend ko ek stable hash dena.
// 4. Readable deviceInfo alag dena, taaki admin/audit me dikhe:
//    - Kaun se system/browser se login hua
//    - Timezone kya tha
//    - Screen size kya tha
//    - Approx location permission se mili to wo, warna null
//
// IMPORTANT:
// Exact location ko fingerprint ka part MAT banao.
// Location change hone par fingerprint badal jayega.
// Location ko sirf deviceInfo/audit log ke liye separate bhejo.
// ============================================================

function getBrowserName(userAgent) {
  if (/Edg/i.test(userAgent)) return "Microsoft Edge";
  if (/Chrome/i.test(userAgent) && !/Edg/i.test(userAgent)) return "Google Chrome";
  if (/Firefox/i.test(userAgent)) return "Mozilla Firefox";
  if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) return "Safari";
  if (/OPR|Opera/i.test(userAgent)) return "Opera";

  return "Unknown Browser";
}

function getOSName(userAgent) {
  if (/Windows NT 10/i.test(userAgent)) return "Windows 10/11";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Mac OS X/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";

  return "Unknown OS";
}

function getDeviceType(userAgent) {
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) return "Mobile/Tablet";
  return "Desktop/Laptop";
}

function getTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  } catch {
    return "unknown";
  }
}

function getCanvasFingerprint() {
  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("TrackAI fingerprint", 2, 2);

    return canvas.toDataURL();
  } catch {
    return "canvas_unavailable";
  }
}

async function sha256Hex(input) {
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(input);

  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBytes);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// ✅ Optional location.
// Browser exact location tabhi dega jab user permission allow karega.
// Isko fingerprint ka part nahi banayenge.
function getApproxBrowserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: Number(position.coords.latitude.toFixed(3)),
          longitude: Number(position.coords.longitude.toFixed(3)),
          accuracyMeters: Math.round(position.coords.accuracy || 0),
        });
      },
      () => {
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 2500,
        maximumAge: 10 * 60 * 1000,
      }
    );
  });
}

/**
 * ✅ Sirf fingerprint string chahiye to ye use karo.
 * Backend LoginRequest.fingerprint agar string expect karta hai, to ye best hai.
 *
 * @returns {Promise<string>} 64-char SHA-256 hex
 */
export async function generateFingerprint() {
  const userAgent = navigator.userAgent || "unknown";
  const language = navigator.language || "unknown";
  const timezone = getTimezone();

  const stableParts = [
    userAgent,
    language,
    timezone,
    screen.width,
    screen.height,
    screen.colorDepth,
    window.devicePixelRatio || 1,
    navigator.platform || "unknown",
    navigator.hardwareConcurrency || "unknown",
    navigator.deviceMemory || "unknown",
    getCanvasFingerprint(),
  ];

  const rawFingerprint = stableParts.join("|");

  return sha256Hex(rawFingerprint);
}

/**
 * ✅ Fingerprint + readable device info dono chahiye to ye use karo.
 * Isme location separate hai, fingerprint ka part nahi.
 *
 * Backend me agar deviceInfo field add kar sakte ho to ye bhejna.
 *
 * @returns {Promise<{ fingerprint: string, deviceInfo: object }>}
 */
export async function generateFingerprintPayload() {
  const userAgent = navigator.userAgent || "unknown";

  const fingerprint = await generateFingerprint();

  const location = await getApproxBrowserLocation();

  const deviceInfo = {
    browser: getBrowserName(userAgent),
    os: getOSName(userAgent),
    deviceType: getDeviceType(userAgent),

    language: navigator.language || "unknown",
    timezone: getTimezone(),

    screen: {
      width: screen.width,
      height: screen.height,
      colorDepth: screen.colorDepth,
      pixelRatio: window.devicePixelRatio || 1,
    },

    hardware: {
      platform: navigator.platform || "unknown",
      cpuCores: navigator.hardwareConcurrency || null,
      deviceMemoryGb: navigator.deviceMemory || null,
    },

    location,

    createdAt: new Date().toISOString(),
  };

  return {
    fingerprint,
    deviceInfo,
  };
}