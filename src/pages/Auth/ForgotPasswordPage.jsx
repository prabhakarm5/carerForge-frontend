// ForgotPasswordPage.jsx  â€“  Split-screen: Left branding + Right form
// Backend/API logic 100% untouched â€” only UI redesigned
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, Clock, AlertTriangle, CheckCircle2, Mail } from "lucide-react";
import { forgotPassword } from "../../services/userAuthService";

// Extract seconds from backend message 
function extractSeconds(message) {
    if (!message) return 0;
    const match = message.match(/(\d+)\s*second/i);
    return match ? parseInt(match[1], 10) : 0;
}

//Countdown hook (untouched logic)
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

// â”€â”€ Animated aurora canvas (left panel bg)
function AuroraCanvas() { return null; }

// Left panel 
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

            {/* 3D perspective grid */}
            <div className="absolute inset-0 pointer-events-none" style={{
                backgroundImage: "linear-gradient(rgba(139,92,246,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,0.06) 1px,transparent 1px)",
                backgroundSize: "44px 44px",
                transform: "perspective(700px) rotateX(28deg) scale(1.6) translateY(10%)",
                transformOrigin: "center bottom",
            }} />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060510] via-transparent to-transparent pointer-events-none" />

            {/* Ghost "T" watermark */}
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

                {/* Hero + features */}
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
                        {FEATURES.map((f) => (
                            <div key={f.title} className="flex items-start gap-3.5 px-4 py-3.5 rounded-2xl transition-all duration-300"
                                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.055)", backdropFilter: "blur(8px)" }}>
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

// â”€â”€ Floating label input â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function FloatInput({ label, value, onChange, type = "text", error, autoFocus }) {
    const [focused, setFocused] = useState(false);
    const lifted = focused || !!value;
    return (
        <div className="relative">
            <label className="absolute left-4 pointer-events-none transition-all duration-200 z-10 font-medium"
                style={{
                    top: lifted ? 9 : "50%",
                    transform: lifted ? "none" : "translateY(-50%)",
                    fontSize: lifted ? 10 : 13,
                    color: lifted ? (error ? "#f87171" : "#a78bfa") : "#64748b",
                    letterSpacing: lifted ? "0.04em" : "normal",
                }}>
                {label}
            </label>
            <input
                type={type} value={value} onChange={onChange}
                autoFocus={autoFocus} autoComplete="email"
                onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                className="w-full h-[58px] px-4 pt-5 pb-2 rounded-2xl text-white text-[14px] outline-none transition-all duration-200"
                style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${error ? "rgba(239,68,68,0.5)" : focused ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.09)"}`,
                    boxShadow: focused ? (error ? "0 0 0 3px rgba(239,68,68,0.12)" : "0 0 0 3px rgba(124,58,237,0.14)") : "none",
                }}
            />
            {error && (
                <p className="flex items-center gap-1.5 text-red-400 text-[11px] mt-1.5 ml-1">
                    <AlertTriangle size={11} />{error}
                </p>
            )}
        </div>
    );
}

// â”€â”€ Countdown ring SVG â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CountdownRing({ seconds, total }) {
    const r = 18, circ = 2 * Math.PI * r;
    const progress = total > 0 ? (seconds / total) * circ : 0;
    return (
        <div className="relative w-11 h-11 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor"
                    strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={circ} strokeDashoffset={circ - progress}
                    className="transition-all duration-1000 ease-linear" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums">{seconds}</span>
        </div>
    );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ForgotPasswordPage() {
    const navigate = useNavigate();

    // â”€â”€ existing states (untouched) â”€â”€
    const [email,   setEmail]   = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    // â”€â”€ added states (UI only) â”€â”€
    const [isError,        setIsError]        = useState(false);
    const [countdownStart, setCountdownStart] = useState(0);
    const [sent,           setSent]           = useState(false); // success state

    const countdown = useCountdown(countdownStart, () => setCountdownStart(0));

    // â”€â”€ existing logic (untouched) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    async function handleSubmit(e) {
        e.preventDefault();
        try {
            setLoading(true);
            setMessage("");
            const response = await forgotPassword(email);
            setMessage(response.message);
            setIsError(false);
            setSent(true); // show success UI before navigation
            setTimeout(() => navigate("/verify-reset-otp", { state: { email } }), 1800);
        } catch (error) {
            const msg    = error.response?.data?.message;
            const status = error.response?.status;
            setMessage(msg);
            setIsError(true);
            const secs = extractSeconds(msg);
            if (status === 429 || secs > 0) {
                setCountdownStart(secs || 60);
            } else {
                setCountdownStart(0);
            }
        } finally {
            setLoading(false);
        }
    }

    // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    return (
        <div className="flex min-h-[calc(100vh-4rem)] w-full overflow-hidden" style={{ background: "#060510" }}>

            {/* â”€â”€ LEFT PANEL â”€â”€ */}
            <AuthLeftPanel />

            {/* â”€â”€ RIGHT PANEL â”€â”€ */}
            <div className="flex-1 h-full overflow-y-auto relative"
                style={{ background: "linear-gradient(160deg,#0a0817 0%,#060510 100%)" }}>

                {/* dot grid */}
                <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: "radial-gradient(rgba(139,92,246,0.08) 1px,transparent 1px)",
                    backgroundSize: "28px 28px",
                }} />

                {/* ambient glow */}
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full pointer-events-none"
                    style={{ background: "radial-gradient(circle,rgba(124,58,237,0.07),transparent 70%)" }} />

                <div className="min-h-full flex items-center justify-center px-6 py-12 relative">
                    <div className="w-full max-w-[400px]">

                        {/* Mobile logo */}
                        <div className="flex items-center gap-2.5 mb-8 lg:hidden">
                            <div className="w-9 h-9 rounded-[13px] flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 0 20px rgba(124,58,237,0.45)" }}>
                                <span className="text-white text-[10px] font-black">AI</span>
                            </div>
                            <span className="text-white font-black tracking-tight text-[16px]">CareerForge AI</span>
                        </div>

                        {/* Back button */}
                        <button type="button" onClick={() => navigate(-1)}
                            className="group flex items-center gap-2 text-slate-500 hover:text-slate-300 text-[12px] font-medium transition-colors duration-150 mb-8">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150"
                                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                                <ArrowLeft size={13} />
                            </div>
                            Back to sign in
                        </button>

                        {!sent ? (
                            /* â”€â”€ FORM STATE â”€â”€ */
                            <div style={{ animation: "fpSlideIn .32s ease both" }}>

                                {/* Lock icon hero */}
                                <div className="flex justify-center mb-7">
                                    <div className="relative">
                                        <div className="absolute inset-0 rounded-full blur-2xl scale-150 pointer-events-none"
                                            style={{ background: "radial-gradient(circle,rgba(124,58,237,0.3),transparent)" }} />
                                        <div className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center"
                                            style={{
                                                background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(79,70,229,0.12))",
                                                border: "1px solid rgba(124,58,237,0.3)",
                                                boxShadow: "0 0 32px rgba(124,58,237,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
                                            }}>
                                            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                <h1 className="text-[27px] font-black text-white tracking-tight text-center leading-tight">
                                    Forgot your password?
                                </h1>
                                <p className="text-slate-500 text-[13px] text-center mt-2 mb-8 leading-relaxed">
                                    Enter your registered email and we'll<br />send you a secure OTP to reset it.
                                </p>

                                <form onSubmit={handleSubmit} className="space-y-3">

                                    <FloatInput
                                        label="Email Address"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        error={isError && !countdown ? "" : ""}
                                        autoFocus
                                    />

                                    {/* Message / countdown banner */}
                                    {message && (
                                        <div className="rounded-2xl border p-4"
                                            style={{
                                                background: isError ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)",
                                                borderColor: isError ? "rgba(239,68,68,0.22)" : "rgba(34,197,94,0.22)",
                                                color: isError ? "#f87171" : "#4ade80",
                                            }}>
                                            <div className="flex items-start gap-3">
                                                {countdown > 0 ? (
                                                    <CountdownRing seconds={countdown} total={countdownStart} />
                                                ) : (
                                                    <div className="mt-0.5 flex-shrink-0">
                                                        {isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-[13px] font-medium leading-relaxed">{message}</p>
                                                    {countdown > 0 && (
                                                        <p className="text-[11px] mt-1 opacity-55">You can retry once the timer ends.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Send OTP */}
                                    <button type="submit" disabled={loading || countdown > 0}
                                        className="w-full py-3.5 rounded-2xl text-white text-[14px] font-bold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                                        style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: (loading || countdown > 0) ? "none" : "0 0 28px rgba(124,58,237,0.4)" }}>
                                        {loading ? (
                                            <><svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                            </svg> Sending OTPâ€¦</>
                                        ) : countdown > 0 ? (
                                            <><Clock size={15} /> Try again in {countdown}s</>
                                        ) : (
                                            <><Send size={15} /> Send OTP</>
                                        )}
                                    </button>

                                    {/* Ghost back button */}
                                    <button type="button" onClick={() => navigate("/login")}
                                        className="w-full py-3.5 rounded-2xl text-slate-400 hover:text-white text-[14px] font-semibold transition-all duration-200 active:scale-[0.99]"
                                        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                                        Back to Login
                                    </button>
                                </form>

                                <p className="text-center text-slate-700 text-[11px] mt-8">CareerForge AI Password Recovery</p>
                            </div>
                        ) : (
                            /* â”€â”€ SUCCESS STATE â”€â”€ */
                            <div style={{ animation: "fpSlideIn .4s ease both" }} className="text-center">
                                <div className="flex justify-center mb-7">
                                    <div className="relative w-[80px] h-[80px]">
                                        <div className="absolute inset-0 rounded-full animate-ping opacity-15"
                                            style={{ background: "radial-gradient(circle,rgba(34,197,94,0.7),transparent)" }} />
                                        <div className="relative w-full h-full rounded-full flex items-center justify-center"
                                            style={{
                                                background: "linear-gradient(135deg,rgba(34,197,94,0.18),rgba(16,185,129,0.1))",
                                                border: "1px solid rgba(34,197,94,0.3)",
                                                boxShadow: "0 0 40px rgba(34,197,94,0.22)",
                                            }}>
                                            <CheckCircle2 size={36} className="text-emerald-400" />
                                        </div>
                                    </div>
                                </div>
                                <h2 className="text-[26px] font-black text-white tracking-tight mb-2">OTP sent!</h2>
                                <p className="text-slate-500 text-[13px] leading-relaxed mb-2">Check your inbox at</p>
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl mb-6"
                                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                                    <Mail size={13} className="text-violet-400" />
                                    <span className="text-violet-300 text-[13px] font-semibold">{email}</span>
                                </div>
                                <p className="text-slate-600 text-[12px]">Redirecting you to verifyâ€¦</p>
                                {/* tiny spinner */}
                                <div className="flex justify-center mt-3">
                                    <svg className="h-4 w-4 animate-spin text-violet-500" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                        )}

                        <style>{`
                            @keyframes fpSlideIn {
                                from { opacity:0; transform:translateY(14px); }
                                to   { opacity:1; transform:translateY(0); }
                            }
                        `}</style>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;

