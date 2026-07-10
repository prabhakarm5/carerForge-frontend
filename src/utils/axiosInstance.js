import axios from "axios";
import { API_BASE_URL } from "../config/api";
import useAuthStore from "../store/authStore";

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

// ✅ NEW — jab server hi down/unreachable ho (aapne server band kiya ho,
// restart kar rahe ho, network gaya, etc.), to chup-chaap dobara refresh
// try karega. Ye "refresh token invalid hai" wala case NAHI hai, isliye
// is retry ke dauraan user ko logout/redirect kabhi nahi hoga.
//
// ✅ FIX (round 2) — pehle ye FIXED 8s interval pe retry karta tha, jo
// backend lambe time down rehne par bewajah baar-baar hit karta rehta.
// Ab EXPONENTIAL BACKOFF: 5s -> 10s -> 20s -> 30s (cap), taaki backend
// par load kam se kam pade. Successful refresh milte hi counter reset.
const SERVER_DOWN_BASE_RETRY_DELAY_MS = 5 * 1000;
const SERVER_DOWN_MAX_RETRY_DELAY_MS = 30 * 1000;
let serverDownRetryTimerId = null;
let serverDownRetryAttempt = 0;

function getServerDownRetryDelay() {
    const delay =
        SERVER_DOWN_BASE_RETRY_DELAY_MS * Math.pow(2, serverDownRetryAttempt);
    return Math.min(delay, SERVER_DOWN_MAX_RETRY_DELAY_MS);
}

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
function clearServerDownRetryTimer() {
    if (serverDownRetryTimerId) {
        clearTimeout(serverDownRetryTimerId);
        serverDownRetryTimerId = null;
    }
}

function scheduleServerDownRetry() {
    // Agar pehle se ek retry schedule hai to dobara stack mat karo
    if (serverDownRetryTimerId) return;

    const delay = getServerDownRetryDelay();
    serverDownRetryAttempt += 1;

    serverDownRetryTimerId = setTimeout(() => {
        serverDownRetryTimerId = null;
        silentRefresh().catch(() => {
            // silentRefresh apne andar hi agla retry schedule kar dega
            // (agar phir se server-down mila) ya logout handle kar dega
            // (agar ab genuinely refresh token invalid mila)
        });
    }, delay);
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
        silentRefresh().catch(() => {
            // silentRefresh apne andar hi logout/redirect (ya server-down
            // retry) handle karta hai
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
    if (isRefreshing) {
        return new Promise((resolve) => {
            crossTabWaiters.push(resolve);
        });
    }

    isRefreshing = true;
    refreshChannel?.postMessage({ type: "REFRESH_STARTED" });

    // ✅ NEW — DEBUG LOG: har refresh-token attempt ka timestamp Console
    // mein print hoga, taaki Network tab ke filter/setting se independent
    // ho ke bhi ye verify kiya ja sake ki refresh-token call kitni baar
    // aur kitne gap pe ho rahi hai. Chaho to production mein ye line
    // hata sakte ho — sirf debugging ke liye hai.
    console.log(`[auth] refresh-token attempt @ ${new Date().toLocaleTimeString()}`);

    try {
        const { data } = await axiosInstance.post("/api/auth/refresh-token");

        // Refresh safal — server-down retry state poori tarah reset karo
        clearServerDownRetryTimer();
        serverDownRetryAttempt = 0;

        console.log(`[auth] refresh-token SUCCESS @ ${new Date().toLocaleTimeString()}`);

        // ✅ Store ka apna setAccessToken use karo — wahi expiry bhi
        // decode kar leta hai, subscribe wapas timer reschedule kar dega
        useAuthStore.getState().setAccessToken(data.accessToken);

        processQueue(null, data.accessToken);
        refreshChannel?.postMessage({
            type: "REFRESH_SUCCESS",
            accessToken: data.accessToken,
        });

        return data.accessToken;

    } catch (e) {
        if (isServerUnreachable(e)) {
            // ✅ FIX — Server abhi DOWN/unreachable hai (aapne server
            // band kiya hua hai / restart ho raha hai / network issue) —
            // iska ye matlab BILKUL nahi ki refreshToken invalid/expired
            // hai. Pehle yahan bhi seedha logout + redirect("/") ho jaata
            // tha, isliye jab bhi backend thodi der ke liye down hota
            // tha, beech mein user "/" (aur phir wapas login) pe fek
            // diya jaata tha — yahi bug tha.
            //
            // Ab: session/user state ko bilkul chhedo mat, sirf abhi
            // waiting sab requests ko reject karo, aur exponential
            // backoff ke saath khud phir try karo (backend par load kam
            // rakhne ke liye). Server wapas up hote hi silently naya
            // token mil jaayega aur user ko pata bhi nahi chalega ki
            // beech mein server down tha.
            processQueue(e);
            refreshChannel?.postMessage({ type: "REFRESH_FAILED" });

            const nextDelay = getServerDownRetryDelay();
            console.log(
                `[auth] refresh-token FAILED (server unreachable) @ ${new Date().toLocaleTimeString()} — retrying in ${nextDelay / 1000}s`
            );

            scheduleServerDownRetry();
            throw e;
        }

        // ✅ Yahan sirf tab aayenge jab server ne ACTUALLY respond kiya
        // (401 / 403 / etc.) — matlab refreshToken cookie invalid,
        // expired, revoked, ya missing hai. Yahi asli "session khatam"
        // case hai, isliye sirf yahi logout + redirect deserve karta hai.
        serverDownRetryAttempt = 0;
        processQueue(e);
        refreshChannel?.postMessage({ type: "REFRESH_FAILED" });
        useAuthStore.getState().logoutLocalOnly();

        // ✅ FIX — "/" nahi, seedha "/login" page pe bhejo
        window.location.replace("/login");
        throw e;

    } finally {
        isRefreshing = false;
    }
}

// ================= CROSS-TAB SYNC =================
if (refreshChannel) {
    refreshChannel.onmessage = (event) => {
        const { type, accessToken } = event.data || {};

        if (type === "REFRESH_STARTED") {
            isRefreshing = true;
        }

        if (type === "REFRESH_SUCCESS") {
            clearServerDownRetryTimer();
            serverDownRetryAttempt = 0;
            useAuthStore.getState().setAccessToken(accessToken);
            crossTabWaiters.forEach((resolve) => resolve(accessToken));
            crossTabWaiters = [];
            isRefreshing = false;
        }

        if (type === "REFRESH_FAILED") {
            crossTabWaiters = [];
            isRefreshing = false;
        }
    };
}

// ================= REQUEST INTERCEPTOR =================
axiosInstance.interceptors.request.use(async (config) => {
    const requestUrl = `${config.baseURL || ""}${config.url || ""}`;
    let accessToken = useAuthStore.getState().accessToken;

    // Dashboard ke multiple widgets login ke turant baad ek saath protected
    // APIs hit karte hain. Agar memory accessToken abhi hydrate nahi hua,
    // pehle refresh cookie se token lao, phir request bhejo.
    if (!accessToken && !isAuthBootstrapRequest(requestUrl) && useAuthStore.getState().user) {
        try {
            accessToken = await silentRefresh();
        } catch {
            accessToken = null;
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
        const originalRequest = error.config;

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