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

  // Colors via inline style — this project's Tailwind build doesn't compile
  // arbitrary opacity classes like `from-white/[0.08]`, so those rendered as
  // transparent, which made both buttons effectively invisible on a light
  // background. Plain rgba() inline styles always work regardless of the
  // Tailwind config, so buttons stay visible and dark reliably.
  const baseButtonStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    color: "#ffffff",
  };

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => startOAuthLogin("google")}
        style={baseButtonStyle}
        className="flex min-h-11 items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 transition-opacity duration-150 hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
      >
        {loadingProvider === "google" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FaGoogle className="h-4 w-4" style={{ color: "#f97316" }} />
        )}
        <span className="text-[13px] font-bold">Google</span>
      </button>

      <button
        type="button"
        disabled={disabled}
        onClick={() => startOAuthLogin("github")}
        style={baseButtonStyle}
        className="flex min-h-11 items-center justify-center gap-2.5 rounded-xl px-4 py-2.5 transition-opacity duration-150 hover:opacity-90 disabled:cursor-wait disabled:opacity-50"
      >
        {loadingProvider === "github" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FaGithub className="h-4 w-4" style={{ color: "#ffffff" }} />
        )}
        <span className="text-[13px] font-bold">GitHub</span>
      </button>
    </div>
  );
}

export default SocialLogin;