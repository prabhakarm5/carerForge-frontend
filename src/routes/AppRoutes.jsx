import { Routes, Route } from "react-router-dom";
import HomePage from "../pages/Home/HomePage";
import LoginPage from "../pages/Login/LoginPage";
import RegisterPage from "../pages/Register/RegisterPage";
import VerificationPendingPage from "../pages/Verification/VerificationPendingPage";
import VerifyEmailPage from "../pages/Verification/VerifyEmailPage";
import VerificationSuccessPage from "../pages/Verification/VerificationSuccessPage";
import VerificationFailedPage from "../pages/Verification/VerificationFailedPage";
import ForgotPasswordPage from "../pages/Auth/ForgotPasswordPage";
import VerifyResetOtpPage from "../pages/Auth/VerifyResetOtpPage";
import ResetPasswordPage from "../pages/Auth/ResetPasswordPage";
import ChatPage from "../pages/Chat/ChatPage";
import ProfilePage from "../pages/Profile/ProfilePage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import ImageGeneratorPage from "../pages/ImageGeneratorPage";
import ProtectedRoute from "./ProtectedRoute";
import DashboardLayout from "../layouts/DashboardLayout";
import PublicLayout from "../shared/PublicLayout";

//for documentation pages for user and developer
import UserDocumentation from "../document/UserDocumentation";
import DeveloperDocumentation from "../document/DeveloperDocumentation";

// ✅ WALLET PAGE — balance, usage bar, recharge button (RechargeModal
// khud iske andar import hota hai from components/common/recharge/),
// aur transaction history. Sidebar ke "Wallet" nav item se yahi khulta hai.
import WalletPage from "../pages/Wallet/WalletPage";

// ✅ PAYMENT RESULT PAGES — Razorpay checkout complete hone ke baad
// paymentService.js ka startCheckout() promise resolve/reject hota hai,
// WalletPage usi ke hisaab se in dono routes pe navigate karta hai
// (saath mein orderId/paymentId ya failure reason location.state mein).
import PaymentSuccessPage from "../pages/Payment/PaymentSuccessPage";
import PaymentFailedPage from "../pages/Payment/PaymentFailedPage";

export default function AppRoutes() {
  return <Routes>

    {/* ================================================================
        PUBLIC ROUTES — login/auth ke bina accessible
        ================================================================ */}
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verification-pending" element={<VerificationPendingPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/verification-success" element={<VerificationSuccessPage />} />
      <Route path="/verification-failed" element={<VerificationFailedPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-reset-otp" element={<VerifyResetOtpPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Route>

    {/* ================================================================
        PROTECTED ROUTES — sirf logged-in user access kar sakta hai
        (ProtectedRoute wrapper + DashboardLayout sidebar/topbar deta hai)
        ================================================================ */}
    <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/chat" element={<ChatPage />} />
      <Route path="/chat/:id" element={<ChatPage />} />
      <Route path="/image-generator" element={<ImageGeneratorPage />} />
      <Route path="/profile" element={<ProfilePage />} />

      {/* ✅ WALLET — placeholder <h1> hata ke real WalletPage laga diya */}
      <Route path="/wallet" element={<WalletPage />} />

      {/* ✅ PAYMENT RESULT PAGES — checkout ke baad redirect yahin hota hai */}
      <Route path="/payment/success" element={<PaymentSuccessPage />} />
      <Route path="/payment/failed" element={<PaymentFailedPage />} />

      {/* ================================================================
          ABHI TAK PLACEHOLDER HAIN — baad mein real pages banayenge
          ================================================================ */}
      <Route path="/settings" element={<h1 className="p-10 text-white">Settings</h1>} />
      <Route path="/history" element={<h1 className="p-10 text-white">History</h1>} />
      <Route path="/bookmarks" element={<h1 className="p-10 text-white">Bookmarks</h1>} />
      <Route path="/pdf-ai" element={<h1 className="p-10 text-white">PDF AI</h1>} />
    </Route>

    {/* ================================================================
        DOCUMENTATION PAGES — user aur developer docs ke liye
        ================================================================ */}
    <Route path="/docs/user" element={<UserDocumentation />} />
    <Route path="/docs/developer" element={<DeveloperDocumentation />} />
  </Routes>;
}