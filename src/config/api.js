// src/config/api.js

// =====================================================
// API BASE URL CONFIG
// =====================================================
//
// Local development ke liye root folder mein .env:
// VITE_API_BASE_URL=http://localhost:9092
//
// Production deploy ke time GitHub Actions secret se:
// VITE_API_BASE_URL=https://your-backend-url.elasticbeanstalk.com
//
// IMPORTANT:
// .env.example automatic load nahi hota.
// .env.example sirf sample/documentation ke liye hota hai.
// Production URL pipeline ke env/secret se aayega.
// =====================================================

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;

// ✅ Dev mode mein agar env missing hai to localhost fallback use hoga
// ✅ Prod mode mein env missing hua to clear error milega
if (!rawApiBaseUrl && import.meta.env.PROD) {
  throw new Error(
    "VITE_API_BASE_URL missing hai. Production build ke liye GitHub Secret ya .env.production mein backend URL set karo."
  );
}

// ✅ Final API base URL
// Local fallback: http://localhost:9092
// Last slash remove: https://api.com/ -> https://api.com
export const API_BASE_URL = (
  rawApiBaseUrl || "http://localhost:9092"
).replace(/\/+$/, "");

// ✅ Development warning
if (import.meta.env.DEV && !rawApiBaseUrl) {
  console.warn(
    "VITE_API_BASE_URL missing hai. Default http://localhost:9092 use ho raha hai."
  );
}

export const API = {
  // ================= AUTH =================
  AUTH: {
    // USER
    REGISTER: "/api/auth/register",
    LOGIN: "/api/auth/login",
    VERIFY_EMAIL: "/api/auth/verify",
    RESEND_VERIFICATION: "/api/auth/resend-verification",

    // FORGOT PASSWORD
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    VERIFY_RESET_OTP: "/api/auth/verify-reset-otp",
    RESET_PASSWORD: "/api/auth/reset-password",
    RESEND_RESET_OTP: "/api/auth/resend-reset-otp",

    // ADMIN
    ADMIN_LOGIN: "/api/auth/admin-login",
    VERIFY_ADMIN_LOGIN_OTP: "/api/auth/verify-admin-login-otp",
    RESEND_ADMIN_LOGIN_OTP: "/api/auth/resend-admin-login-otp",

    // COMMON
    REFRESH_TOKEN: "/api/auth/refresh-token",
    LOGOUT: "/api/auth/logout",
    LOGOUT_ALL_DEVICES: "/api/auth/logout-all-devices",
  },

  // ================= USER =================
  USER: {
    GET_PROFILE: "/api/users/me",
    UPDATE_PROFILE: "/api/users/me",
  },

  // ================= ADMIN =================
  ADMIN: {
    GET_PROFILE: "/api/admin/me",
    UPDATE_PROFILE: "/api/admin/me",
    GET_ALL_USERS: "/api/admin/users",

    GET_USER_BY_ID: (id) => `/api/admin/users/${id}`,

    ENABLE_USER: (id) => `/api/admin/users/${id}/enable`,

    DISABLE_USER: (id) => `/api/admin/users/${id}/disable`,

    BLOCK_USER: (id) => `/api/admin/users/${id}/block`,

    UNBLOCK_USER: (id) => `/api/admin/users/${id}/unblock`,

    DELETE_USER: (id) => `/api/admin/users/${id}`,
  },

  // ================= CHAT =================
  CHAT: {
    SEND_MESSAGE: "/api/chat",
    STREAM: "/api/chat/stream",
    MODELS: "/api/chat/models",
  },

  // ================= CONVERSATIONS =================
  CONVERSATIONS: {
    GET_RECENT: "/api/conversations",
    GET_ARCHIVED: "/api/conversations/archived",
    SEARCH: "/api/conversations/search",

    GET_BY_ID: (id) => `/api/conversations/${id}`,

    ARCHIVE: (id) => `/api/conversations/${id}/archive`,

    RESTORE: (id) => `/api/conversations/${id}/restore`,

    DELETE: (id) => `/api/conversations/${id}`,

    RENAME: (id) => `/api/conversations/${id}/rename`,
  },

  // ================= WALLET =================
  WALLET: {
    GET_WALLET: "/api/wallet",
    HISTORY: "/api/wallet/history",
  },

  // ================= PAYMENT =================
  PAYMENT: {
    CREATE_ORDER: "/api/payment/create-order",
    VERIFY: "/api/payment/verify",
    HISTORY: "/api/payment/history",
  },

  // ================= PLANS =================
  PLANS: {
    GET_ALL: "/api/plans",

    GET_BY_ID: (id) => `/api/plans/${id}`,
  },

  // ================= IMAGES =================
  IMAGES: {
    GENERATE: "/api/images/generate",
    HISTORY: "/api/images/history",

    DELETE: (id) => `/api/images/${id}`,

    FAVORITE: (id) => `/api/images/${id}/favorite`,

    DOWNLOAD: (id) => `/api/images/${id}/download`,

    REGENERATE: (id) => `/api/images/${id}/regenerate`,
  },
};