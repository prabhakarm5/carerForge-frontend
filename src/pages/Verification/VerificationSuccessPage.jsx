import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

function VerificationSuccessPage() {
    return (
        <div className="min-h-screen bg-[#07060e] flex justify-center items-center p-4 relative overflow-hidden">

            {/* Background glows */}
            <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-emerald-700/10 blur-[130px] pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-violet-700/10 blur-[100px] pointer-events-none" />
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage:
                        "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
                    backgroundSize: "36px 36px",
                }}
            />

            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/[0.04] border border-white/10 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl text-center">

                    {/* Icon */}
                    <div className="flex justify-center mb-7">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl scale-150" />
                            <div className="relative w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                                <CheckCircle2 size={38} className="text-emerald-400" />
                            </div>
                        </div>
                    </div>

                    <h1 className="text-[26px] font-black text-white tracking-tight">
                        Email Verified!
                    </h1>
                    <p className="text-slate-500 text-[13.5px] mt-2 leading-relaxed">
                        Your account has been activated.<br />
                        You can now log in to CareerForge AI.
                    </p>

                    {/* Active badge */}
                    <div className="inline-flex items-center gap-2 mt-5 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[12px] font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Account active
                    </div>

                    {/* Button */}
                    <div className="mt-8">
                        <Link
                            to="/login"
                            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-[14px] font-bold tracking-tight shadow-[0_0_24px_rgba(109,40,217,0.3)] hover:shadow-[0_0_36px_rgba(109,40,217,0.5)] active:scale-[0.99] transition-all duration-200 flex items-center justify-center"
                        >
                            Go to Login
                        </Link>
                    </div>

                    <p className="text-center text-slate-600 text-[11px] mt-8">
                        CareerForge AI Email Verification System
                    </p>
                </div>
            </div>
        </div>
    );
}

export default VerificationSuccessPage;
