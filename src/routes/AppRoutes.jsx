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
    </Routes>
  );
}