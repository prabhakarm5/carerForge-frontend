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
let restoreSessionPromise = null;

// ✅ FIX — Auto-retry with backoff jab backend unreachable ho.
// Pehle: ek attempt fail hote hi "backendUnreachable: true" set karke
// ruk jaata tha, koi khud-ba-khud retry nahi hota tha jab tak koi naya
// foreground API call na ho. Ab: pehla attempt turant (jaisa pehle tha),
// fail hone par khud retry hoga — lekin API spam se bachne ke liye
// gradually badhte gap (1s → 2s → 4s → 8s → 15s → 30s → 60s) ke saath.
// Module-level rakha hai (store state nahi) taaki har tick par
// unnecessary re-render na ho.
let reconnectTimer = null;
let reconnectAttempts = 0;

const RECONNECT_DELAYS_MS = [1000, 2000, 4000, 8000, 15000, 30000, 60000];

function getNextReconnectDelay() {
  const index = Math.min(reconnectAttempts, RECONNECT_DELAYS_MS.length - 1);
  return RECONNECT_DELAYS_MS[index];
}

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempts = 0;
}

function scheduleReconnect(retry) {
  // Ek time par sirf ek hi retry pending rahe — duplicate timers na banein.
  if (reconnectTimer) return;

  const delay = getNextReconnectDelay();

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;

    // Tab background me hai — abhi retry mat karo, API waste mat karo.
    // Jab tab wapas visible hogi, App.jsx ka visibilitychange listener
    // khud restoreSession() call karega (turant, delay ke bina).
    if (document.visibilityState !== "visible") return;

    reconnectAttempts += 1;
    retry();
  }, delay);
}

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
  accessToken: null,
  accessTokenExpiresAt: null,

  user: tokenStorage.getUser(),

  isAuthenticated: false,

  sessionChecked: false,

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
    if (restoreSessionPromise) {
      return restoreSessionPromise;
    }

    restoreSessionPromise = (async () => {
      const cachedBeforeRefresh = tokenStorage.getUser();
      if (!cachedBeforeRefresh) {
        clearReconnectTimer();
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

      try {
        const data = await requestRefreshToken();

        const cachedUser = tokenStorage.getUser();
        const restoredUser = cachedUser && data.role
          ? normalizeUser({ ...cachedUser, role: data.role })
          : cachedUser;

        if (restoredUser) tokenStorage.setUser(restoredUser);

        // ✅ Success — koi pending retry ho to cancel karo.
        clearReconnectTimer();

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
          const cachedUser = tokenStorage.getUser();

          set({
            user: cachedUser,
            isAuthenticated: !!cachedUser,
            sessionChecked: true,
            backendUnreachable: true,
          });

          // ✅ Turant band mat karo — backoff ke saath khud retry karo.
          scheduleReconnect(() => get().restoreSession());

          return null;
        }

        const status = error.response?.status;

        if (status === 401) {
          // ✅ Session definitively invalid hai — retry karne ka koi matlab nahi.
          clearReconnectTimer();

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

        // ✅ 500 etc. — server issue ho sakta hai, retry karte raho.
        const cachedUser = tokenStorage.getUser();

        set({
          user: cachedUser,
          isAuthenticated: !!cachedUser,
          sessionChecked: true,
          backendUnreachable: true,
        });

        scheduleReconnect(() => get().restoreSession());

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

    scheduleReconnect(() => get().restoreSession());
  },

  markBackendReachable: () => {
    clearReconnectTimer();
    set({
      backendUnreachable: false,
      sessionChecked: true,
    });
  },

  logoutLocalOnly: () => {
    // ✅ Logout ke baad koi pending reconnect retry na chale.
    clearReconnectTimer();

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