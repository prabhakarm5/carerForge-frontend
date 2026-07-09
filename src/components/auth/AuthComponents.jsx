// ─────────────────────────────────────────────────────────────────────────────
// AuthComponents.jsx  –  Reusable primitives for all auth pages
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Eye, EyeOff, AlertTriangle, Check } from "lucide-react";

// ── Step indicator dots ───────────────────────────────────────────────────────
export function StepIndicator({ step, total }) {
    return (
        <div className="flex items-center gap-2 mb-8">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center transition-all duration-500"
                        style={{
                            width: i <= step ? 28 : 24,
                            height: i <= step ? 28 : 24,
                            borderRadius: "50%",
                            background: i < step
                                ? "linear-gradient(135deg,#7c3aed,#4f46e5)"
                                : i === step
                                ? "rgba(124,58,237,0.12)"
                                : "rgba(255,255,255,0.04)",
                            border: i < step
                                ? "none"
                                : i === step
                                ? "2px solid rgba(124,58,237,0.7)"
                                : "1px solid rgba(255,255,255,0.1)",
                            boxShadow: i === step ? "0 0 12px rgba(124,58,237,0.35)" : i < step ? "0 0 16px rgba(124,58,237,0.5)" : "none",
                        }}>
                        {i < step
                            ? <Check size={13} className="text-white" strokeWidth={3} />
                            : <span className={`text-[10px] font-bold ${i === step ? "text-violet-300" : "text-white/25"}`}>{i + 1}</span>
                        }
                    </div>
                    {i < total - 1 && (
                        <div className="h-px w-8 transition-all duration-700 rounded-full"
                            style={{ background: i < step ? "linear-gradient(90deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.07)" }} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ── Floating-label input ──────────────────────────────────────────────────────
export function FloatInput({ label, name, type = "text", value, onChange, error, rightEl, rows, autoFocus, autoComplete }) {
    const [focused, setFocused] = useState(false);
    const lifted = focused || !!value;

    const inputCls = [
        "w-full rounded-2xl bg-white/[0.04] text-white text-[14px] outline-none transition-all duration-200",
        "border",
        error
            ? "border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
            : "border-white/[0.09] focus:border-violet-500/70 focus:ring-2 focus:ring-violet-500/15",
        rows ? "px-4 pt-7 pb-3 resize-none" : "px-4 pt-6 pb-2 h-[58px]",
    ].join(" ");

    return (
        <div className="relative">
            {/* floating label */}
            <label
                className="absolute left-4 pointer-events-none transition-all duration-200 z-10 font-medium"
                style={{
                    top: lifted ? (rows ? 10 : 9) : (rows ? 18 : "50%"),
                    transform: lifted || rows ? "none" : "translateY(-50%)",
                    fontSize: lifted ? 10 : 13,
                    color: lifted ? (error ? "#f87171" : "#a78bfa") : "#64748b",
                    letterSpacing: lifted ? "0.04em" : "normal",
                }}>
                {label}
            </label>

            {rows ? (
                <textarea
                    name={name} rows={rows} value={value} onChange={onChange}
                    autoFocus={autoFocus} autoComplete={autoComplete}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    className={inputCls}
                    style={{ background: "rgba(255,255,255,0.03)" }}
                />
            ) : (
                <input
                    name={name} type={type} value={value} onChange={onChange}
                    autoFocus={autoFocus} autoComplete={autoComplete}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    className={inputCls}
                    style={{ background: "rgba(255,255,255,0.03)" }}
                />
            )}

            {rightEl && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightEl}</div>
            )}

            {error && (
                <p className="flex items-center gap-1.5 text-red-400 text-[11px] mt-1.5 ml-1">
                    <AlertTriangle size={11} className="flex-shrink-0" />{error}
                </p>
            )}
        </div>
    );
}

// ── Password field with show/hide ─────────────────────────────────────────────
export function PasswordField({ label = "Password", name = "password", value, onChange, error, autoFocus, autoComplete = "current-password" }) {
    const [show, setShow] = useState(false);
    return (
        <FloatInput
            label={label} name={name} type={show ? "text" : "password"}
            value={value} onChange={onChange} error={error}
            autoFocus={autoFocus} autoComplete={autoComplete}
            rightEl={
                <button type="button" onClick={() => setShow(!show)}
                    className="text-slate-500 hover:text-slate-300 transition-colors duration-150 p-0.5">
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
            }
        />
    );
}

// ── Password strength bar (register only) ─────────────────────────────────────
export function PasswordStrength({ password }) {
    if (!password) return null;
    const hasUpper = /[A-Z]/.test(password);
    const hasNum   = /\d/.test(password);
    const hasSym   = /[^A-Za-z0-9]/.test(password);
    const score    = [password.length >= 8, password.length >= 12, hasUpper && hasNum, hasSym].filter(Boolean).length;
    const labels   = ["Too short", "Weak", "Fair", "Good", "Strong"];
    const colors   = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];
    return (
        <div className="space-y-1.5 px-1">
            <div className="flex gap-1">
                {[1,2,3,4].map(n => (
                    <div key={n} className="h-[3px] flex-1 rounded-full transition-all duration-400"
                        style={{ background: n <= score ? colors[score] : "rgba(255,255,255,0.06)" }} />
                ))}
            </div>
            <p className="text-[10px] font-medium" style={{ color: colors[score] }}>{labels[score]}</p>
        </div>
    );
}

// ── Server error / rate-limit banner ─────────────────────────────────────────
export function ServerBanner({ message, isError, countdown, totalSeconds, onDismiss }) {
    if (!message) return null;
    const hasCountdown = countdown > 0;
    const radius = 18, circ = 2 * Math.PI * radius;
    const progress = totalSeconds > 0 ? (countdown / totalSeconds) * circ : 0;

    return (
        <div className="rounded-2xl border p-4"
            style={{
                background: isError ? "rgba(239,68,68,0.06)" : "rgba(34,197,94,0.06)",
                borderColor: isError ? "rgba(239,68,68,0.22)" : "rgba(34,197,94,0.22)",
                color: isError ? "#f87171" : "#4ade80",
            }}>
            <div className="flex items-start gap-3">
                {hasCountdown ? (
                    <div className="relative w-11 h-11 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                            <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                            <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor"
                                strokeWidth="3" strokeLinecap="round"
                                strokeDasharray={circ} strokeDashoffset={circ - progress}
                                className="transition-all duration-1000 ease-linear" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums">{countdown}</span>
                    </div>
                ) : (
                    <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-relaxed">{message}</p>
                    {hasCountdown && <p className="text-[11px] mt-1 opacity-55">You can try again once the timer ends.</p>}
                </div>
                {!hasCountdown && (
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

// ── Primary action button ─────────────────────────────────────────────────────
export function PrimaryBtn({ children, onClick, type = "button", disabled, loading }) {
    return (
        <button type={type} onClick={onClick} disabled={disabled || loading}
            className="w-full py-3.5 rounded-2xl text-white text-[14px] font-bold tracking-tight flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
                background: "linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%)",
                boxShadow: (disabled || loading) ? "none" : "0 0 28px rgba(124,58,237,0.4)",
            }}>
            {loading
                ? <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    {typeof children === "string" ? "Please wait…" : children}
                  </>
                : children
            }
        </button>
    );
}

// ── Ghost (secondary) button ──────────────────────────────────────────────────
export function GhostBtn({ children, onClick, type = "button" }) {
    return (
        <button type={type} onClick={onClick}
            className="flex-1 py-3.5 rounded-2xl text-white text-[14px] font-semibold flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.99]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
            {children}
        </button>
    );
}

// ── OR divider ────────────────────────────────────────────────────────────────
export function OrDivider() {
    return (
        <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-slate-600 text-[11px] font-medium uppercase tracking-widest">or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>
    );
}

// ── Mobile logo bar ───────────────────────────────────────────────────────────
export function MobileLogo() {
    return (
        <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-[13px] flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 0 20px rgba(124,58,237,0.45)" }}>
                <span className="text-white text-[10px] font-black">AI</span>
            </div>
            <span className="text-white font-black tracking-tight text-[16px]">TrackAI</span>
        </div>
    );
}

// ── Right-panel wrapper (handles scroll + bg) ─────────────────────────────────
export function RightPanel({ children }) {
    return (
        <div className="flex-1 h-full overflow-y-auto relative"
            style={{ background: "linear-gradient(160deg,#0a0817 0%,#060510 100%)" }}>
            {/* subtle dot grid */}
            <div className="absolute inset-0 pointer-events-none"
                style={{
                    backgroundImage: "radial-gradient(rgba(139,92,246,0.08) 1px,transparent 1px)",
                    backgroundSize: "28px 28px",
                }} />
            <div className="min-h-full flex items-center justify-center px-6 py-12 relative">
                <div className="w-full max-w-[400px]">
                    {children}
                </div>
            </div>
        </div>
    );
}