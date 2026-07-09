import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff, Camera, Clock, AlertTriangle, Sparkles, Check } from "lucide-react";
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
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const progress = total > 0 ? (seconds / total) * circumference : 0;
    return (
        <div className="relative w-11 h-11 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
                <circle cx="22" cy="22" r={radius} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={circumference - progress}
                    className="transition-all duration-1000 ease-linear" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold tabular-nums">{seconds}</span>
        </div>
    );
}

// ✅ Backend/JSON se aane wala message (rate-limit, OTP, generic error) —
// clearly visible banner, alag se har field-error ke upar
function ServerBanner({ message, isError, countdown, totalSeconds, onDismiss }) {
    if (!message) return null;
    const hasCountdown = countdown > 0;
    return (
        <div className={`rounded-2xl border p-3.5 ${
            isError ? "bg-red-500/15 border-red-400/35 text-red-100" : "bg-emerald-500/15 border-emerald-400/35 text-emerald-100"
        }`}>
            <div className="flex items-start gap-3">
                {hasCountdown ? <CountdownRing seconds={countdown} total={totalSeconds} /> : <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium leading-relaxed">{message}</p>
                    {hasCountdown && <p className="text-[11px] mt-0.5 opacity-70">You can try again once the timer ends.</p>}
                </div>
                {!hasCountdown && (
                    <button type="button" onClick={onDismiss} className="opacity-50 hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
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

        try {
            setLoading(true);
            const data = new FormData();
            data.append("name", formData.name);
            data.append("email", formData.email);
            data.append("password", formData.password);
            data.append("mobileNumber", formData.mobileNumber);
            data.append("description", formData.description);
            if (formData.profileImage) data.append("profileImage", formData.profileImage);

            await registerUser(data);
            toast.success("Verification email sent");
            navigate("/verification-pending", { state: { email: formData.email } });
        } catch (error) {
            // ✅ Backend jo bhi field-level validation errors bhejta hai
            // (jaise { email: "Already registered", mobileNumber: "Invalid" })
            // wo yahan poore ke poore state mein store hote hain aur
            // neeche har input ke just niche dikhte hain.
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
        <div className="flex min-h-full w-full overflow-hidden bg-gradient-to-br from-[#1e0e3d] via-[#5b21b6] to-[#c026d3]">

            {/* ── LEFT BRAND PANEL — hidden on mobile ── */}
            <div className="hidden lg:flex w-[46%] flex-shrink-0 flex-col h-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#2b1055] via-[#6b21a8] to-[#9333ea]" />
                <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-[#a855f7]/35 blur-[110px]" />
                <div className="absolute -bottom-28 -left-16 h-96 w-96 rounded-full bg-[#ff6b4a]/30 blur-[110px]" />
                <div
                    className="absolute inset-0 opacity-[0.06]"
                    style={{
                        backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
                        backgroundSize: "40px 40px",
                    }}
                />

                <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-12">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6b4a] to-[#ff8a5c] flex items-center justify-center shadow-[0_10px_24px_-4px_rgba(255,107,74,0.6)]">
                            <span className="text-white text-[11px] font-black">CF</span>
                        </div>
                        <span className="text-white font-bold text-[15px] tracking-tight">CareerForge AI</span>
                    </div>

                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3.5 py-1.5">
                            <Sparkles size={13} className="text-[#ffb199]" />
                            <p className="text-[11px] font-bold uppercase tracking-widest text-white">Getting started</p>
                        </div>
                        <h2 className="text-[42px] xl:text-[46px] font-black text-white leading-[1.06] tracking-tight">
                            One account.<br />
                            <span className="bg-gradient-to-r from-[#ff9a6b] via-[#ffd36b] to-[#a78bfa] bg-clip-text text-transparent">
                                Every edge.
                            </span>
                        </h2>
                        <p className="max-w-sm text-[14px] leading-7 text-white/70">
                            Track applications, prep with AI, and never miss an opportunity again.
                        </p>

                        <ul className="space-y-3 pt-1">
                            {[
                                "AI resume tailoring in seconds",
                                "Smart application tracker",
                                "Interview prep & mock Q&A",
                                "Real-time job market signals",
                            ].map((item) => (
                                <li key={item} className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#ff8a65] to-[#a78bfa] flex items-center justify-center flex-shrink-0 shadow-[0_4px_12px_rgba(168,85,247,0.4)]">
                                        <Check size={12} className="text-white" />
                                    </div>
                                    <span className="text-white/75 text-[13.5px]">{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <p className="text-[11px] text-white/50">Trusted by 12,000+ job seekers worldwide</p>
                </div>
            </div>

            {/* ── RIGHT FORM PANEL (scrollable, all screen sizes) ── */}
            <div className="flex-1 h-full overflow-y-auto relative">
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -top-20 -left-10 h-72 w-72 rounded-full bg-[#ff6b4a]/25 blur-[100px]" />
                    <div className="absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-[#a855f7]/25 blur-[100px]" />
                </div>

                <div className="relative min-h-full flex items-center justify-center px-5 py-10 md:px-8">
                    <div className="w-full max-w-[440px]">

                        <div className="flex items-center gap-2 mb-6 lg:hidden">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6b4a] to-[#a855f7] flex items-center justify-center shadow-[0_8px_20px_-4px_rgba(168,85,247,0.5)]">
                                <span className="text-white text-[11px] font-black">CF</span>
                            </div>
                            <span className="text-white font-bold tracking-tight">CareerForge AI</span>
                        </div>

                        <div className="relative rounded-[28px] border border-white/20 bg-white/[0.08] p-7 shadow-[0_35px_80px_-25px_rgba(0,0,0,0.55)] backdrop-blur-2xl md:p-8">
                            <div className="pointer-events-none absolute inset-0 rounded-[28px] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" />

                            <h1 className="text-[24px] md:text-[26px] font-black text-white tracking-tight">Create Account</h1>
                            <p className="text-white/60 text-[13px] mt-1.5 mb-6">Join CareerForge AI and start your journey</p>

                            <form onSubmit={handleRegister} className="space-y-3">

                                <div className="flex flex-col items-center mb-2">
                                    <label className="cursor-pointer relative group">
                                        <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-[#ff6b4a]/30 to-[#a855f7]/30 group-hover:from-[#ff6b4a]/45 group-hover:to-[#a855f7]/45 transition-colors duration-200" />
                                        {previewImage ? (
                                            <img src={previewImage} alt="" className="relative z-10 w-24 h-24 rounded-full object-cover ring-[3px] ring-[#ff8a5c] ring-offset-[3px] ring-offset-transparent" />
                                        ) : (
                                            <div className="relative z-10 w-24 h-24 rounded-full bg-white/10 ring-[3px] ring-white/25 group-hover:ring-[#ff8a5c] ring-offset-[3px] ring-offset-transparent transition-all duration-200 flex justify-center items-center">
                                                <Camera size={28} className="text-white/60 group-hover:text-white transition-colors duration-200" />
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" hidden onChange={handleImageChange} />
                                    </label>
                                    {errors.profileImage && <p className="text-red-300 text-xs mt-2">{errors.profileImage}</p>}
                                </div>

                                <div>
                                    <input name="name" placeholder="Full Name" value={formData.name} onChange={handleChange}
                                        className={`w-full px-4 py-3.5 rounded-xl bg-white/10 border text-white text-[14px] placeholder-white/40 outline-none focus:ring-2 transition-colors duration-150 ${
                                            errors.name ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/25" : "border-white/15 focus:border-[#ff6b4a] focus:ring-[#ff6b4a]/25"
                                        } focus:bg-white/[0.14]`} />
                                    {errors.name && <p className="text-red-300 text-xs mt-1">{errors.name}</p>}
                                </div>

                                <div>
                                    <input name="email" type="email" placeholder="Email Address" value={formData.email} onChange={handleChange}
                                        className={`w-full px-4 py-3.5 rounded-xl bg-white/10 border text-white text-[14px] placeholder-white/40 outline-none focus:ring-2 transition-colors duration-150 ${
                                            errors.email ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/25" : "border-white/15 focus:border-[#ff6b4a] focus:ring-[#ff6b4a]/25"
                                        } focus:bg-white/[0.14]`} />
                                    {errors.email && <p className="text-red-300 text-xs mt-1">{errors.email}</p>}
                                </div>

                                <div>
                                    <input name="mobileNumber" placeholder="Mobile Number" value={formData.mobileNumber} onChange={handleChange}
                                        className={`w-full px-4 py-3.5 rounded-xl bg-white/10 border text-white text-[14px] placeholder-white/40 outline-none focus:ring-2 transition-colors duration-150 ${
                                            errors.mobileNumber ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/25" : "border-white/15 focus:border-[#ff6b4a] focus:ring-[#ff6b4a]/25"
                                        } focus:bg-white/[0.14]`} />
                                    {errors.mobileNumber && <p className="text-red-300 text-xs mt-1">{errors.mobileNumber}</p>}
                                </div>

                                <div>
                                    <div className="relative">
                                        <input name="password" type={showPassword ? "text" : "password"} placeholder="Password" value={formData.password} onChange={handleChange}
                                            className={`w-full px-4 py-3.5 pr-12 rounded-xl bg-white/10 border text-white text-[14px] placeholder-white/40 outline-none focus:ring-2 transition-colors duration-150 ${
                                                errors.password ? "border-red-400/60 focus:border-red-400 focus:ring-red-400/25" : "border-white/15 focus:border-[#ff6b4a] focus:ring-[#ff6b4a]/25"
                                            } focus:bg-white/[0.14]`} />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors duration-150">
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-red-300 text-xs mt-1">{errors.password}</p>}
                                </div>

                                <div className="relative">
                                    <input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange}
                                        className="w-full px-4 py-3.5 pr-12 rounded-xl bg-white/10 border border-white/15 text-white text-[14px] placeholder-white/40 outline-none focus:border-[#ff6b4a] focus:ring-2 focus:ring-[#ff6b4a]/25 focus:bg-white/[0.14] transition-colors duration-150" />
                                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors duration-150">
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <textarea name="description" placeholder="Tell us about yourself" rows="3" value={formData.description} onChange={handleChange}
                                    className="w-full px-4 py-3.5 rounded-xl bg-white/10 border border-white/15 text-white text-[14px] placeholder-white/40 outline-none focus:border-[#ff6b4a] focus:ring-2 focus:ring-[#ff6b4a]/25 focus:bg-white/[0.14] transition-colors duration-150 resize-none" />

                                <button
                                    disabled={loading || countdown > 0}
                                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#ff6b4a] via-[#ff8a5c] to-[#a855f7] text-white text-[14px] font-bold tracking-tight shadow-[0_14px_32px_-6px_rgba(168,85,247,0.55)] hover:shadow-[0_18px_38px_-6px_rgba(168,85,247,0.7)] active:scale-[0.99] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
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
                                        <span className="flex items-center justify-center gap-2"><Clock size={15} />Try again in {countdown}s</span>
                                    ) : "Create Account"}
                                </button>

                                <ServerBanner message={serverMessage} isError={isError} countdown={countdown} totalSeconds={countdownStart} onDismiss={clearBanner} />
                            </form>

                            <div className="my-6 flex items-center gap-3">
                                <div className="flex-1 h-px bg-white/15" />
                                <p className="text-white/40 text-sm">OR</p>
                                <div className="flex-1 h-px bg-white/15" />
                            </div>

                            <SocialLogin />

                            <p className="text-center text-white/60 mt-6 text-[13px]">
                                Already have an account?{" "}
                                <Link to="/login" className="text-[#ffb199] ml-1 hover:text-white font-semibold transition-colors duration-150">Login</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterForm;