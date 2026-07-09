// src/routes/AppRoutes.jsx

import { Routes, Route } from "react-router-dom";

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

// ================= USER/DASHBOARD PAGES =================
// ✅ IMPORTANT:
// Cloudflare/Linux case-sensitive hota hai.
// Actual file path hai: src/pages/chat/ChatPage.jsx
// Isliye "chat" lowercase rakha hai.
import ChatPage from "../pages/chat/ChatPage";

import ProfilePage from "../pages/Profile/ProfilePage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import ImageGeneratorPage from "../pages/ImageGeneratorPage";

// ✅ IMPORTANT:
// Actual file path hai: src/pages/Wallet/walletPage.jsx
// Isliye file name "walletPage" lowercase w ke saath rakha hai.
import WalletPage from "../pages/Wallet/walletPage";

// ================= PAYMENT RESULT PAGES =================
import PaymentSuccessPage from "../pages/Payment/PaymentSuccessPage";
import PaymentFailedPage from "../pages/Payment/PaymentFailedPage";

// ================= LAYOUTS / ROUTE GUARDS =================
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../layouts/DashboardLayout";
import PublicLayout from "../shared/PublicLayout";

// ================= DOCUMENTATION PAGES =================
import UserDocumentation from "../document/UserDocumentation";
import DeveloperDocumentation from "../document/DeveloperDocumentation";

// ================= LEGAL PAGES =================
import TermsAndConditions from "../shared/Termsandconditions";
import PaymentPolicy from "../shared/Paymentpolicy";

export default function AppRoutes() {
  return (
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

        {/* Forgot/reset password pages */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/verify-reset-otp" element={<VerifyResetOtpPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Chat routes */}
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:id" element={<ChatPage />} />

        {/* AI feature pages */}
        <Route path="/image-generator" element={<ImageGeneratorPage />} />

        {/* User profile */}
        <Route path="/profile" element={<ProfilePage />} />

        {/* Wallet + payment */}
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/payment/failed" element={<PaymentFailedPage />} />

        {/* ================================================================
            PLACEHOLDER ROUTES
            Baad mein real pages bana denge.
            ================================================================ */}
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
          User aur developer documentation pages
          ================================================================ */}
      <Route path="/docs/user" element={<UserDocumentation />} />
      <Route path="/docs/developer" element={<DeveloperDocumentation />} />

      {/* ================================================================
          LEGAL ROUTES
          Terms and payment policy pages
          ================================================================ */}
      <Route path="/terms" element={<TermsAndConditions />} />
      <Route path="/payment-policy" element={<PaymentPolicy />} />
    </Routes>
  );
}