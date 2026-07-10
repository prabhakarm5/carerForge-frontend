// src/components/auth/SocialLogin.jsx
import React, { useState } from "react";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { Loader2 } from "lucide-react";
import { API_BASE_URL } from "../../config/api";

function SocialLogin() {
  const [loadingProvider, setLoadingProvider] = useState(null);

  const startOAuthLogin = (provider) => {
    setLoadingProvider(provider);
    // Backend Spring Security handles provider state + callback securely.
    // Frontend only starts the redirect; JWT cookies are issued by backend after success.
    window.location.href = `${API_BASE_URL}/oauth2/authorization/${provider}`;
  };

  const disabled = Boolean(loadingProvider);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => startOAuthLogin("google")}
        className="flex min-h-11 items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.08] to-amber-400/[0.12] px-4 py-2.5 text-white shadow-[0_10px_28px_-18px_rgba(245,158,11,0.9)] transition-all duration-150 hover:-translate-y-0.5 hover:border-amber-300/55 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
      >
        {loadingProvider === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaGoogle className="h-4 w-4 text-orange-500" />}
        <span className="text-[13px] font-bold">Google</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => startOAuthLogin("github")}
        className="flex min-h-11 items-center justify-center gap-2.5 rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.08] to-violet-500/[0.14] px-4 py-2.5 text-white shadow-[0_10px_28px_-18px_rgba(124,58,237,1)] transition-all duration-150 hover:-translate-y-0.5 hover:border-violet-300/60 disabled:translate-y-0 disabled:cursor-wait disabled:opacity-70"
      >
        {loadingProvider === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FaGithub className="h-4 w-4" />}
        <span className="text-[13px] font-bold">GitHub</span>
      </button>
    </div>
  );
}

export default SocialLogin;