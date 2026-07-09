import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Clock, AlertTriangle, CheckCircle2, ShieldAlert, Sparkles, Lock } from "lucide-react";
import useAuthStore from "../../store/authStore";
import { generateFingerprint } from "../../utils/fingerprint";
import { handleApiError } from "../../utils/errorHandler";
import { loginUser, resendVerificationEmail } from "../../services/userAuthService";
import HumanVerification from "../../components/auth/HumanVerification";
import SocialLogin from "../../components/auth/SocialLogin";

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
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const progress = total > 0 ? (seconds / total) * circumference : 0;
    return (
        <div className="relative w-11 h-11 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="3" />
                <circle
                    cx="22" cy="22" r={radius} fill="none" stroke="currentColor"
                    strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference - progress}
                    className="transition-all duration-1000 ease-linear"
                />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums">
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
        <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-[12.5px] font-semibold border ${
            isLast
                ? "bg-red-500/10 border-red-500/30 text-red-500"
                : "bg-orange-500/10 border-orange-500/25 text-orange-500"
        }`}>
            <ShieldAlert size={14} className="flex-shrink-0" />
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
        <div className={`rounded-2xl border p-3.5 ${
            isError
                ? "bg-red-500/8 border-red-500/25 text-red-500"
                : "bg-emerald-500/8 border-emerald-500/25 text-emerald-500"
        }`}>
            <div className="flex items-start gap-3">
                {hasCountdown ? (
                    <div className={isError ? "text-red-500" : "text-emerald-500"}>
                        <CountdownRing seconds={countdown} total={totalSeconds} />
                    </div>
                ) : (
                    <div className="mt-0.5 flex-shrink-0">
                        {isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-relaxed">{message}</p>
                    {hasCountdown && (
                        <p className="text-[11px] mt-0.5 opacity-60">You can retry once the timer ends.</p>
                    )}
                </div>
                {!hasCountdown && (
                    <button type="button" onClick={onDismiss}
                        className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

function LoginForm() {
    const navigate = useNavigate();
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
            // ✅ FIX — generateFingerprint() ab async hai (SHA-256 ke liye
            // crypto.subtle.digest use karta hai, jo Promise return karta hai).
            // Pehle yahan `await` missing tha, isliye `fingerprint` ek Promise
            // object ban jaata tha, plain hex string nahi. JSON.stringify karne
            // par woh Promise `{}` jaisa serialize ho jaata tha, aur backend ka
            // Jackson deserializer LoginRequest.fingerprint (String type) ke
            // against object dekh ke fail ho jaata tha — isi se "Request body
            // is invalid or malformed" error aa raha tha.
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
        <div className="relative flex min-h-full w-full items-center justify-center overflow-y-auto bg-[var(--surface)] px-5 py-10 md:px-8">

            {/* Static glow — no animation, no JS, instant paint */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[#ff6b4a]/[0.15] blur-[80px]" />
                <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-violet-500/[0.12] blur-[90px]" />
            </div>

            <div className="relative w-full max-w-[430px]">
                <div className="relative rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-elevated,var(--surface))] p-7 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.25)] md:p-9">

                    {/* Icon badge — solid pulse via CSS animation, no JS */}
                    <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff6b4a] to-[#ff8a5c] shadow-[0_8px_20px_-4px_rgba(255,107,74,0.5)] ${loading ? "animate-pulse" : ""}`}>
                        <Lock size={20} className="text-white" />
                    </div>

                    <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={13} className="text-[#ff6b4a]" />
                        <span className="text-[11px] font-bold uppercase tracking-widest text-[#ff6b4a]">CareerForge AI</span>
                    </div>
                    <h1 className="text-[28px] font-black text-[var(--text-primary)] tracking-tight">Welcome Back</h1>
                    <p className="text-[var(--text-muted)] text-[13px] mt-1.5">Log in to continue building your career</p>

                    <form onSubmit={handleSubmit} className="space-y-3 mt-8">

                        <input
                            type="email"
                            placeholder="Email"
                            value={email}
                            disabled={loading}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3.5 rounded-xl bg-[var(--surface-soft)] border border-[var(--border-soft)] text-[var(--text-primary)] text-[14px] placeholder-[var(--text-muted)] outline-none focus:border-[#ff6b4a] focus:ring-2 focus:ring-[#ff6b4a]/15 transition-colors duration-150 disabled:opacity-60"
                        />

                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                placeholder="Password"
                                value={password}
                                disabled={loading}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[var(--surface-soft)] border border-[var(--border-soft)] text-[var(--text-primary)] text-[14px] placeholder-[var(--text-muted)] outline-none focus:border-[#ff6b4a] focus:ring-2 focus:ring-[#ff6b4a]/15 transition-colors duration-150 disabled:opacity-60"
                            />
                            <button
                                type="button"
                                disabled={loading}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors duration-150 disabled:opacity-40"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center pt-1">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={rememberMe}
                                        disabled={loading}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                        className="peer sr-only"
                                    />
                                    <div className="w-4.5 h-4.5 rounded-md border border-[var(--border-soft)] bg-[var(--surface-soft)] peer-checked:bg-[#ff6b4a] peer-checked:border-[#ff6b4a] transition-colors duration-150 flex items-center justify-center">
                                        {rememberMe && (
                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                                <span className="text-[var(--text-muted)] text-[13px] group-hover:text-[var(--text-primary)] transition-colors">
                                    Remember me
                                </span>
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-[#e45738] hover:text-[#c7472c] text-[13px] font-medium transition-colors"
                            >
                                Forgot Password?
                            </Link>
                        </div>

                        <HumanVerification human={human} setHuman={setHuman} />

                        <AttemptsPill failed={failedAttempts} max={MAX_ATTEMPTS} />

                        <button
                            disabled={loading || countdown > 0}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ff6b4a] to-[#ff8a5c] text-white text-[14px] font-bold tracking-tight shadow-[0_10px_24px_-6px_rgba(255,107,74,0.5)] hover:shadow-[0_14px_30px_-6px_rgba(255,107,74,0.65)] active:scale-[0.99] transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed"
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
                                    <Clock size={15} />
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
                            <div className="p-4 rounded-xl bg-[var(--surface-soft)] border border-[var(--border-soft)] text-center">
                                <p className="text-[var(--text-muted)] text-[13px]">Email not verified?</p>
                                <button
                                    type="button"
                                    onClick={handleResendVerification}
                                    disabled={resendSeconds > 0}
                                    className="mt-2 text-[13px] font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 mx-auto text-[#e45738] hover:text-[#c7472c] disabled:text-[var(--text-muted)]"
                                >
                                    {resendSeconds > 0 ? (
                                        <><Clock size={13} /> Resend in {resendSeconds}s</>
                                    ) : (
                                        "Resend Verification Link"
                                    )}
                                </button>
                            </div>
                        )}
                    </form>

                    <div className="my-6 flex items-center gap-3">
                        <div className="flex-1 h-px bg-[var(--border-soft)]" />
                        <p className="text-[var(--text-muted)] text-xs font-medium tracking-wide">OR CONTINUE WITH</p>
                        <div className="flex-1 h-px bg-[var(--border-soft)]" />
                    </div>

                    <SocialLogin />

                    <p className="text-[var(--text-muted)] mt-8 text-center text-[13px]">
                        Don't have an account?{" "}
                        <Link
                            to="/register"
                            className="text-[#e45738] ml-1 hover:text-[#c7472c] font-semibold transition-colors"
                        >
                            Create Account
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LoginForm;