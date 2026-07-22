import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Mail,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import BrandLogo from "../../shared/BrandLogo";
import useAuthStore from "../../store/authStore";
import { generateFingerprint } from "../../utils/fingerprint";
import { resendAdminOtp, sendAdminOtp, verifyAdminOtp } from "../../services/adminAuthService";
import "./admin.css";

const RESEND_COOLDOWN = 30;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);

  const [step, setStep] = useState("credentials"); // credentials | otp | granted
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    const email = searchParams.get("email")?.trim();
    if (email) setForm((current) => ({ ...current, email }));
  }, [searchParams]);
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const updateOtpDigit = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    setForm((current) => {
      const digits = current.otp.padEnd(6, " ").split("");
      digits[index] = digit || " ";
      return { ...current, otp: digits.join("").trimEnd() };
    });
    if (digit && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, event) => {
    if (event.key === "Backspace" && !form.otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    setForm((current) => ({ ...current, otp: pasted }));
    otpRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const submitCredentials = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      await sendAdminOtp(form.email.trim(), form.password);
      setStep("otp");
      setCooldown(RESEND_COOLDOWN);
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
      setStep("granted");
      login(response);
      toast.success("Admin access granted");
      setTimeout(() => navigate("/admin/dashboard", { replace: true }), 550);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "OTP verification failed");
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      await resendAdminOtp(form.email.trim());
      setCooldown(RESEND_COOLDOWN);
      toast.success("A fresh OTP was sent");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not resend OTP");
    } finally {
      setLoading(false);
    }
  };

  const otpDigits = form.otp.padEnd(6, " ").split("");

  return (
    <main className="admin-login-shell">
      <section className="admin-login-visual" aria-label="Admin access">
        <BrandLogo size="lg" />
        <div className="admin-login-copy">
          <span>
            <ShieldCheck size={14} /> Restricted operations console
          </span>
          <h1>
            See the signal.
            <br />
            Act with confidence.
          </h1>
          <p>Users, traffic, reliability and system health in one focused workspace.</p>
        </div>
        <div className="admin-login-pulse">
          <span>Protected</span>
          <span>Audited</span>
          <span>Live</span>
        </div>
      </section>

      <section className="admin-login-form-wrap">
        {step !== "granted" ? (
          <form
            className="admin-login-form"
            onSubmit={step === "credentials" ? submitCredentials : submitOtp}
          >
            <div className="admin-login-mark">
              <LockKeyhole size={22} />
            </div>
            <p className="admin-eyebrow">CareerForge control room</p>
            <h2>{step === "credentials" ? "Admin sign in" : "Verify access"}</h2>
            <p className="admin-login-subtitle">
              {step === "credentials"
                ? "Use your administrator credentials."
                : `Enter the code sent to ${form.email}.`}
            </p>

            {step === "credentials" ? (
              <>
                <label>
                  <span>Email</span>
                  <div className="admin-input-shell">
                    <Mail size={17} />
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={update}
                      disabled={loading}
                      placeholder="admin@company.com"
                      autoComplete="email"
                      required
                    />
                  </div>
                </label>

                <label>
                  <span>Password</span>
                  <div className="admin-input-shell">
                    <KeyRound size={17} />
                    <input
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={update}
                      disabled={loading}
                      placeholder="Your secure password"
                      autoComplete="current-password"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      className="admin-password-toggle"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>
              </>
            ) : (
              <div className="admin-otp-row" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(node) => (otpRefs.current[index] = node)}
                    className="admin-otp-box"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit.trim()}
                    onChange={(event) => updateOtpDigit(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    disabled={loading}
                    autoFocus={index === 0}
                    aria-label={`Digit ${index + 1} of 6`}
                  />
                ))}
              </div>
            )}

            <button
              className="admin-primary-button"
              disabled={loading || (step === "otp" && form.otp.trim().length < 6)}
            >
              {loading ? <Loader2 size={18} className="admin-spin" /> : <ShieldCheck size={18} />}
              {step === "credentials" ? "Continue securely" : "Open dashboard"}
            </button>

            {step === "otp" && (
              <div className="admin-login-actions">
                <button type="button" onClick={() => setStep("credentials")} disabled={loading}>
                  <ArrowLeft size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                  Change details
                </button>
                <button type="button" onClick={resend} disabled={loading || cooldown > 0}>
                  <RotateCw size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
                </button>
              </div>
            )}
          </form>
        ) : (
          <div className="admin-login-form admin-login-granted">
            <div className="admin-login-granted-mark">
              <ShieldCheck size={26} />
            </div>
            <h2>Access granted</h2>
            <p className="admin-login-subtitle">Opening the dashboard…</p>
          </div>
        )}
      </section>
    </main>
  );
}