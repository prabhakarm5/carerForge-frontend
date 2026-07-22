import { useEffect, useState } from "react";
import { Check, Clock3, Copy, KeyRound, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import BrandLogo from "../../shared/BrandLogo";
import { revealAdminOtp } from "../../services/adminAuthService";

function formatTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

export default function AdminOtpRevealPage() {
  const [params] = useSearchParams();
  const token = params.get("token")?.trim();
  const [state, setState] = useState(() => token
    ? { status: "loading", otp: "", seconds: 0 }
    : { status: "error", otp: "", seconds: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;
    revealAdminOtp(token)
      .then((data) => active && setState({ status: "ready", otp: data.otp, seconds: data.expiresInSeconds }))
      .catch(() => active && setState({ status: "error", otp: "", seconds: 0 }));
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (state.status !== "ready" || state.seconds <= 0) return undefined;
    const timer = window.setInterval(() => {
      setState((current) => current.seconds <= 1
        ? { status: "expired", otp: "", seconds: 0 }
        : { ...current, seconds: current.seconds - 1 });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [state.status, state.seconds]);

  const copyOtp = async () => {
    await navigator.clipboard.writeText(state.otp);
    setCopied(true);
    toast.success("OTP copied");
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-[#070b13] px-4 py-8 text-white">
      <section className="w-full max-w-md border border-slate-700 bg-[#0d1421] p-6 shadow-2xl sm:p-8">
        <BrandLogo />
        <div className="mt-10 grid size-12 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 text-cyan-300">
          {state.status === "loading" ? <Loader2 className="animate-spin" /> : state.status === "ready" ? <ShieldCheck /> : <ShieldAlert />}
        </div>

        {state.status === "loading" && <><h1 className="mt-6 text-2xl font-black">Opening secure code</h1><p className="mt-2 text-sm text-slate-400">Checking the one-time link...</p></>}

        {state.status === "ready" && <>
          <p className="mt-6 text-xs font-black uppercase text-cyan-300">Administrator verification</p>
          <h1 className="mt-2 text-2xl font-black">Your one-time login code</h1>
          <button type="button" onClick={copyOtp} className="mt-7 flex w-full items-center justify-between border border-violet-400/30 bg-violet-400/10 px-4 py-5 text-left">
            <span className="font-mono text-3xl font-black tracking-[.28em] sm:text-4xl">{state.otp}</span>
            {copied ? <Check className="text-emerald-300" /> : <Copy className="text-violet-200" />}
          </button>
          <div className="mt-4 flex items-center gap-2 text-sm font-bold text-amber-300"><Clock3 size={17} /> Expires in {formatTime(state.seconds)}</div>
          <p className="mt-5 text-xs leading-6 text-slate-400">Return to the admin sign-in tab and enter this code. Never share it with anyone.</p>
        </>}

        {(state.status === "error" || state.status === "expired") && <>
          <h1 className="mt-6 text-2xl font-black">This link has expired</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">Request a fresh admin login code. For security, old links cannot reveal a new OTP.</p>
          <Link to="/admin/login" className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 bg-cyan-300 text-sm font-black text-[#031117]"><KeyRound size={17} /> Return to admin sign in</Link>
        </>}
      </section>
    </main>
  );
}