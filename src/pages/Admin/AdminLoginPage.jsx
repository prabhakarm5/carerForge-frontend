import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const login = useAuthStore((state) => state.login);

  const [step, setStep] = useState("credentials"); // credentials | otp | granted
  const [form, setForm] = useState({ email: "", password: "", otp: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRefs = useRef([]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const update = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  // Six separate boxes feel faster to fill on mobile than one text field,
  // and auto-advance removes the need to tap between them.
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
  const signalState = step === "granted" ? "granted" : loading ? "busy" : step === "otp" ? "armed" : "idle";

  return (
    <main className="admin-shell" data-signal={signalState}>
      <section className="admin-visual">
        <div className="admin-visual-top">
          <BrandLogo size="lg" />
          <span className="admin-badge">
            <ShieldCheck size={14} strokeWidth={2.5} />
            Restricted console
          </span>
        </div>

        <div className="admin-visual-copy">
          <p className="admin-eyebrow">CareerForge / control room</p>
          <h1>
            See the signal.
            <br />
            Act with confidence.
          </h1>
          <p className="admin-visual-sub">
            Users, traffic, reliability and system health in one focused workspace,
            gated behind verified administrator access.
          </p>
        </div>

        <div className="admin-signal" role="img" aria-label={`Session status: ${signalState}`}>
          <svg viewBox="0 0 320 72" preserveAspectRatio="none" aria-hidden="true">
            <line x1="0" y1="36" x2="320" y2="36" className="admin-signal-baseline" />
            <path
              className="admin-signal-wave"
              d="M0,36 L60,36 L78,10 L96,62 L114,20 L132,36 L200,36 L218,14 L236,58 L254,24 L272,36 L320,36"
            />
          </svg>
          <div className="admin-signal-labels">
            <span data-active={signalState === "idle"}>Idle</span>
            <span data-active={signalState === "busy"}>Verifying</span>
            <span data-active={signalState === "armed"}>Awaiting code</span>
            <span data-active={signalState === "granted"}>Granted</span>
          </div>
        </div>

        <dl className="admin-stat-row">
          <div>
            <dt>Protected</dt>
            <dd>OTP + device check</dd>
          </div>
          <div>
            <dt>Audited</dt>
            <dd>Every sign-in logged</dd>
          </div>
          <div>
            <dt>Live</dt>
            <dd>Real-time console</dd>
          </div>
        </dl>
      </section>

      <section className="admin-panel">
        <div className="admin-card">
          <div className="admin-card-mark">
            <LockKeyhole size={20} strokeWidth={2.25} />
          </div>

          {step === "credentials" && (
            <form className="admin-form" onSubmit={submitCredentials} noValidate>
              <header className="admin-form-head">
                <p className="admin-eyebrow admin-eyebrow--panel">Step 1 of 2</p>
                <h2>Admin sign in</h2>
                <p className="admin-form-sub">Use your administrator credentials to continue.</p>
              </header>

              <label className="admin-field">
                <span>Email</span>
                <div className="admin-input-shell">
                  <Mail size={16} strokeWidth={2} aria-hidden="true" />
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={update}
                    placeholder="admin@company.com"
                    autoComplete="email"
                    disabled={loading}
                    required
                  />
                </div>
              </label>

              <label className="admin-field">
                <span>Password</span>
                <div className="admin-input-shell">
                  <KeyRound size={16} strokeWidth={2} aria-hidden="true" />
                  <input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={update}
                    placeholder="Your secure password"
                    autoComplete="current-password"
                    minLength={6}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    className="admin-ghost-icon"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              <button className="admin-primary-button" disabled={loading}>
                {loading ? (
                  <Loader2 size={17} className="admin-spin" />
                ) : (
                  <ShieldCheck size={17} strokeWidth={2.25} />
                )}
                <span>{loading ? "Sending code…" : "Continue securely"}</span>
              </button>
            </form>
          )}

          {step === "otp" && (
            <form className="admin-form" onSubmit={submitOtp} noValidate>
              <header className="admin-form-head">
                <button
                  type="button"
                  className="admin-back-link"
                  onClick={() => setStep("credentials")}
                  disabled={loading}
                >
                  <ArrowLeft size={14} /> Change details
                </button>
                <p className="admin-eyebrow admin-eyebrow--panel">Step 2 of 2</p>
                <h2>Verify access</h2>
                <p className="admin-form-sub">
                  Enter the 6-digit code sent to <strong>{form.email}</strong>.
                </p>
              </header>

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

              <button className="admin-primary-button" disabled={loading || form.otp.trim().length < 6}>
                {loading ? (
                  <Loader2 size={17} className="admin-spin" />
                ) : (
                  <ShieldCheck size={17} strokeWidth={2.25} />
                )}
                <span>{loading ? "Verifying…" : "Open dashboard"}</span>
              </button>

              <button
                type="button"
                className="admin-resend-link"
                onClick={resend}
                disabled={loading || cooldown > 0}
              >
                <RotateCw size={13} />
                {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
              </button>
            </form>
          )}

          {step === "granted" && (
            <div className="admin-granted">
              <div className="admin-granted-mark">
                <ShieldCheck size={26} strokeWidth={2.25} />
              </div>
              <h2>Access granted</h2>
              <p>Opening the dashboard…</p>
            </div>
          )}
        </div>

        <p className="admin-footnote">
          Trouble signing in? Contact your workspace owner or IT administrator.
        </p>
      </section>
    </main>
  );
}