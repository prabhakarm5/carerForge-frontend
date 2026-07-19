import axios from "axios";
import { API_BASE_URL } from "../config/api";
import useAuthStore from "../store/authStore";
import { isForegroundActive, onForegroundActivity } from "./authActivity";
import { notifyRechargeForError } from "./rechargeEvents";

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true, // ✅ httpOnly refreshToken/fingerprint cookies auto-bhejne ke liye
});

// ================= STATE =================
let isRefreshing = false;
let failedQueue = [];
let refreshTimerId = null;

const REFRESH_CHANNEL_NAME = "auth-refresh-channel";
const refreshChannel = ("BroadcastChannel" in window)
    ? new BroadcastChannel(REFRESH_CHANNEL_NAME)
    : null;

let crossTabWaiters = [];

// ✅ Access token expire hone se 1 min PEHLE hi proactive refresh —
// app.jwt.access-token-expiry: 15m ke hisaab se buffer rakha hai.
const REFRESH_BUFFER_MS = 60 * 1000;

// Refresh only on foreground demand. A temporary failure gets a short cooldown;
// there is no background retry loop and no logout unless refresh returns 401.
let refreshPending = false;
let nextRefreshAttemptAt = 0;
const REFRESH_RETRY_COOLDOWN_MS = 15 * 1000;

function getCsrfTokenFromCookie() {
    const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function processQueue(error, token = null) {
    failedQueue.forEach((promise) => {
        if (error) promise.reject(error);
        else promise.resolve(token);
    });
    failedQueue = [];
}

function settleRefreshWaiters(error, token = null) {
    crossTabWaiters.forEach(({ resolve, reject }) => {
        if (error) reject(error);
        else resolve(token);
    });
    crossTabWaiters = [];
}

// ✅ NEW — server "down/unreachable" vs "responded but refresh token
// invalid/expired" ke beech fark batane wala helper.
//
// Axios ka rule: agar server ne HTTP response diya (chahe 401/403/500
// hi kyun na ho), to error.response defined hota hai. Agar request
// server tak pahuchi hi nahi (server band, connection refused, DNS
// fail, timeout, CORS preflight fail, network gaya) — to error.response
// UNDEFINED hota hai.
//
// Isi second case (undefined) ko hum "server down" maanke session ko
// haath nahi lagate.
function isServerUnreachable(error) {
    return !error?.response;
}


function isAuthBootstrapRequest(url = "") {
    return url.includes("/api/auth/login")
        || url.includes("/api/auth/register")
        || url.includes("/api/auth/refresh-token")
        || url.includes("/api/auth/oauth-session")
        || url.includes("/api/auth/verify")
        || url.includes("/api/auth/resend-verification")
        || url.includes("/api/auth/forgot-password")
        || url.includes("/api/auth/verify-reset-otp")
        || url.includes("/api/auth/reset-password")
        || url.includes("/api/auth/resend-reset-otp")
        || url.includes("/api/auth/admin-login")
        || url.includes("/api/auth/verify-admin-login-otp")
        || url.includes("/api/auth/resend-admin-login-otp");
}
function isPublicRoute(pathname = window.location.pathname) {
    return pathname === "/"
        || pathname.startsWith("/login")
        || pathname.startsWith("/register")
        || pathname.startsWith("/verification-")
        || pathname.startsWith("/verify-email")
        || pathname.startsWith("/forgot-password")
        || pathname.startsWith("/verify-reset-otp")
        || pathname.startsWith("/reset-password")
        || pathname.startsWith("/oauth/")
        || pathname.startsWith("/admin/login")
        || pathname.startsWith("/terms")
        || pathname.startsWith("/payment-policy")
        || pathname.startsWith("/docs/");
}
// ================= PROACTIVE REFRESH SCHEDULER =================
function scheduleProactiveRefresh() {
    if (refreshTimerId) {
        clearTimeout(refreshTimerId);
        refreshTimerId = null;
    }

    const { accessTokenExpiresAt } = useAuthStore.getState();
    if (!accessTokenExpiresAt) return;

    const now = Date.now();
    const refreshAt = accessTokenExpiresAt - REFRESH_BUFFER_MS;
    const delay = Math.max(refreshAt - now, 0);

    refreshTimerId = setTimeout(() => {
        if (!isForegroundActive()) {
            refreshPending = true;
            return;
        }
        silentRefresh().catch(() => {
            // A failed refresh is retried by the next active request.
        });
    }, delay);
}

// ✅ FIX — authStore.js aur axiosInstance.js EK DOOSRE ko import karte
// hain (circular). "useAuthStore.subscribe(...)" ko agar seedha yahan
// TOP-LEVEL pe call karte (file load hote hi turant), to jab bundler
// authStore.js load karna shuru karta (jo khud axiosInstance.js ko
// import karta hai), us waqt authStore.js abhi apna "create()" tak
// pahuncha hi nahi hota — matlab "useAuthStore" is point pe "undefined"
// milta, aur "useAuthStore.subscribe(...)" turant crash kar deta
// ("Cannot read properties of undefined (reading 'subscribe')") —
// poori module load hi fail ho jaati, isliye pura page blank/crash
// ho raha tha.
//
// FIX: subscribe-registration ko ek macrotask (setTimeout 0) ke andar
// daal diya. Isse ye sirf TAB chalta hai jab current synchronous
// module-load-chain poori tarah khatam ho chuki hoti hai — us waqt
// tak dono modules (authStore.js + axiosInstance.js) fully loaded
// aur unke exports properly assigned ho chuke hote hain, isliye
// "useAuthStore" valid milta hai aur subscribe safely register ho
// jaata hai.
setTimeout(() => {
    useAuthStore.subscribe((state, prevState) => {
        if (state.accessToken !== prevState.accessToken) {
            if (state.accessToken) {
                scheduleProactiveRefresh();
            } else if (refreshTimerId) {
                // Logout ho gaya — pending timer cancel karo
                clearTimeout(refreshTimerId);
                refreshTimerId = null;
            }
        }
    });
}, 0);

// ✅ Ye function reactive (401 fallback) aur proactive (timer) dono
// jagah se call hota hai — dono ek hi refresh-logic + cross-tab lock
// share karte hain.
async function silentRefresh() {
    if (refreshPending && Date.now() < nextRefreshAttemptAt) {
        const deferred = new Error("Token refresh is waiting for the next active request.");
        deferred.code = "REFRESH_DEFERRED";
        throw deferred;
    }

    if (isRefreshing) {
        return new Promise((resolve, reject) => {
            crossTabWaiters.push({ resolve, reject });
        });
    }

    isRefreshing = true;
    refreshChannel?.postMessage({ type: "REFRESH_STARTED" });


    try {
        const { data } = await axiosInstance.post("/api/auth/refresh-token");
        refreshPending = false;
        nextRefreshAttemptAt = 0;
        useAuthStore.getState().markBackendReachable?.();

        // ✅ Store ka apna setAccessToken use karo — wahi expiry bhi
        // decode kar leta hai, subscribe wapas timer reschedule kar dega
        useAuthStore.getState().setAccessToken(data.accessToken);

        processQueue(null, data.accessToken);
        settleRefreshWaiters(null, data.accessToken);
        refreshChannel?.postMessage({
            type: "REFRESH_SUCCESS",
            accessToken: data.accessToken,
        });

        return data.accessToken;

    } catch (e) {
        const status = e.response?.status;
        const invalidSession = status === 401;

        processQueue(e);
        settleRefreshWaiters(e);
        refreshChannel?.postMessage({ type: "REFRESH_FAILED", invalidSession });

        if (invalidSession) {
            refreshPending = false;
            useAuthStore.getState().logoutLocalOnly();
            if (!isPublicRoute()) {
                window.location.replace("/login?reason=session-expired");
            }
        } else {
            // Network, CSRF/access denial, throttling and server errors must
            // never clear a valid local session. Retry only on active demand.
            refreshPending = true;
            nextRefreshAttemptAt = Date.now() + REFRESH_RETRY_COOLDOWN_MS;
            if (isServerUnreachable(e) || status >= 500) {
                useAuthStore.getState().markBackendUnreachable?.();
            }
        }

        throw e;

    } finally {
        isRefreshing = false;
    }
}

export async function refreshAccessTokenOnDemand() {
    return silentRefresh();
}
// ================= CROSS-TAB SYNC =================
if (refreshChannel) {
    refreshChannel.onmessage = (event) => {
        const { type, accessToken, invalidSession } = event.data || {};

        if (type === "REFRESH_STARTED") {
            isRefreshing = true;
        }

        if (type === "REFRESH_SUCCESS") {
            refreshPending = false;
            nextRefreshAttemptAt = 0;
            useAuthStore.getState().setAccessToken(accessToken);
            useAuthStore.getState().markBackendReachable?.();
            settleRefreshWaiters(null, accessToken);
            isRefreshing = false;
        }

        if (type === "REFRESH_FAILED") {
            const refreshError = new Error(invalidSession ? "Session expired" : "Token refresh unavailable");
            settleRefreshWaiters(refreshError);
            isRefreshing = false;

            if (invalidSession) {
                refreshPending = false;
                useAuthStore.getState().logoutLocalOnly();
                if (document.visibilityState === "visible" && !isPublicRoute()) {
                    window.location.replace("/login?reason=session-expired");
                }
            } else {
                refreshPending = true;
                nextRefreshAttemptAt = Date.now() + REFRESH_RETRY_COOLDOWN_MS;
            }
        }
    };
}

onForegroundActivity(() => {
    if (!refreshPending || !isForegroundActive() || isRefreshing || Date.now() < nextRefreshAttemptAt) {
        return;
    }

    const { user, accessToken, accessTokenExpiresAt } = useAuthStore.getState();
    const refreshNeeded = user && (!accessToken || !accessTokenExpiresAt
        || accessTokenExpiresAt <= Date.now() + REFRESH_BUFFER_MS);

    if (!refreshNeeded) {
        refreshPending = false;
        return;
    }

    silentRefresh().catch(() => {
        // The next active request can retry after the cooldown.
    });
});

// ================= REQUEST INTERCEPTOR =================
axiosInstance.interceptors.request.use(async (config) => {
    const requestUrl = `${config.baseURL || ""}${config.url || ""}`;
    let accessToken = useAuthStore.getState().accessToken;
    config.headers["X-Client-Timezone"] = Intl.DateTimeFormat().resolvedOptions().timeZone || "Unknown";
    config.headers["X-Client-Locale"] = navigator.language || "Unknown";

    const { user, accessTokenExpiresAt } = useAuthStore.getState();
    const refreshNeeded = !accessToken
        || (accessTokenExpiresAt && accessTokenExpiresAt <= Date.now() + 5_000);

    // A protected request refreshes only when the foreground user needs it.
    // Background polling never wakes the refresh endpoint.
    if (refreshNeeded && !isAuthBootstrapRequest(requestUrl) && user) {
        if (isForegroundActive()) {
            try {
                accessToken = await silentRefresh();
            } catch {
                accessToken = useAuthStore.getState().accessToken;
            }
        } else {
            refreshPending = true;
        }
    }

    if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    const method = config.method?.toUpperCase();
    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
        const csrfToken = getCsrfTokenFromCookie();
        if (csrfToken) {
            config.headers["X-XSRF-TOKEN"] = csrfToken;
        }
    }

    return config;
});

// ================= RESPONSE INTERCEPTOR (FALLBACK ONLY) =================
// ✅ Normal flow mein proactive scheduler hi refresh kar dega, isliye
// 401 yahan tak shayad hi kabhi aayega. Ye sirf edge-cases ke liye hai
// (laptop sula ke uthaya, timer miss, clock drift, etc.)
axiosInstance.interceptors.response.use(
    (response) => response,

    async (error) => {
        const originalRequest = error.config || {};

        // Any protected feature can exhaust credits. Notify the dashboard-level
        // modal once, while feature pages remain free to show their own message.
        if (!originalRequest._rechargeNotified && notifyRechargeForError(error)) {
            originalRequest._rechargeNotified = true;
        }

        // ✅ Note: agar server hi down hai to error.response undefined
        // hoga, aur status check khud-ba-khud "true" ban jaayega (kyunki
        // undefined !== 401), isliye ye normal API-call failures (server
        // down case) seedha reject ho jaate hain — silentRefresh/logout
        // flow mein kabhi jaate hi nahi. Sirf genuine 401 hi refresh
        // flow trigger karta hai.
        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        if (originalRequest.url?.includes("/auth/refresh-token")) {
            return Promise.reject(error);
        }

        if (!isForegroundActive()) {
            refreshPending = true;
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
            const token = await silentRefresh();
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
        } catch (e) {
            return Promise.reject(e);
        }
    }
);

export default axiosInstance;