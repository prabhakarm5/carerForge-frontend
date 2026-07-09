// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// VerifyResetOtpPage.jsx  â€“  Split-screen OTP verification
// Backend/API logic 100% untouched in spirit â€” only the token handoff added
// All server messages (error/success) are displayed properly
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, AlertTriangle, CheckCircle2, RotateCcw, ShieldCheck } from "lucide-react";
import { verifyResetOtp, resendResetOtp } from "../../services/userAuthService";

// â”€â”€ Extract seconds from backend message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function extractSeconds(message) {
    if (!message) return 0;
    const match = message.match(/(\d+)\s*second/i);
    return match ? parseInt(match[1], 10) : 0;
}

// â”€â”€ Countdown hook (untouched) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function useCountdown(initialSeconds, onFinish) {
    const [seconds, setSeconds] = useState(initialSeconds);
    const timerRef = useRef(null);
    useEffect(() => {
        if (initialSeconds <= 0) return;
        setSeconds(initialSeconds);
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setSeconds(prev => {
                if (prev <= 1) { clearInterval(timerRef.current); onFinish?.(); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [initialSeconds]);
    return seconds;
}

// â”€â”€ Animated aurora canvas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AuroraCanvas() { return null; }

// â”€â”€ Left branding panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const FEATURES = [
    {
        title: "AI Chat Assistant",
        desc: "Context-aware conversations with memory",
        icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
    },
    {
        title: "Image Generator",
        desc: "Create visuals from text prompts instantly",
        icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>,
    },
    {
        title: "PDF AI",
        desc: "Extract, summarise & query any document",
        icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    },
    {
        title: "Automation Platform",
        desc: "Chain AI models into powerful workflows",
        icon: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    },
];

function AuthLeftPanel() {
    return (
        <div className="hidden lg:flex w-[46%] flex-shrink-0 flex-col h-full relative overflow-hidden"
            style={{ background: "linear-gradient(155deg,#0d0b1a 0%,#080614 60%,#060510 100%)" }}>
            <AuroraCanvas />
            <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: "linear-gradient(rgba(139,92,246,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.06) 1px,transparent 1px)",
                backgroundSize: "44px 44px",
                transform: "perspective(700px) rotateX(28deg) scale(1.6) translateY(10%)",
                transformOrigin: "center bottom",
            }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060510] via-transparent to-transparent pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
                <span className="text-[260px] font-black tracking-tighter leading-none" style={{
                    background: "linear-gradient(135deg,rgba(139,92,246,0.06) 0%,rgba(6,182,212,0.03) 100%)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>T</span>
            </div>

            <div className="relative z-10 flex flex-col justify-between h-full p-11">
                {/* Logo */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-[14px] flex items-center justify-center"
                            style={{
                                background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                                boxShadow: "0 0 32px rgba(124,58,237,0.55), inset 0 1px 0 rgba(255,255,255,0.15)",
                                transform: "perspective(80px) rotateX(8deg) rotateY(-6deg)",
                            }}>
                            <span className="text-white text-[11px] font-black tracking-tight">AI</span>
                        </div>
                        <div className="absolute inset-0 rounded-[14px] bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                    </div>
                    <div>
                        <p className="text-white font-black text-[17px] tracking-tight leading-none">CareerForge AI</p>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-emerald-400 text-[9px] font-semibold uppercase tracking-[0.2em]">Live</span>
                        </div>
                    </div>
                </div>

                {/* Hero */}
                <div className="space-y-8">
                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-violet-400 mb-5">AI-powered workspace</p>
                        <h2 className="text-[50px] font-black text-white leading-[1.0] tracking-tight">
                            Build smarter.<br />
                            <span style={{
                                background: "linear-gradient(120deg,#a78bfa 0%,#818cf8 45%,#67e8f9 100%)",
                                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                            }}>Ship faster.</span>
                        </h2>
                        <p className="text-slate-500 text-[13px] leading-relaxed max-w-[260px] mt-4">
                            One platform for AI chat, image generation, document analysis, and intelligent automation.
                        </p>
                    </div>
                    <div className="space-y-2.5">
                        {FEATURES.map(f => (
                            <div key={f.title} className="flex items-start gap-3.5 px-4 py-3.5 rounded-2xl"
                                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)" }}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                    style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.25),rgba(79,70,229,0.15))", border: "1px solid rgba(124,58,237,0.25)" }}>
                                    <span className="text-violet-300">{f.icon}</span>
                                </div>
                                <div>
                                    <p className="text-[13px] font-semibold text-white/80 leading-none">{f.title}</p>
                                    <p className="text-[11px] text-slate-500 mt-1 leading-snug">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        {["#7c3aed","#4f46e5","#0891b2","#059669"].map((c, i) => (
                            <div key={i} className="w-7 h-7 rounded-full border-2"
                                style={{ background: c, borderColor: "#060510" }} />
                        ))}
                    </div>
                    <p className="text-slate-500 text-[11px]">
                        <span className="text-white/70 font-semibold">12,000+</span> builders worldwide
                    </p>
                </div>
            </div>
        </div>
    );
}

// â”€â”€ Step indicator (3 steps, current = Verify OTP) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepIndicator() {
    const steps = ["Email", "Verify OTP", "New Password"];
    const current = 1;
    return (
        <div className="flex items-center gap-0 mb-8">
            {steps.map((step, i) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                        <div className="flex items-center justify-center text-[11px] font-bold transition-all duration-300"
                            style={{
                                width: 28, height: 28, borderRadius: "50%",
                                background: i < current
                                    ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
                                    : i === current
                                    ? "rgba(124,58,237,0.15)"
                                    : "rgba(255,255,255,0.04)",
                                border: i <= current
                                    ? "none"
                                    : "1px solid rgba(255,255,255,0.1)",
                                outline: i === current ? "2px solid rgba(124,58,237,0.5)" : "none",
                                outlineOffset: 2,
                                boxShadow: i === current ? "0 0 14px rgba(124,58,237,0.4)" : "none",
                                color: i <= current ? "white" : "rgba(255,255,255,0.2)",
                            }}>
                            {i < current
                                ? <CheckCircle2 size={13} strokeWidth={2.5} />
                                : <span>{i + 1}</span>
                            }
                        </div>
                        <span className="text-[10px] mt-1.5 font-semibold whitespace-nowrap"
                            style={{ color: i === current ? "#a78bfa" : i < current ? "#64748b" : "#374151" }}>
                            {step}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className="flex-1 h-px mx-2 mb-4 rounded-full transition-all duration-500"
                            style={{ background: i < current ? "linear-gradient(90deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.07)" }} />
                    )}
                </div>
            ))}
        </div>
    );
}

// â”€â”€ 6-box OTP input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function OtpBoxes({ value, onChange, hasError, isSuccess }) {
    const inputsRef = useRef([]);
    const digits = value.split("").slice(0, 6);
    while (digits.length < 6) digits.push("");

    useEffect(() => { inputsRef.current[0]?.focus(); }, []);

    function handleKey(i, e) {
        const key = e.key;
        if (key === "Backspace") {
            e.preventDefault();
            const newVal = value.split("");
            if (newVal[i]) {
                newVal[i] = "";
            } else if (i > 0) {
                newVal[i - 1] = "";
                inputsRef.current[i - 1]?.focus();
            }
            onChange(newVal.join("").slice(0, 6));
            return;
        }
        if (key === "ArrowLeft"  && i > 0) { inputsRef.current[i - 1]?.focus(); return; }
        if (key === "ArrowRight" && i < 5) { inputsRef.current[i + 1]?.focus(); return; }
        if (/^\d$/.test(key)) {
            e.preventDefault();
            const newVal = value.split("");
            newVal[i] = key;
            onChange(newVal.join("").slice(0, 6));
            if (i < 5) inputsRef.current[i + 1]?.focus();
        }
    }

    function handlePaste(e) {
        e.preventDefault();
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        onChange(pasted);
        inputsRef.current[Math.min(pasted.length, 5)]?.focus();
    }

    return (
        <div className="flex gap-2.5 justify-center">
            {digits.map((d, i) => (
                <input
                    key={i}
                    ref={el => inputsRef.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={() => {}}
                    onKeyDown={e => handleKey(i, e)}
                    onPaste={handlePaste}
                    onFocus={e => e.target.select()}
                    className="w-12 h-[58px] text-center text-[22px] font-bold rounded-2xl text-white outline-none transition-all duration-200"
                    style={{
                        background: d
                            ? isSuccess ? "rgba(34,197,94,0.1)" : "rgba(124,58,237,0.12)"
                            : "rgba(255,255,255,0.03)",
                        border: isSuccess
                            ? "1px solid rgba(34,197,94,0.5)"
                            : hasError && !!d === false && value.length === 6
                            ? "1px solid rgba(239,68,68,0.5)"
                            : d
                            ? "1px solid rgba(124,58,237,0.7)"
                            : "1px solid rgba(255,255,255,0.09)",
                        boxShadow: isSuccess
                            ? "0 0 0 3px rgba(34,197,94,0.12)"
                            : d && !hasError
                            ? "0 0 0 3px rgba(124,58,237,0.15)"
                            : hasError
                            ? "0 0 0 3px rgba(239,68,68,0.1)"
                            : "none",
                    }}
                />
            ))}
        </div>
    );
}

// â”€â”€ Message banner â€” shows ALL server responses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function MessageBanner({ message, isError, countdown, countdownStart, onDismiss }) {
    if (!message) return null;
    const hasTimer = countdown > 0;
    const circ = 2 * Math.PI * 18;
    const progress = countdownStart > 0 ? (countdown / countdownStart) * circ : 0;

    return (
        <div className="rounded-2xl border p-4 transition-all duration-300"
            style={{
                background: isError ? "rgba(239,68,68,0.07)" : "rgba(34,197,94,0.07)",
                borderColor: isError ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)",
                color: isError ? "#f87171" : "#4ade80",
                animation: "bannerIn .25s ease both",
            }}>
            <div className="flex items-start gap-3">
                {hasTimer ? (
                    <div className="relative w-11 h-11 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                            <circle cx="22" cy="22" r="18" fill="none" stroke="currentColor"
                                strokeWidth="3" strokeLinecap="round"
                                strokeDasharray={circ} strokeDashoffset={circ - progress}
                                className="transition-all duration-1000 ease-linear" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums">{countdown}</span>
                    </div>
                ) : (
                    <div className="mt-0.5 flex-shrink-0">
                        {isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-relaxed">{message}</p>
                    {hasTimer && (
                        <p className="text-[11px] mt-1 opacity-55">You can retry once the timer ends.</p>
                    )}
                </div>

                {!hasTimer && onDismiss && (
                    <button type="button" onClick={onDismiss}
                        className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function VerifyResetOtpPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || "";

    // If someone lands here directly without going through forgot-password
    // first (no email in state), send them back â€” nothing to verify.
    useEffect(() => {
        if (!email) {
            navigate("/forgot-password", { replace: true });
        }
    }, [email, navigate]);

    const [otp,           setOtp]           = useState("");
    const [loading,       setLoading]       = useState(false);
    const [message,       setMessage]       = useState("");
    const [resendMessage, setResendMessage] = useState("");

    const [isError,       setIsError]       = useState(true);
    const [resendIsError, setResendIsError] = useState(false);
    const [countdownStart, setCountdownStart] = useState(0);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isSuccess,      setIsSuccess]     = useState(false);

    const countdown    = useCountdown(countdownStart, () => setCountdownStart(0));
    const resendSeconds = useCountdown(resendCooldown,  () => setResendCooldown(0));

    // â”€â”€ VERIFY OTP â€” on success, carry the one-time resetToken forward â”€â”€â”€â”€â”€â”€
    async function handleVerify(e) {
        e.preventDefault();
        try {
            setLoading(true);
            const response = await verifyResetOtp(email, otp);
            setIsError(false);
            setIsSuccess(true);
            setMessage(response.message || "OTP verified successfully");

            // resetToken is required on the next page â€” without it,
            // reset-password page will bounce the user back here.
            navigate("/reset-password", {
                state: { email, resetToken: response.resetToken },
            });
        } catch (error) {
            const msg    = error.response?.data?.message || "OTP verification failed. Please try again.";
            const status = error.response?.status;
            setIsError(true);
            setIsSuccess(false);
            setMessage(msg);
            const secs = extractSeconds(msg);
            if (status === 429 || secs > 0) setCountdownStart(secs || 60);
            else setCountdownStart(0);

            // Wrong/expired OTP â€” clear boxes so user re-enters cleanly
            setOtp("");
        } finally {
            setLoading(false);
        }
    }

    async function handleResend() {
        try {
            setResendMessage("");
            const response = await resendResetOtp(email);
            setResendIsError(false);
            setResendMessage(response.message || "OTP sent successfully");
            setResendCooldown(120);
            setOtp("");
            setMessage("");
            setIsSuccess(false);
        } catch (error) {
            const msg    = error.response?.data?.message || "Failed to resend OTP";
            const status = error.response?.status;
            setResendIsError(true);
            setResendMessage(msg);
            const secs = extractSeconds(msg);
            if (status === 429 || secs > 0) setResendCooldown(secs || 120);
        }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return (
        <div className="flex min-h-[calc(100vh-4rem)] w-full overflow-hidden" style={{ background: "#060510" }}>

            <AuthLeftPanel />

            <div className="flex-1 h-full overflow-y-auto relative"
                style={{ background: "linear-gradient(160deg,#0a0817 0%,#060510 100%)" }}>

                <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: "radial-gradient(rgba(139,92,246,0.08) 1px,transparent 1px)",
                    backgroundSize: "28px 28px",
                }} />
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle,rgba(124,58,237,0.07),transparent 70%)" }} />

                <div className="min-h-full flex items-center justify-center px-6 py-12 relative">
                    <div className="w-full max-w-[420px]" style={{ animation: "otpPageIn .35s ease both" }}>

                        <div className="flex items-center gap-2.5 mb-8 lg:hidden">
                            <div className="w-9 h-9 rounded-[13px] flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 0 20px rgba(124,58,237,0.45)" }}>
                                <span className="text-white text-[10px] font-black">AI</span>
                            </div>
                            <span className="text-white font-black tracking-tight text-[16px]">CareerForge AI</span>
                        </div>

                        <button type="button" onClick={() => navigate(-1)}
                            className="group flex items-center gap-2 text-slate-500 hover:text-slate-300 text-[12px] font-medium transition-colors mb-8">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                                <ArrowLeft size={13} />
                            </div>
                            Back
                        </button>

                        <StepIndicator />

                        <div className="flex items-center gap-4 mb-7">
                            <div className="relative flex-shrink-0">
                                <div className="absolute inset-0 rounded-2xl blur-xl scale-125 pointer-events-none"
                                    style={{ background: "rgba(124,58,237,0.3)" }} />
                                <div className="relative w-13 h-13 w-[52px] h-[52px] rounded-2xl flex items-center justify-center"
                                    style={{
                                        background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.12))",
                                        border: "1px solid rgba(124,58,237,0.3)",
                                        boxShadow: "0 0 28px rgba(124,58,237,0.22)",
                                    }}>
                                    <ShieldCheck size={24} className="text-violet-400" />
                                </div>
                            </div>
                            <div>
                                <h1 className="text-[24px] font-black text-white tracking-tight leading-tight">Verify OTP</h1>
                                <p className="text-slate-500 text-[12px] mt-1">
                                    Code sent to{" "}
                                    <span className="text-violet-400 font-semibold">{email || "your email"}</span>
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleVerify} className="space-y-4">

                            <p className="text-slate-600 text-[11px] font-semibold uppercase tracking-widest text-center mb-1">
                                Enter 6-digit code
                            </p>

                            <OtpBoxes
                                value={otp}
                                onChange={val => { setOtp(val); if (message) setMessage(""); }}
                                hasError={isError && !!message}
                                isSuccess={isSuccess}
                            />

                            <MessageBanner
                                message={message}
                                isError={isError}
                                countdown={countdown}
                                countdownStart={countdownStart}
                                onDismiss={() => setMessage("")}
                            />

                            <button type="submit"
                                disabled={loading || otp.length < 6 || countdown > 0}
                                className="w-full py-3.5 rounded-2xl text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{
                                    background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                                    boxShadow: (loading || otp.length < 6 || countdown > 0) ? "none" : "0 0 28px rgba(124,58,237,0.4)",
                                }}>
                                {loading ? (
                                    <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg> Verifyingâ€¦</>
                                ) : countdown > 0 ? (
                                    <><Clock size={15} /> Try again in {countdown}s</>
                                ) : (
                                    <><ShieldCheck size={15} /> Verify OTP</>
                                )}
                            </button>

                            <button type="button" onClick={handleResend}
                                disabled={resendSeconds > 0}
                                className="w-full py-3.5 rounded-2xl text-slate-400 hover:text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                {resendSeconds > 0 ? (
                                    <><Clock size={14} /> Resend in {resendSeconds}s</>
                                ) : (
                                    <><RotateCcw size={14} /> Resend OTP</>
                                )}
                            </button>

                            <MessageBanner
                                message={resendMessage}
                                isError={resendIsError}
                                countdown={0}
                                countdownStart={0}
                                onDismiss={() => setResendMessage("")}
                            />
                        </form>

                        <p className="text-center text-slate-700 text-[11px] mt-8">
                            CareerForge AI Â· Password Recovery Â· Step 2 of 3
                        </p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes otpPageIn {
                    from { opacity:0; transform:translateY(14px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                @keyframes bannerIn {
                    from { opacity:0; transform:translateY(6px); }
                    to   { opacity:1; transform:translateY(0); }
                }
            `}</style>
        </div>
    );
}

export default VerifyResetOtpPage;


