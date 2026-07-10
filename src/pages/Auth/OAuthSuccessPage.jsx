import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { CheckCircle2, Loader2, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { FaGithub } from "react-icons/fa";
import useAuthStore from "../../store/authStore";
import { completeOAuthSession } from "../../services/userAuthService";

function getFriendlyError(error) {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    "Social login failed. Please try again.";

  if (!error?.response) {
    return "Backend server is not reachable right now. Please start the server and try again.";
  }

  return message;
}

export default function OAuthSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("Verifying your social login...");

  const provider = useMemo(() => searchParams.get("provider") || "social", [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function finishOAuthLogin() {
      try {
        setMessage("Creating a secure session...");
        const response = await completeOAuthSession();
        if (cancelled) return;

        login(response);
        setStatus("success");
        setMessage("Login complete. Opening your dashboard...");
        toast.success(`${provider} login successful`);
        setTimeout(() => navigate("/dashboard", { replace: true }), 650);
      } catch (error) {
        if (cancelled) return;

        const friendlyMessage = getFriendlyError(error);
        setStatus("error");
        setMessage(friendlyMessage);
        toast.error(friendlyMessage);
        setTimeout(() => navigate(`/login?oauthError=${encodeURIComponent(friendlyMessage)}`, { replace: true }), 1800);
      }
    }

    finishOAuthLogin();

    return () => {
      cancelled = true;
    };
  }, [login, navigate, provider]);

  const isError = status === "error";
  const isSuccess = status === "success";

  return (
    <div className="relative grid min-h-[calc(100vh-4rem)] place-items-center overflow-hidden bg-[#080b16] px-5 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-18%] h-[28rem] w-[28rem] rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[30rem] w-[30rem] rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute left-[35%] top-[18%] h-72 w-72 rounded-full bg-fuchsia-500/15 blur-3xl" />
      </div>

      <section className="relative w-full max-w-md rounded-2xl border border-white/12 bg-white/[0.07] p-7 text-center shadow-[0_24px_80px_-30px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:p-8">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15">
          {isError ? <TriangleAlert className="text-rose-300" size={25} /> : isSuccess ? <CheckCircle2 className="text-emerald-300" size={25} /> : <ShieldCheck className="text-cyan-300" size={25} />}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-200/80">
          {provider === "github" ? <FaGithub size={14} /> : <Sparkles size={14} />}
          {provider} secure sign in
        </div>

        <h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">
          {isError ? "Could not finish login" : isSuccess ? "You're in" : "Almost there"}
        </h1>
        <p className="mx-auto mt-3 max-w-xs text-sm leading-6 text-white/68">{message}</p>

        {!isSuccess && !isError && (
          <div className="mt-7 flex items-center justify-center gap-2 text-sm font-semibold text-white/80">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-300" />
            Processing securely
          </div>
        )}
      </section>
    </div>
  );
}