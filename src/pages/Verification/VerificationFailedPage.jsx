import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, RefreshCw, AlertTriangle, ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { resendVerificationEmail } from "../../services/userAuthService";
import { handleApiError } from "../../utils/errorHandler";

// â”€â”€ Extract seconds from backend message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function extractSeconds(message) {
    if (!message) return 0;
    const match = message.match(/(\d+)\s*second/i);
    return match ? parseInt(match[1], 10) : 0;
}

// â”€â”€ Countdown from a future ISO timestamp (resendAvailableAt) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function secondsUntil(isoString) {
    if (!isoString) return 0;
    const diff = Math.floor((new Date(isoString) - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
}

// â”€â”€ Countdown hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€ Circular countdown ring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CountdownRing({ seconds, total, color = "text-red-400" }) {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const progress = total > 0 ? (seconds / total) * circumference : 0;
    return (
        <div className={`relative w-11 h-11 flex-shrink-0 ${color}`}>
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
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

// â”€â”€ Server message banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ServerBanner({ message, isError, countdown, totalSeconds, resendAvailableAt, onDismiss }) {
    if (!message) return null;
    const hasCountdown = countdown > 0;
    return (
        <div className={`rounded-2xl border p-4 ${
            isError
                ? "bg-red-500/8 border-red-500/25 text-red-400"
                : "bg-green-500/8 border-green-500/25 text-green-400"
        }`}>
            <div className="flex items-start gap-3">
                {hasCountdown ? (
                    <CountdownRing
                        seconds={countdown}
                        total={totalSeconds}
                        color={isError ? "text-red-400" : "text-green-400"}
                    />
                ) : (
                    <div className="mt-0.5 flex-shrink-0">
                        {isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-relaxed">{message}</p>
                    {hasCountdown && (
                        <p className="text-[11px] mt-0.5 opacity-60">
                            You can resend once the timer ends.
                        </p>
                    )}
                    {/* resendAvailableAt from backend (existing logic) */}
                    {!isError && resendAvailableAt && !hasCountdown && (
                        <p className="text-[12px] mt-1.5 opacity-70">
                            Next resend available at:{" "}
                            <span className="font-semibold">
                                {new Date(resendAvailableAt).toLocaleString()}
                            </span>
                        </p>
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

function VerificationFailedPage() {
    const location = useLocation();
    const navigate = useNavigate();

    // existing states â€” untouched
    const [email, setEmail] = useState(location.state?.email || "");
    const [loading, setLoading] = useState(false);
    const [serverMessage, setServerMessage] = useState("");
    const [resendAvailableAt, setResendAvailableAt] = useState("");
    const [isError, setIsError] = useState(false);

    // added states
    const [countdownStart, setCountdownStart] = useState(0);

    const countdown = useCountdown(countdownStart, () => {
        setCountdownStart(0);
    });

    function clearBanner() {
        setServerMessage("");
        setIsError(false);
        setCountdownStart(0);
    }

    // existing â€” untouched logic
    async function handleResend() {
        if (!email.trim()) {
            toast.error("Please enter your email");
            return;
        }
        try {
            setLoading(true);
            const response = await resendVerificationEmail(email);
            setIsError(false);
            setServerMessage(response.message);
            setResendAvailableAt(response.resendAvailableAt);
            toast.success(response.message);

            // if backend gives a future timestamp, use it for countdown
            const secsFromTimestamp = secondsUntil(response.resendAvailableAt);
            if (secsFromTimestamp > 0) {
                setCountdownStart(secsFromTimestamp);
            }
        } catch (error) {
            const response = error.response?.data;
            const message = response?.message || "Something went wrong";
            const status = error.response?.status;
            setIsError(true);
            setServerMessage(message);

            // countdown for rate limit or timed errors
            const secs = extractSeconds(message);
            if (status === 429 || secs > 0) {
                setCountdownStart(secs || 60);
            } else {
                setCountdownStart(0);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#07060e] flex justify-center items-center p-4 relative overflow-hidden">

            {/* background glows */}
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-red-700/10 blur-[130px] pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full bg-violet-700/10 blur-[100px] pointer-events-none" />
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
                    backgroundSize: "36px 36px",
                }}
            />

            <div className="relative z-10 w-full max-w-md">

                {/* â”€â”€ BACK BUTTON â”€â”€ */}
                <button
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-2 text-slate-500 hover:text-slate-300 text-[13px] font-medium transition-colors duration-150 mb-6"
                >
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 flex items-center justify-center transition-all duration-150">
                        <ArrowLeft size={14} />
                    </div>
                    Go back
                </button>

                {/* â”€â”€ CARD â”€â”€ */}
                <div className="bg-white/[0.04] border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl">

                    {/* Icon */}
                    <div className="flex justify-center mb-6">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl scale-150" />
                            <div className="relative w-20 h-20 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                                <AlertTriangle size={36} className="text-red-400" />
                            </div>
                        </div>
                    </div>

                    {/* Heading */}
                    <h1 className="text-[24px] font-black text-white text-center tracking-tight">
                        Verification Failed
                    </h1>
                    <p className="text-slate-500 text-[13.5px] text-center mt-2 leading-relaxed">
                        Your verification link is invalid,<br />expired, or already used.
                    </p>

                    {/* Email input */}
                    <div className="mt-7">
                        <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-2 block">
                            Email address
                        </label>
                        <div className={`relative flex items-center rounded-xl border bg-slate-900/80 transition-all duration-200 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/25 ${
                            isError ? "border-red-500/40" : "border-white/10"
                        }`}>
                            <Mail size={16} className="absolute left-4 text-slate-500 pointer-events-none" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full pl-11 pr-4 py-3.5 bg-transparent text-white text-[14px] placeholder-slate-600 outline-none"
                            />
                        </div>
                    </div>

                    {/* Buttons */}
                    <div className="mt-4 flex flex-col gap-3">

                        {/* Primary â€” Resend */}
                        <button
                            onClick={handleResend}
                            disabled={loading || countdown > 0}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[14px] font-bold tracking-tight shadow-[0_0_24px_rgba(109,40,217,0.3)] hover:shadow-[0_0_36px_rgba(109,40,217,0.5)] active:scale-[0.99] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    Sending Verification Email...
                                </span>
                            ) : countdown > 0 ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Clock size={15} />
                                    Resend available in {countdown}s
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <RefreshCw size={15} />
                                    Resend Verification Email
                                </span>
                            )}
                        </button>

                        {/* Secondary â€” Go to Login */}
                        <button
                            onClick={() => navigate("/login")}
                            className="w-full py-3.5 rounded-xl bg-transparent border border-white/10 hover:bg-white/5 hover:border-white/20 text-slate-400 hover:text-white text-[14px] font-semibold active:scale-[0.99] transition-all duration-200"
                        >
                            Back to Login
                        </button>
                    </div>

                    {/* Server banner */}
                    {serverMessage && (
                        <div className="mt-4">
                            <ServerBanner
                                message={serverMessage}
                                isError={isError}
                                countdown={countdown}
                                totalSeconds={countdownStart}
                                resendAvailableAt={resendAvailableAt}
                                onDismiss={clearBanner}
                            />
                        </div>
                    )}

                    {/* Footer */}
                    <p className="text-center text-slate-600 text-[11px] mt-6">
                        CareerForge AI Email Verification System
                    </p>
                </div>
            </div>
        </div>
    );
}

export default VerificationFailedPage;
