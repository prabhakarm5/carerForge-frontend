import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, ArrowLeft, ShieldCheck, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { resetPassword } from "../../services/userAuthService";

// â”€â”€ Password strength â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function getStrength(pwd) {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s;
}

const STRENGTH_META = [
    null,
    { label: "Weak",   color: "bg-red-500",     text: "text-red-400",     width: "w-1/4" },
    { label: "Fair",   color: "bg-orange-400",   text: "text-orange-400",  width: "w-2/4" },
    { label: "Good",   color: "bg-yellow-400",   text: "text-yellow-400",  width: "w-3/4" },
    { label: "Strong", color: "bg-emerald-500",  text: "text-emerald-400", width: "w-full" },
];

// â”€â”€ Step indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StepIndicator() {
    const steps = ["Email", "Verify OTP", "New Password"];
    const current = 2;
    return (
        <div className="flex items-center gap-0 mb-8">
            {steps.map((step, i) => (
                <div key={step} className="flex items-center flex-1 last:flex-none">
                    <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border transition-all duration-300 ${
                            i < current
                                ? "bg-violet-600 border-violet-600 text-white"
                                : i === current
                                ? "bg-violet-600 border-violet-400 text-white shadow-[0_0_12px_rgba(139,92,246,0.5)]"
                                : "bg-transparent border-white/15 text-slate-600"
                        }`}>
                            {i < current
                                ? <CheckCircle2 size={13} />
                                : i + 1
                            }
                        </div>
                        <span className={`text-[10px] mt-1 font-semibold whitespace-nowrap ${
                            i === current ? "text-violet-400" : i < current ? "text-slate-500" : "text-slate-700"
                        }`}>
                            {step}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`flex-1 h-px mx-1.5 mb-4 transition-all duration-300 ${
                            i < current ? "bg-violet-600" : "bg-white/10"
                        }`} />
                    )}
                </div>
            ))}
        </div>
    );
}

function ResetPasswordPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || "";
    const resetToken = location.state?.resetToken || "";

    // Hard gate: no resetToken means this page was opened without going
    // through OTP verification (direct URL, refresh, manipulated state, etc).
    // Backend would reject it anyway, but bounce early for a clean UX.
    useEffect(() => {
        if (!resetToken) {
            toast.error("Please verify OTP first");
            navigate("/forgot-password", { replace: true });
        }
    }, [resetToken, navigate]);

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(true);

    const strength = getStrength(newPassword);
    const strengthMeta = STRENGTH_META[strength];
    const pwMatch = confirmPassword && newPassword === confirmPassword;
    const pwMismatch = confirmPassword && newPassword !== confirmPassword;

    async function handleSubmit(e) {
        e.preventDefault();
        setMessage("");

        if (!newPassword.trim()) {
            setIsError(true);
            setMessage("Password is required");
            return;
        }
        if (newPassword.length < 6) {
            setIsError(true);
            setMessage("Password must be at least 6 characters");
            return;
        }
        if (newPassword !== confirmPassword) {
            setIsError(true);
            setMessage("Passwords do not match");
            return;
        }

        try {
            setLoading(true);
            // resetToken â€” NOT email â€” proves OTP was verified server-side
            const response = await resetPassword(resetToken, newPassword);
            toast.success(response.message);
            navigate("/");
        } catch (error) {
            setIsError(true);
            const msg = error.response?.data?.message || "Failed to reset password";
            setMessage(msg);

            // Token expired/invalid/already used â€” send them back to restart
            if (error.response?.status === 400 || error.response?.status === 401) {
                setTimeout(() => {
                    navigate("/forgot-password", { replace: true });
                }, 2000);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-[#07060e] flex justify-center items-center p-4 relative overflow-hidden">

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-violet-900/15 blur-[140px] pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[350px] h-[350px] rounded-full bg-indigo-800/10 blur-[120px] pointer-events-none" />
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
                    backgroundSize: "36px 36px",
                }}
            />

            <div className="relative z-10 w-full max-w-md">

                <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="group flex items-center gap-2 text-slate-500 hover:text-slate-300 text-[13px] font-medium transition-colors duration-150 mb-6"
                >
                    <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 group-hover:bg-white/10 group-hover:border-white/20 flex items-center justify-center transition-all duration-150">
                        <ArrowLeft size={14} />
                    </div>
                    Back
                </button>

                <div className="bg-white/[0.04] border border-white/10 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl">

                    <StepIndicator />

                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative flex-shrink-0">
                            <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-lg scale-125" />
                            <div className="relative w-12 h-12 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                                <ShieldCheck size={22} className="text-violet-400" />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-[22px] font-black text-white tracking-tight leading-tight">
                                Reset Password
                            </h1>
                            <p className="text-slate-500 text-[12.5px] mt-0.5">
                                {email ? `For ${email}` : "Create a new password"}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">

                        {/* New password */}
                        <div>
                            <div className={`relative flex items-center rounded-xl border bg-slate-900/80 transition-all duration-200 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/25 ${
                                message && isError && !confirmPassword ? "border-red-500/40" : "border-white/10"
                            }`}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="New Password"
                                    className="w-full px-4 py-3.5 pr-12 bg-transparent text-white text-[14px] placeholder-slate-600 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors duration-150"
                                >
                                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>

                            {newPassword && strengthMeta && (
                                <div className="mt-2 px-1">
                                    <div className="h-[3px] w-full bg-white/6 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${strengthMeta.width} ${strengthMeta.color}`} />
                                    </div>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${strengthMeta.text}`}>
                                        {strengthMeta.label}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Confirm password */}
                        <div>
                            <div className={`relative flex items-center rounded-xl border bg-slate-900/80 transition-all duration-200 focus-within:ring-2 transition-all ${
                                pwMatch
                                    ? "border-emerald-500/50 focus-within:border-emerald-500 focus-within:ring-emerald-500/20"
                                    : pwMismatch
                                    ? "border-red-500/40 focus-within:border-red-500 focus-within:ring-red-500/15"
                                    : "border-white/10 focus-within:border-violet-500 focus-within:ring-violet-500/25"
                            }`}>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm Password"
                                    className="w-full px-4 py-3.5 pr-20 bg-transparent text-white text-[14px] placeholder-slate-600 outline-none"
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {confirmPassword && (
                                        pwMatch
                                            ? <CheckCircle2 size={15} className="text-emerald-400" />
                                            : <XCircle size={15} className="text-red-400" />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="text-slate-500 hover:text-slate-300 transition-colors duration-150"
                                    >
                                        {showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                                    </button>
                                </div>
                            </div>
                            {pwMismatch && (
                                <p className="flex items-center gap-1.5 text-[12px] text-red-400 font-medium mt-1.5 px-1">
                                    <XCircle size={12} /> Passwords don't match
                                </p>
                            )}
                            {pwMatch && (
                                <p className="flex items-center gap-1.5 text-[12px] text-emerald-400 font-medium mt-1.5 px-1">
                                    <CheckCircle2 size={12} /> Passwords match
                                </p>
                            )}
                        </div>

                        {/* Message banner â€” handles validation, server error, expired-token redirect */}
                        {message && (
                            <div className={`rounded-xl border p-3.5 flex items-start gap-3 ${
                                isError
                                    ? "bg-red-500/8 border-red-500/25 text-red-400"
                                    : "bg-green-500/8 border-green-500/25 text-green-400"
                            }`}>
                                <div className="mt-0.5 flex-shrink-0">
                                    {isError ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                                </div>
                                <p className="text-[13px] font-medium leading-relaxed">{message}</p>
                            </div>
                        )}

                        <button
                            disabled={loading || !resetToken}
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[14px] font-bold tracking-tight shadow-[0_0_24px_rgba(109,40,217,0.3)] hover:shadow-[0_0_36px_rgba(109,40,217,0.5)] active:scale-[0.99] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                        <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                    Please wait...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <ShieldCheck size={15} />
                                    Reset Password
                                </span>
                            )}
                        </button>
                    </form>

                    <p className="text-center text-slate-600 text-[11px] mt-6">
                        CareerForge AI Password Recovery
                    </p>
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordPage;
