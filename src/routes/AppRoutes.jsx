// src/routes/AppRoutes.jsx

import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";

// ================= PUBLIC PAGES =================
import HomePage from "../pages/Home/HomePage";
import LoginPage from "../pages/Login/LoginPage";
import RegisterPage from "../pages/Register/RegisterPage";

// ================= EMAIL VERIFICATION PAGES =================
import VerificationPendingPage from "../pages/Verification/VerificationPendingPage";
import VerifyEmailPage from "../pages/Verification/VerifyEmailPage";
import VerificationSuccessPage from "../pages/Verification/VerificationSuccessPage";
import VerificationFailedPage from "../pages/Verification/VerificationFailedPage";

// ================= PASSWORD RESET PAGES =================
import ForgotPasswordPage from "../pages/Auth/ForgotPasswordPage";
import VerifyResetOtpPage from "../pages/Auth/VerifyResetOtpPage";
import ResetPasswordPage from "../pages/Auth/ResetPasswordPage";
import OAuthSuccessPage from "../pages/Auth/OAuthSuccessPage";

// ================= DASHBOARD / USER PAGES =================
// ? Actual path: src/pages/chat/ChatPage.jsx
// Cloudflare/Linux case-sensitive hai, isliye "chat" lowercase rakha hai.
import ChatPage from "../pages/chat/ChatPage";

import ProfilePage from "../pages/Profile/ProfilePage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import ImageGeneratorPage from "../pages/ImageGeneratorPage";

// ? Actual path: src/pages/Wallet/walletPage.jsx
// Isliye "walletPage" lowercase w ke saath rakha hai.
import WalletPage from "../pages/Wallet/walletPage";

// ================= PAYMENT PAGES =================
import PaymentSuccessPage from "../pages/Payment/PaymentSuccessPage";
import PaymentFailedPage from "../pages/Payment/PaymentFailedPage";

// ================= LAYOUTS / ROUTE GUARD =================
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../layouts/DashboardLayout";
import PublicLayout from "../shared/PublicLayout";

// ================= DOCUMENTATION PAGES =================
import UserDocumentation from "../document/UserDocumentation";
import DeveloperDocumentation from "../document/DeveloperDocumentation";

// ================= LEGAL PAGES =================
import TermsAndConditions from "../shared/Termsandconditions";
import PaymentPolicy from "../shared/Paymentpolicy";

// ================= 404 =================
import NotFound from "../pages/NotFound";

const SITE_NAME = "CareerForge AI";

// ✅ SINGLE SOURCE OF TRUTH — sirf yahan ek line add karo, tab title
// har page pe automatic set ho jayega. Kisi bhi individual page file
// ko chhoona nahi padega.
//
// Static paths: exact string match ("/dashboard").
// Dynamic paths (jaise "/chat/:id"): key ke aage "*" laga do, jaise
// "/chat/*" — iska matlab "/chat/" se shuru hone wala koi bhi path
// isi title se match hoga (e.g. "/chat/abc123").
const ROUTE_TITLES = {
    "/": "Home",
    "/login": "Login",
    "/register": "Create Account",

    "/verification-pending": "Verify Your Email",
    "/verify-email": "Verifying Email",
    "/verification-success": "Email Verified",
    "/verification-failed": "Verification Failed",

    "/forgot-password": "Forgot Password",
    "/verify-reset-otp": "Verify OTP",
    "/reset-password": "Reset Password",
    "/oauth/success": "Signing You In",

    "/dashboard": "Dashboard",
    "/chat": "Chat",
    "/chat/*": "Chat",
    "/image-generator": "AI Image Generator",
    "/profile": "Your Profile",
    "/wallet": "Wallet",

    "/payment/success": "Payment Successful",
    "/payment/failed": "Payment Failed",

    "/settings": "Settings",
    "/history": "History",
    "/bookmarks": "Bookmarks",
    "/pdf-ai": "PDF AI",

    "/docs/user": "User Documentation",
    "/docs/developer": "Developer Documentation",

    "/terms": "Terms & Conditions",
    "/payment-policy": "Payment Policy",
};

function resolveTitle(pathname) {
    // 1. Exact match first
    if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];

    // 2. Wildcard prefix match (for dynamic routes like /chat/:id)
    for (const key of Object.keys(ROUTE_TITLES)) {
        if (key.endsWith("/*")) {
            const prefix = key.slice(0, -1); // "/chat/*" -> "/chat/"
            if (pathname.startsWith(prefix)) return ROUTE_TITLES[key];
        }
    }

    // 3. No match (unknown/404 route) — fall back to a generic label
    return "Page Not Found";
}

// ✅ Runs once per route change, sets document.title automatically.
// Placed inside <Routes>'s parent, so it re-runs on every navigation
// without needing to be added to any individual page component.
function AutoPageTitle() {
    const location = useLocation();

    useEffect(() => {
        const title = resolveTitle(location.pathname);
        document.title = title ? `${title} · ${SITE_NAME}` : SITE_NAME;
    }, [location.pathname]);

    return null;
}

export default function AppRoutes() {
    return (
        <>
            <AutoPageTitle />

            <Routes>
                {/* ================================================================
                    PUBLIC ROUTES
                    Login/auth ke bina accessible pages
                    ================================================================ */}
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<HomePage />} />

                    {/* Auth pages */}
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />

                    {/* Email verification pages */}
                    <Route
                        path="/verification-pending"
                        element={<VerificationPendingPage />}
                    />
                    <Route path="/verify-email" element={<VerifyEmailPage />} />
                    <Route
                        path="/verification-success"
                        element={<VerificationSuccessPage />}
                    />
                    <Route
                        path="/verification-failed"
                        element={<VerificationFailedPage />}
                    />

                    {/* Forgot / reset password pages */}
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="/verify-reset-otp" element={<VerifyResetOtpPage />} />
                    <Route path="/reset-password" element={<ResetPasswordPage />} />
                    <Route path="/oauth/success" element={<OAuthSuccessPage />} />
                </Route>

                {/* ================================================================
                    PROTECTED ROUTES
                    Sirf logged-in user access kar sakta hai.
                    ProtectedRoute auth check karega.
                    DashboardLayout sidebar/topbar provide karega.
                    ================================================================ */}
                <Route
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                >
                    {/* Main dashboard */}
                    <Route path="/dashboard" element={<DashboardPage />} />

                    {/* Chat */}
                    <Route path="/chat" element={<ChatPage />} />
                    <Route path="/chat/:id" element={<ChatPage />} />

                    {/* AI image generator */}
                    <Route path="/image-generator" element={<ImageGeneratorPage />} />

                    {/* Profile */}
                    <Route path="/profile" element={<ProfilePage />} />

                    {/* Wallet */}
                    <Route path="/wallet" element={<WalletPage />} />

                    {/* Payment result pages */}
                    <Route path="/payment/success" element={<PaymentSuccessPage />} />
                    <Route path="/payment/failed" element={<PaymentFailedPage />} />

                    {/* Placeholder pages — baad mein real pages bana denge */}
                    <Route
                        path="/settings"
                        element={<h1 className="p-10 text-white">Settings</h1>}
                    />
                    <Route
                        path="/history"
                        element={<h1 className="p-10 text-white">History</h1>}
                    />
                    <Route
                        path="/bookmarks"
                        element={<h1 className="p-10 text-white">Bookmarks</h1>}
                    />
                    <Route
                        path="/pdf-ai"
                        element={<h1 className="p-10 text-white">PDF AI</h1>}
                    />
                </Route>

                {/* ================================================================
                    DOCUMENTATION ROUTES
                    ================================================================ */}
                <Route path="/docs/user" element={<UserDocumentation />} />
                <Route path="/docs/developer" element={<DeveloperDocumentation />} />

                {/* ================================================================
                    LEGAL ROUTES
                    ================================================================ */}
                <Route path="/terms" element={<TermsAndConditions />} />
                <Route path="/payment-policy" element={<PaymentPolicy />} />

                {/* ================================================================
                    404 — CATCH-ALL
                    Yeh HAMESHA sabse aakhri route hona chahiye. Jo bhi URL
                    upar ke kisi route se match na ho ("/chathik" jaisa
                    typo/random URL), woh yahan gir kar NotFound dikhayega
                    — blank page ya router-crash ki jagah.
                    ================================================================ */}
                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    );
}