import { create } from "zustand";
import { API_BASE_URL } from "../config/api";

import { logout, logoutAllDevices } from "../services/authService";
import { tokenStorage } from "../utils/tokenStorage";

function normalizeUser(raw) {
  if (!raw) return null;

  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role,

    profileImage:
      raw.profileImage ||
      raw.avatar ||
      raw.imageUrl ||
      raw.picture ||
      raw.image ||
      raw.photoUrl ||
      null,

    plan:
      raw.plan ||
      raw.planName ||
      raw.subscriptionPlan ||
      raw.currentPlan ||
      raw.tier ||
      "Free",
  };
}

function decodeJwtExpiry(token) {
  try {
    const payloadBase64 = token.split(".")[1];

    // ✅ JWT base64url hota hai. Browser atob normal base64 expect karta hai.
    const normalizedBase64 = payloadBase64
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(payloadBase64.length / 4) * 4, "=");

    const payloadJson = atob(normalizedBase64);
    const payload = JSON.parse(payloadJson);

    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function getCsrfTokenFromCookie() {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isServerUnreachable(error) {
  return !error?.response;
}

// ✅ restoreSession duplicate call guard.
// React StrictMode ya multiple components ke wajah se duplicate refresh-token call avoid hogi.
let restoreSessionPromise = null;

// ✅ Backend down retry timer.
let restoreSessionRetryTimerId = null;
let restoreSessionRetryAttempt = 0;

const RESTORE_SESSION_BASE_RETRY_DELAY_MS = 5 * 1000;
const RESTORE_SESSION_MAX_RETRY_DELAY_MS = 30 * 1000;

function getRestoreSessionRetryDelay() {
  const delay =
    RESTORE_SESSION_BASE_RETRY_DELAY_MS *
    Math.pow(2, restoreSessionRetryAttempt);

  return Math.min(delay, RESTORE_SESSION_MAX_RETRY_DELAY_MS);
}

function clearRestoreSessionRetryTimer() {
  if (restoreSessionRetryTimerId) {
    clearTimeout(restoreSessionRetryTimerId);
    restoreSessionRetryTimerId = null;
  }
}

// ✅ Fetch use kiya hai taaki authStore -> axiosInstance circular import na bane.
// axiosInstance already authStore ko import karta hai.
async function requestRefreshToken() {
  const csrfToken = getCsrfTokenFromCookie();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh-token`, {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken ? { "X-XSRF-TOKEN": csrfToken } : {}),
      },
    });

    if (!response.ok) {
      const error = new Error(`Refresh token failed with status ${response.status}`);

      error.response = {
        status: response.status,
      };

      throw error;
    }

    return response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

const useAuthStore = create((set, get) => ({
  // ✅ Access token localStorage me nahi rakhenge.
  // Page refresh par ye null ho jayega, fir restoreSession naya token lega.
  accessToken: null,
  accessTokenExpiresAt: null,

  // ✅ Sirf non-sensitive user info localStorage se aa sakti hai.
  user: tokenStorage.getUser(),

  isAuthenticated: false,

  // ✅ Jab tak session check complete nahi hota, routes redirect nahi karenge.
  sessionChecked: false,

  // ✅ Backend down state for banner/retry.
  backendUnreachable: false,

  login: (loginResponse) => {
    const user = normalizeUser(loginResponse);

    tokenStorage.setUser(user);

    set({
      accessToken: loginResponse.accessToken,
      accessTokenExpiresAt: decodeJwtExpiry(loginResponse.accessToken),
      user,
      isAuthenticated: true,
      sessionChecked: true,
      backendUnreachable: false,
    });
  },

  updateUser: (partialUser) => {
    set((state) => {
      const merged = normalizeUser({
        ...state.user,
        ...partialUser,
      });

      tokenStorage.setUser(merged);

      return {
        user: merged,
      };
    });
  },

  restoreSession: async () => {
    // ✅ Agar restore already chal raha hai to duplicate refresh-token hit mat karo.
    if (restoreSessionPromise) {
      return restoreSessionPromise;
    }

    restoreSessionPromise = (async () => {
      const cachedBeforeRefresh = tokenStorage.getUser();
      if (!cachedBeforeRefresh) {
        set({
          accessToken: null,
          accessTokenExpiresAt: null,
          user: null,
          isAuthenticated: false,
          sessionChecked: true,
          backendUnreachable: false,
        });
        return null;
      }

      clearRestoreSessionRetryTimer();

      try {
        const data = await requestRefreshToken();

        restoreSessionRetryAttempt = 0;

        const cachedUser = tokenStorage.getUser();
        const restoredUser = cachedUser && data.role
          ? normalizeUser({ ...cachedUser, role: data.role })
          : cachedUser;

        if (restoredUser) tokenStorage.setUser(restoredUser);

        set({
          accessToken: data.accessToken,
          accessTokenExpiresAt: decodeJwtExpiry(data.accessToken),
          user: restoredUser,
          isAuthenticated: true,
          sessionChecked: true,
          backendUnreachable: false,
        });

        return data.accessToken;
      } catch (error) {
        if (isServerUnreachable(error)) {
          // ✅ Server down/network/CORS issue.
          // Refresh token invalid hai iska proof nahi hai.
          // Cached user hai to same page par rehne do.
          const cachedUser = tokenStorage.getUser();

          const delay = getRestoreSessionRetryDelay();
          restoreSessionRetryAttempt += 1;

          restoreSessionRetryTimerId = setTimeout(() => {
            restoreSessionRetryTimerId = null;
            get().restoreSession();
          }, delay);

          set({
            user: cachedUser,
            isAuthenticated: !!cachedUser,
            sessionChecked: true,
            backendUnreachable: true,
          });

          return null;
        }

        const status = error.response?.status;

        // ✅ Server ne 401/403 diya.
        // Matlab refreshToken cookie invalid/expired/missing hai.
        if (status === 401 || status === 403) {
          restoreSessionRetryAttempt = 0;
          sessionStorage.setItem("cf_auth_notice", "Your session has ended. Please sign in again.");
          tokenStorage.clear();

          set({
            accessToken: null,
            accessTokenExpiresAt: null,
            user: null,
            isAuthenticated: false,
            sessionChecked: true,
            backendUnreachable: false,
          });

          return null;
        }

        // ✅ 500 etc. me logout mat karo. Server issue ho sakta hai.
        const cachedUser = tokenStorage.getUser();

        set({
          user: cachedUser,
          isAuthenticated: !!cachedUser,
          sessionChecked: true,
          backendUnreachable: true,
        });

        return null;
      }
    })();

    try {
      return await restoreSessionPromise;
    } finally {
      restoreSessionPromise = null;
    }
  },

  setAccessToken: (token) => {
    set({
      accessToken: token,
      accessTokenExpiresAt: token ? decodeJwtExpiry(token) : null,
      backendUnreachable: false,
    });
  },

  markBackendUnreachable: () => {
    const cachedUser = tokenStorage.getUser();

    set({
      backendUnreachable: true,
      user: cachedUser,
      isAuthenticated: !!cachedUser || get().isAuthenticated,
      sessionChecked: true,
    });
  },

  markBackendReachable: () => {
    set({
      backendUnreachable: false,
      sessionChecked: true,
    });
  },

  logoutLocalOnly: () => {
    clearRestoreSessionRetryTimer();
    restoreSessionRetryAttempt = 0;

    tokenStorage.clear();

    set({
      accessToken: null,
      accessTokenExpiresAt: null,
      user: null,
      isAuthenticated: false,
      sessionChecked: true,
      backendUnreachable: false,
    });
  },

  logoutCurrentDevice: async () => {
    try {
      await logout();
    } catch {
      // Backend down ho tab bhi local logout karna hai.
    }

    get().logoutLocalOnly();
  },

  logoutEverywhere: async () => {
    try {
      await logoutAllDevices();
    } catch {
      // Backend down ho tab bhi local logout karna hai.
    }

    get().logoutLocalOnly();
  },
}));

export default useAuthStore;