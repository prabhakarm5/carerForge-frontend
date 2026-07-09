// src/components/auth/SocialLogin.jsx
import React from "react";
import { FaGoogle, FaGithub } from "react-icons/fa";

function SocialLogin() {
  const handleGoogleLogin = () => {
    // TODO: yahan apna Google OAuth URL / flow use karo
    console.log("Google login clicked");
  };

  const handleGithubLogin = () => {
    // TODO: yahan apna GitHub OAuth URL / flow use karo
    console.log("GitHub login clicked");
  };

  return (
    <div className="space-y-3">
      {/* Google */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="w-full flex items-center justify-center gap-3 rounded-2xl px-4 py-2.5
        bg-white text-slate-800 border border-slate-200
        hover:bg-slate-50 hover:border-slate-300
        dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700
        dark:hover:bg-slate-800 dark:hover:border-slate-500
        transition-all duration-200 shadow-[0_10px_30px_rgba(15,23,42,0.12)]"
      >
        <FaGoogle className="h-5 w-5" />
        <span className="text-[13px] font-medium">Continue with Google</span>
      </button>

      {/* GitHub */}
      <button
        type="button"
        onClick={handleGithubLogin}
        className="w-full flex items-center justify-center gap-3 rounded-2xl px-4 py-2.5
        bg-slate-900 text-slate-100 border border-slate-800
        hover:bg-slate-800 hover:border-slate-700
        dark:bg-slate-100 dark:text-slate-900 dark:border-slate-300
        dark:hover:bg-white dark:hover:border-slate-400
        transition-all duration-200 shadow-[0_10px_30px_rgba(15,23,42,0.18)]"
      >
        <FaGithub className="h-5 w-5" />
        <span className="text-[13px] font-medium">Continue with GitHub</span>
      </button>
    </div>
  );
}

export default SocialLogin;