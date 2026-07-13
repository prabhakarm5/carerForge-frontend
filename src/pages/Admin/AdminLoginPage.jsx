import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import BrandLogo from "../../shared/BrandLogo";
import useAuthStore from "../../store/authStore";
import { generateFingerprint } from "../../utils/fingerprint";
import { resendAdminOtp, sendAdminOtp, verifyAdminOtp } from "../../services/adminAuthService";
import "./admin.css";

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const [step, setStep] = useState("credentials");
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [loading, setLoading] = useState(false);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitCredentials = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await sendAdminOtp(form.email.trim(), form.password);
      setStep("otp");
      toast.success("Secure OTP sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Admin sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const fingerprint = await generateFingerprint();
      const response = await verifyAdminOtp(form.email.trim(), form.otp.trim(), fingerprint);
      if (response.role !== "ROLE_ADMIN") throw new Error("Admin permission is required");
      login(response);
      toast.success("Admin access granted");
      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "OTP verification failed");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    try {
      await resendAdminOtp(form.email.trim());
      toast.success("A fresh OTP was sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not resend OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-login-shell">
      <section className="admin-login-visual" aria-label="Admin access">
        <BrandLogo size="lg" />
        <div className="admin-login-copy">
          <span><ShieldCheck size={18} /> Restricted operations console</span>
          <h1>See the signal.<br />Act with confidence.</h1>
          <p>Users, traffic, reliability and system health in one focused workspace.</p>
        </div>
        <div className="admin-login-pulse">
          <span>Protected</span><span>Audited</span><span>Live</span>
        </div>
      </section>

      <section className="admin-login-form-wrap">
        <form
          className="admin-login-form"
          onSubmit={step === "credentials" ? submitCredentials : submitOtp}
        >
          <div className="admin-login-mark"><LockKeyhole size={22} /></div>
          <p className="admin-eyebrow">CareerForge control room</p>
          <h2>{step === "credentials" ? "Admin sign in" : "Verify access"}</h2>
          <p className="admin-login-subtitle">
            {step === "credentials"
              ? "Use your administrator credentials."
              : `Enter the code sent to ${form.email}.`}
          </p>

          <label>
            <span>Email</span>
            <div className="admin-input-shell">
              <Mail size={17} />
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={update}
                disabled={step === "otp" || loading}
                placeholder="admin@company.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          {step === "credentials" ? (
            <label>
              <span>Password</span>
              <div className="admin-input-shell">
                <KeyRound size={17} />
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={update}
                  placeholder="Your secure password"
                  autoComplete="current-password"
                  minLength={6}
                  required
                />
              </div>
            </label>
          ) : (
            <label>
              <span>One-time password</span>
              <div className="admin-input-shell">
                <ShieldCheck size={17} />
                <input
                  name="otp"
                  inputMode="numeric"
                  value={form.otp}
                  onChange={update}
                  placeholder="6-digit OTP"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
            </label>
          )}

          <button className="admin-primary-button" disabled={loading}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {step === "credentials" ? "Continue securely" : "Open dashboard"}
          </button>

          {step === "otp" && (
            <div className="admin-login-actions">
              <button type="button" onClick={() => setStep("credentials")} disabled={loading}>
                Change details
              </button>
              <button type="button" onClick={resend} disabled={loading}>
                Resend OTP
              </button>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
