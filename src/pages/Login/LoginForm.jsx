import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Clock, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Lock, Mail } from "lucide-react";
import useAuthStore from "../../store/authStore";
import { generateFingerprint } from "../../utils/fingerprint";
import { handleApiError } from "../../utils/errorHandler";
import { loginUser, resendVerificationEmail } from "../../services/userAuthService";
import HumanVerification from "../../components/auth/HumanVerification";
import SocialLogin from "../../components/auth/SocialLogin";

// NOTE: This component renders ONLY the right-side form. Your route/layout
// already renders <AuthLeftPanel /> as a sibling — do NOT import or render
// it again in here, that was what caused the duplicate panel + the extra
// lag (two full blurred backgrounds compositing at once).

const MAX_ATTEMPTS = 5;

function extractSeconds(message) {
    if (!message) return 0;
    const match = message.match(/(\d+)\s*second/i);
    return match ? parseInt(match[1], 10) : 0;
}

function useCountdown(initialSeconds, onFinish) {
    const [seconds, setSeconds] = useState(initialSeconds);
    const timerRef = useRef(null);
    useEffect(() => {
        if (initialSeconds <= 0) return;
        setSeconds(initialSeconds);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    onFinish?.();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [initialSeconds]);
    return seconds;
}

function CountdownRing({ seconds, total }) {
    const radius = 16;
    const circumference = 2 * Math.PI * radius;
    const progress = total > 0 ? (seconds / total) * circumference : 0;
    return (
        <div className="relative w-9 h-9 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <circle
                    cx="20" cy="20" r={radius} fill="none" stroke="currentColor"
                    strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    className="transition-all duration-1000 ease-linear"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums">
                {seconds}
            </span>
        </div>
    );
}

function AttemptsPill({ failed, max }) {
    if (failed <= 0) return null;
    const left = max - failed;
    if (left <= 0) return null;
    const isLast = left === 1;
    return (
        <div
            className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] font-semibold"
            style={{
                background: isLast ? "rgba(239,68,68,0.15)" : "rgba(249,115,22,0.15)",
                border: `1px solid ${isLast ? "rgba(248,113,113,0.35)" : "rgba(251,146,60,0.3)"}`,
                color: isLast ? "#fca5a5" : "#fdba74",
            }}
        >
            <ShieldAlert size={13} className="flex-shrink-0" />
            {isLast
                ? "Last attempt — account may be locked after this"
                : `${left} of ${max} attempts remaining`
            }
        </div>
    );
}

function ServerBanner({ message, isError, countdown, totalSeconds, onDismiss }) {
    if (!message) return null;
    const hasCountdown = countdown > 0;
    return (
        <div
            className="rounded-xl p-3"
            style={{
                background: isError ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
                border: `1px solid ${isError ? "rgba(248,113,113,0.35)" : "rgba(52,211,153,0.35)"}`,
                color: isError ? "#fecaca" : "#a7f3d0",
            }}
        >
            <div className="flex items-start gap-2.5">
                {hasCountdown ? (
                    <CountdownRing seconds={countdown} total={totalSeconds} />
                ) : (
                    <div className="mt-0.5 flex-shrink-0">
                        {isError ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium leading-relaxed">{message}</p>
                    {hasCountdown && (
                        <p className="text-[10.5px] mt-0.5 opacity-70">You can retry once the timer ends.</p>
                    )}
                </div>
                {!hasCountdown && (
                    <button type="button" onClick={onDismiss}
                        className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

// Labeled input with a leading icon. All color/background via inline style
// (this project's Tailwind build doesn't compile arbitrary opacity classes
// like bg-white/[0.06], so those silently render as transparent/white).
function FieldInput({ label, icon: Icon, error, rightSlot, className = "", ...props }) {
    return (
        <div>
            {label && (
                <label className="mb-1.5 block text-[11.5px] font-semibold" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {label}
                </label>
            )}
            <div className="relative">
                {Icon && (
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.35)" }}>
                        <Icon size={15} />
                    </span>
                )}
                <input
                    {...props}
                    className={`w-full py-2.5 rounded-xl text-[13px] outline-none border ${Icon ? "pl-10" : "pl-3.5"} ${rightSlot ? "pr-10" : "pr-3.5"} ${className}`}
                    style={{
                        background: "rgba(255,255,255,0.06)",
                        borderColor: error ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.1)",
                        color: "#ffffff",
                    }}
                />
                {rightSlot && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightSlot}</span>
                )}
            </div>
            {error && <p className="mt-1 text-[11px]" style={{ color: "#fca5a5" }}>{error}</p>}
        </div>
    );
}

function LoginForm() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const login = useAuthStore(state => state.login);

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [human, setHuman] = useState(false);
    const [serverMessage, setServerMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showResendVerification, setShowResendVerification] = useState(false);
    const [verificationEmail, setVerificationEmail] = useState("");

    const [countdownStart, setCountdownStart] = useState(0);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        const oauthError = searchParams.get("oauthError");
        const logoutType = searchParams.get("logout");
        const sessionExpired = searchParams.get("reason") === "session-expired";
        const storedNotice = sessionStorage.getItem("cf_auth_notice");

        if (oauthError) {
            setIsError(true);
            setServerMessage(oauthError);
            return;
        }

        if (logoutType || sessionExpired || storedNotice) {
            setIsError(false);
            setServerMessage(
                logoutType === "all"
                    ? "Logged out successfully from all devices. Please sign in again."
                    : logoutType === "current"
                        ? "Logged out successfully. Please sign in again."
                        : (storedNotice || "Your session has ended. Please sign in again.")
            );
            sessionStorage.removeItem("cf_auth_notice");
        }
    }, [searchParams]);

    const countdown = useCountdown(countdownStart, () => {
        setServerMessage("");
        setIsError(false);
        setCountdownStart(0);
        setFailedAttempts(0);
    });
    const resendSeconds = useCountdown(resendCooldown, () => setResendCooldown(0));

    function clearBanner() {
        setServerMessage("");
        setIsError(false);
        setCountdownStart(0);
    }

    async function handleResendVerification() {
        try {
            const response = await resendVerificationEmail(verificationEmail);
            setIsError(false);
            setServerMessage(response.message);
            toast.success(response.message);
            setResendCooldown(60);
        } catch (error) {
            const response = error.response?.data;
            setIsError(true);
            setServerMessage(response?.message || "Failed to resend verification email");
            const message = response?.message;
            if (message && message.toLowerCase().includes("verify")) {
                setShowResendVerification(true);
                setVerificationEmail(email);
            }
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!email.trim()) {
            setIsError(true);
            setServerMessage("Email is required");
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setIsError(true);
            setServerMessage("Please enter a valid email");
            return;
        }
        if (!password.trim()) {
            setIsError(true);
            setServerMessage("Password is required");
            return;
        }
        if (password.length < 6) {
            setIsError(true);
            setServerMessage("Password must be at least 6 characters");
            return;
        }
        if (!human) {
            toast.error("Please verify that you are human");
            return;
        }

        try {
            setLoading(true);
            // FIX — generateFingerprint() is async (uses crypto.subtle.digest
            // for SHA-256, which returns a Promise). `await` was missing here
            // before, so `fingerprint` ended up as a Promise object instead
            // of a plain hex string, which serialized to `{}` and broke the
            // backend's LoginRequest.fingerprint (String) deserialization.
            const fingerprint = await generateFingerprint();
            const response = await loginUser(email, password, fingerprint);
            login(response);
            setServerMessage("");
            setIsError(false);
            setFailedAttempts(0);
            if (rememberMe) {
                localStorage.setItem("rememberMe", true);
            }
            toast.success("Login Successful");
            if (response.role === "ROLE_ADMIN") {
                navigate("/admin/dashboard");
            } else {
                navigate("/dashboard");
            }
        } catch (error) {
            const response = error.response?.data;
            const message = response?.message || "Login failed";
            const status = error.response?.status;

            setIsError(true);
            setServerMessage(message);

            const secs = extractSeconds(message);
            if (status === 429 || secs > 0) {
                setCountdownStart(secs || 60);
            } else {
                setCountdownStart(0);
            }

            if (status === 401) {
                setFailedAttempts(prev => prev + 1);
            }

            if (message && message.toLowerCase().includes("verify")) {
                setShowResendVerification(true);
                setVerificationEmail(email);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        // Fills whatever space the parent layout gives it (the other column
        // is AuthLeftPanel, rendered by the parent — not here). No blur, no
        // backdrop-filter: those are the expensive bits that were causing
        // the lag, especially doubled up with the duplicate panel.
        <div
            className="flex min-h-[100dvh] w-full items-center justify-center px-4 py-4 md:px-7"
            style={{ background: "#07060e" }}
        >
            <div className="w-full max-w-[380px]">

                <div className="flex items-center gap-2 mb-4 lg:hidden">
                    <span
                        className="grid h-8 w-8 place-items-center rounded-lg"
                        style={{ background: "linear-gradient(135deg, #fbbf24, #d946ef 55%, #7c3aed)" }}
                    >
                        <Lock size={14} color="#ffffff" strokeWidth={2.5} />
                    </span>
                    <span className="font-black text-[14px] tracking-tight" style={{ color: "#ffffff" }}>CareerForge AI</span>
                </div>

                <div
                    className="relative rounded-2xl p-5 sm:p-6"
                    style={{
                        background: "linear-gradient(155deg,#151225,#0e111b)",
                        border: "1px solid rgba(255,255,255,0.1)",
                    }}
                >
                    <div
                        className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{ background: "linear-gradient(135deg, #fbbf24, #d946ef 55%, #7c3aed)" }}
                    >
                        <Lock size={18} color="#ffffff" />
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={12} color="#fde68a" />
                        <span className="text-[10.5px] font-bold uppercase tracking-widest" style={{ color: "#fde68a" }}>
                            CareerForge AI
                        </span>
                    </div>
                    <h1 className="text-[21px] font-black tracking-tight" style={{ color: "#ffffff" }}>Welcome back</h1>
                    <p className="text-[12px] mt-1 mb-5" style={{ color: "rgba(255,255,255,0.6)" }}>
                        Continue your chats, credits, and AI workspace
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-3.5">

                        <FieldInput
                            label="Email"
                            icon={Mail}
                            type="email"
                            placeholder="you@example.com"
                            value={email}
                            disabled={loading}
                            onChange={(e) => setEmail(e.target.value)}
                        />

                        <FieldInput
                            label="Password"
                            icon={Lock}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            disabled={loading}
                            onChange={(e) => setPassword(e.target.value)}
                            rightSlot={
                                <button
                                    type="button"
                                    disabled={loading}
                                    style={{ color: "rgba(255,255,255,0.4)" }}
                                    className="disabled:opacity-40"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            }
                        />

                        <div className="flex flex-col sm:flex-row gap-2.5 sm:justify-between sm:items-center pt-0.5">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        disabled={loading}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div
                                        className="w-4 h-4 rounded-[5px] flex items-center justify-center"
                                        style={{
                                            background: rememberMe ? "linear-gradient(135deg, #a78bfa, #fbbf24)" : "rgba(255,255,255,0.06)",
                                            border: rememberMe ? "1px solid transparent" : "1px solid rgba(255,255,255,0.15)",
                                        }}
                                    >
                                        {rememberMe && (
                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3.5">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                                    Remember me
                                </span>
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-[12px] font-semibold"
                                style={{ color: "#fde68a" }}
                            >
                                Forgot Password?
                            </Link>
                        </div>

                        <HumanVerification human={human} setHuman={setHuman} />

                        <AttemptsPill failed={failedAttempts} max={MAX_ATTEMPTS} />

                        <button
                            disabled={loading || countdown > 0}
                            className="w-full py-3 rounded-xl text-[13.5px] font-black tracking-tight disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                background: "linear-gradient(135deg, #fbbf24, #d946ef 55%, #7c3aed)",
                                color: "#ffffff",
                            }}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    Logging you in...
                                </span>
                            ) : countdown > 0 ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Clock size={14} />
                                    Try again in {countdown}s
                                </span>
                            ) : (
                                "Login"
                            )}
                        </button>

                        <ServerBanner
                            message={serverMessage}
                            isError={isError}
                            countdown={countdown}
                            totalSeconds={countdownStart}
                            onDismiss={clearBanner}
                        />

                        {showResendVerification && (
                            <div className="p-3.5 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)" }}>
                                <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.6)" }}>Email not verified?</p>
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={resendSeconds > 0}
                                    className="mt-1.5 text-[12px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 mx-auto"
                                    style={{ color: resendSeconds > 0 ? "rgba(255,255,255,0.6)" : "#fde68a" }}
                                >
                                    {resendSeconds > 0 ? (
                                        <><Clock size={12} /> Resend in {resendSeconds}s</>
                                    ) : (
                                        "Resend Verification Link"
                                    )}
                                </button>
                            </div>
                        )}
                    </form>

                    <div className="my-4 flex items-center gap-3">
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
                        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>OR</p>
                        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
                    </div>

                    <SocialLogin />

                    <p className="text-center mt-4 text-[12px]" style={{ color: "rgba(255,255,255,0.55)" }}>
                        Don't have an account?{" "}
                        <Link to="/register" className="ml-1 font-semibold" style={{ color: "#fde68a" }}>
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginForm;