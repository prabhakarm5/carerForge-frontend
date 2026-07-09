import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Camera, Clock, AlertTriangle, Sparkles, Check, Flame, Zap } from "lucide-react";
import { registerUser } from "../../services/userAuthService";
import SocialLogin from "../../components/auth/SocialLogin";

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
                if (prev <= 1) { clearInterval(timerRef.current); onFinish?.(); return 0; }
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
                <circle cx="20" cy="20" r={radius} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                    className="transition-all duration-1000 ease-linear" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold tabular-nums">{seconds}</span>
        </div>
    );
}

// Server/JSON se aane wala banner — rate-limit, OTP, generic error
function ServerBanner({ message, isError, countdown, totalSeconds, onDismiss }) {
    if (!message) return null;
    const hasCountdown = countdown > 0;
    return (
        <div className={`rounded-xl border p-3 ${
            isError ? "bg-red-500/15 border-red-400/35 text-red-100" : "bg-emerald-500/15 border-emerald-400/35 text-emerald-100"
        }`}>
            <div className="flex items-start gap-2.5">
                {hasCountdown ? <CountdownRing seconds={countdown} total={totalSeconds} /> : <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium leading-relaxed">{message}</p>
                    {hasCountdown && <p className="text-[10.5px] mt-0.5 opacity-70">You can try again once the timer ends.</p>}
                </div>
                {!hasCountdown && (
                    <button type="button" onClick={onDismiss} className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
}

// Compact, reusable input
function FormInput({ error, className = "", ...props }) {
    return (
        <div>
            <input
                {...props}
                className={`w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border text-white text-[13px] placeholder-white/35 outline-none focus:ring-2 transition-colors duration-150 ${
                    error ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/25" : "border-white/10 focus:border-violet-400 focus:ring-violet-400/25"
                } focus:bg-white/[0.09] ${className}`}
            />
            {error && <p className="text-red-300 text-[11px] mt-1">{error}</p>}
        </div>
    );
}

// Legal-safety checkboxes — both required before submit, so the user has
// explicitly agreed to (a) Terms & Conditions and (b) how credits/payments
// work on this platform, before an account is created. Backend also records
// the consent + timestamp on submit — this is the evidence trail that
// protects the platform if a dispute or regulatory question ever comes up.
function ConsentCheckbox({ checked, onChange, children }) {
    return (
        <label className="flex items-start gap-2.5 cursor-pointer group select-none">
            <span
                onClick={onChange}
                className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[5px] border transition-colors duration-150 ${
                    checked
                        ? "border-transparent bg-gradient-to-br from-violet-400 to-amber-400"
                        : "border-white/25 bg-white/5 group-hover:border-white/45"
                }`}
            >
                {checked && <Check size={11} className="text-black" strokeWidth={3.5} />}
            </span>
            <span className="text-[11.5px] leading-5 text-white/60">{children}</span>
        </label>
    );
}

function RegisterForm() {
    const navigate = useNavigate();
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [previewImage, setPreviewImage] = useState("");
    const [formData, setFormData] = useState({
        name: "", email: "", password: "", confirmPassword: "", mobileNumber: "", description: "", profileImage: null
    });

    const [agreedTerms, setAgreedTerms] = useState(false);
    const [agreedPayment, setAgreedPayment] = useState(false);

    const [serverMessage, setServerMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [countdownStart, setCountdownStart] = useState(0);

    const countdown = useCountdown(countdownStart, () => { setServerMessage(""); setIsError(false); setCountdownStart(0); });

    function clearBanner() { setServerMessage(""); setIsError(false); setCountdownStart(0); }
    function handleChange(e) { setFormData({ ...formData, [e.target.name]: e.target.value }); }
    function handleImageChange(e) {
        const file = e.target.files[0];
        setFormData({ ...formData, profileImage: file });
        if (file) setPreviewImage(URL.createObjectURL(file));
    }

    async function handleRegister(e) {
        e.preventDefault();
        setErrors({});

        if (formData.password !== formData.confirmPassword) { toast.error("Passwords do not match"); return; }
        if (!agreedTerms) { toast.error("Please accept the Terms & Conditions to continue"); return; }
        if (!agreedPayment) { toast.error("Please acknowledge the payment & credits policy to continue"); return; }

        try {
            setLoading(true);
            const data = new FormData();
            data.append("name", formData.name);
            data.append("email", formData.email);
            data.append("password", formData.password);
            data.append("mobileNumber", formData.mobileNumber);
            data.append("description", formData.description);
            if (formData.profileImage) data.append("profileImage", formData.profileImage);
            // Record consent on the backend — evidence if a dispute or
            // regulatory question ever comes up later.
            data.append("acceptedTerms", "true");
            data.append("acceptedPaymentPolicy", "true");
            data.append("consentTimestamp", new Date().toISOString());

            await registerUser(data);
            toast.success("Verification email sent");
            navigate("/verification-pending", { state: { email: formData.email } });
        } catch (error) {
            if (error.response?.data?.validationErrors) {
                setErrors(error.response.data.validationErrors);
            }

            const status = error.response?.status;
            let message = error.response?.data?.message;
            if (!error.response) message = "Server not reachable. Please try again in a moment.";
            else if (status === 404) message = "Requested resource not found.";
            else if (!message) message = "Registration failed. Please try again.";

            const secs = extractSeconds(message);
            if (status === 429 || (status === 400 && secs > 0)) {
                setIsError(true); setServerMessage(message); setCountdownStart(secs);
            } else if (status >= 400 && !error.response?.data?.validationErrors) {
                setIsError(true); setServerMessage(message); setCountdownStart(0);
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen w-full overflow-hidden bg-[#0a0713]">

            {/* ── LEFT PANEL — "The Forge". Narrow, quiet, its own visual
                identity: a single glowing molten-core signature instead of
                a wall of copy. Hidden below lg — on small screens the form
                is simply full-width and centered, it never stacks under
                the form. ── */}
            <aside className="hidden lg:flex w-[34%] flex-shrink-0 relative overflow-hidden bg-[#0a0713] border-r border-white/[0.06]">
                {/* molten core glow */}
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 h-[480px] w-[480px] rounded-full bg-gradient-to-br from-amber-500/25 via-fuchsia-500/20 to-violet-600/25 blur-[100px] animate-[pulse_7s_ease-in-out_infinite]" />
                <div className="absolute bottom-[-15%] left-[-10%] h-[300px] w-[300px] rounded-full bg-violet-600/20 blur-[110px]" />

                <div className="relative z-10 flex flex-col justify-between h-full w-full px-9 py-11">
                    <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-fuchsia-500 to-violet-600 shadow-[0_8px_20px_-4px_rgba(217,70,239,0.5)]">
                            <Flame size={16} className="text-white" strokeWidth={2.5} />
                        </span>
                        <span className="text-white font-black text-[14px] tracking-tight">CareerForge AI</span>
                    </div>

                    {/* signature element: a single vertical "forge line" — three
                        stages of a career being shaped, read top to bottom */}
                    <div className="space-y-9">
                        <h2 className="text-[30px] font-black text-white leading-[1.15] tracking-tight">
                            Where your<br />career gets<br />
                            <span className="bg-gradient-to-r from-amber-300 via-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
                                forged.
                            </span>
                        </h2>

                        <div className="relative pl-5">
                            <div className="absolute left-[5px] top-1 bottom-1 w-px bg-gradient-to-b from-amber-400/70 via-fuchsia-400/50 to-violet-500/10" />
                            {[
                                { label: "Shape", text: "AI-tailored resumes & ATS scoring" },
                                { label: "Sharpen", text: "Code review & interview practice" },
                                { label: "Ship", text: "Apply with confidence, credits included" },
                            ].map((step, i) => (
                                <div key={step.label} className="relative pb-7 last:pb-0">
                                    <span className="absolute left-[-21px] top-0.5 h-2.5 w-2.5 rounded-full bg-gradient-to-br from-amber-300 to-fuchsia-400 ring-4 ring-[#0a0713]" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-300/80">{step.label}</p>
                                    <p className="text-slate-300 text-[12.5px] font-medium mt-0.5">{step.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
                        <Zap size={13} className="text-amber-300 flex-shrink-0" />
                        <p className="text-[11px] text-slate-300 font-medium">100 free credits — no card, no commitment</p>
                    </div>
                </div>
            </aside>

            {/* ── RIGHT FORM PANEL — compact, single scroll, colorful ── */}
            <div className="flex-1 min-h-screen overflow-y-auto relative">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-16 -left-10 h-56 w-56 rounded-full bg-violet-500/10 blur-[100px]" />
                    <div className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-amber-400/10 blur-[100px]" />
                </div>

                <div className="relative min-h-screen flex items-center justify-center px-4 py-6 md:px-6">
                    <div className="w-full max-w-[368px]">

                        <div className="flex items-center gap-2 mb-4 lg:hidden">
                            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 via-fuchsia-500 to-violet-600">
                                <Flame size={14} className="text-white" strokeWidth={2.5} />
                            </span>
                            <span className="text-white font-black text-[14px] tracking-tight">CareerForge AI</span>
                        </div>

                        <div className="relative rounded-[1.35rem] border border-white/10 bg-white/[0.05] p-5 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.75)] backdrop-blur-2xl">
                            <div className="pointer-events-none absolute inset-0 rounded-[1.35rem] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" />

                            <h1 className="text-[19px] font-black text-white tracking-tight">Create your account</h1>
                            <p className="text-slate-400 text-[11.5px] mt-0.5 mb-4">Free 100 credits, no card required</p>

                            <form onSubmit={handleRegister} className="space-y-2.5">

                                {/* Compact inline avatar picker — no giant centered circle eating vertical space */}
                                <label className="flex items-center gap-3 mb-1 cursor-pointer group">
                                    <div className="relative flex-shrink-0">
                                        <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-amber-400/40 to-violet-500/40 group-hover:opacity-100 opacity-70 transition-opacity" />
                                        {previewImage ? (
                                            <img src={previewImage} alt="" className="relative z-10 w-11 h-11 rounded-full object-cover" />
                                        ) : (
                                            <div className="relative z-10 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center">
                                                <Camera size={15} className="text-white/60 group-hover:text-white transition-colors duration-150" />
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                                    </div>
                                    <span className="text-[11.5px] text-white/50 group-hover:text-white/75 transition-colors duration-150">
                                        Add a profile photo <span className="text-white/30">(optional)</span>
                                    </span>
                                </label>
                                {errors.profileImage && <p className="text-red-300 text-[11px] -mt-1.5">{errors.profileImage}</p>}

                                <FormInput name="name" placeholder="Full Name" value={formData.name} onChange={handleChange} error={errors.name} />
                                <FormInput name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleChange} error={errors.email} />
                                <FormInput name="mobileNumber" placeholder="Mobile Number" value={formData.mobileNumber} onChange={handleChange} error={errors.mobileNumber} />

                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="relative">
                                        <FormInput
                                            name="password" type={showPassword ? "text" : "password"} placeholder="Password"
                                            value={formData.password} onChange={handleChange} error={undefined}
                                            className="pr-9"
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-[13px] text-white/40 hover:text-white transition-colors duration-150">
                                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <FormInput
                                            name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm"
                                            value={formData.confirmPassword} onChange={handleChange} error={undefined}
                                            className="pr-9"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2.5 top-[13px] text-white/40 hover:text-white transition-colors duration-150">
                                            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>
                                    </div>
                                </div>
                                {errors.password && <p className="text-red-300 text-[11px] -mt-1.5">{errors.password}</p>}

                                <textarea
                                    name="description" placeholder="Tell us about yourself (optional)" rows="2"
                                    value={formData.description} onChange={handleChange}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.06] border border-white/10 text-white text-[13px] placeholder-white/35 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-400/25 focus:bg-white/[0.09] transition-colors duration-150 resize-none"
                                />

                                {/* Legal consent block — required, and each item links to a
                                    real, readable page rather than a placeholder anchor */}
                                <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                                    <ConsentCheckbox checked={agreedTerms} onChange={() => setAgreedTerms(!agreedTerms)}>
                                        I have read and agree to the{" "}
                                        <Link to="/terms" target="_blank" className="text-amber-300 hover:text-white font-semibold underline underline-offset-2">
                                            Terms &amp; Conditions
                                        </Link>.
                                    </ConsentCheckbox>

                                    <ConsentCheckbox checked={agreedPayment} onChange={() => setAgreedPayment(!agreedPayment)}>
                                        I understand this account starts with free credits, that continued use may
                                        require a paid plan, and I authorize secure payment processing via Razorpay
                                        for any plan I choose — as described in the{" "}
                                        <Link to="/payment-policy" target="_blank" className="text-amber-300 hover:text-white font-semibold underline underline-offset-2">
                                            Payment &amp; Credits Policy
                                        </Link>. No payment is taken now or without my separate action at checkout.
                                    </ConsentCheckbox>
                                </div>

                                <button
                                    disabled={loading || countdown > 0}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-fuchsia-500 to-violet-600 text-white text-[13.5px] font-black tracking-tight shadow-[0_12px_28px_-6px_rgba(217,70,239,0.45)] hover:shadow-[0_16px_34px_-6px_rgba(217,70,239,0.6)] active:scale-[0.99] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
                                                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                            </svg>
                                            Creating Account...
                                        </span>
                                    ) : countdown > 0 ? (
                                        <span className="flex items-center justify-center gap-2"><Clock size={14} />Try again in {countdown}s</span>
                                    ) : "Create Account"}
                                </button>

                                <ServerBanner message={serverMessage} isError={isError} countdown={countdown} totalSeconds={countdownStart} onDismiss={clearBanner} />
                            </form>

                            <div className="my-4 flex items-center gap-3">
                                <div className="flex-1 h-px bg-white/10" />
                                <p className="text-slate-500 text-[11px]">OR</p>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>

                            <SocialLogin />

                            <p className="text-center text-slate-400 mt-4 text-[12px]">
                                Already have an account?{" "}
                                <Link to="/login" className="text-amber-300 ml-1 hover:text-white font-semibold transition-colors duration-150">Login</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterForm;