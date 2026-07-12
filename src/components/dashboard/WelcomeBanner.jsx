import { Sparkles } from "lucide-react";
import useAuthStore from "../../store/authStore";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function WelcomeBanner() {
  const user = useAuthStore((state) => state.user);
  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <div
      className="
        relative overflow-hidden rounded-2xl sm:rounded-3xl
        bg-gradient-to-br from-violet-600 via-violet-700 to-fuchsia-700
        p-4 sm:p-7 md:p-8
        shadow-lg shadow-violet-900/30
        w-full min-w-0
      "
    >
      <div className="absolute -top-6 -right-6 sm:-top-10 sm:-right-10 w-20 sm:w-48 h-20 sm:h-48 bg-white/10 rounded-full blur-xl sm:blur-2xl pointer-events-none" />

      <div className="relative flex items-center gap-2 mb-1.5 sm:mb-2">
        <Sparkles size={16} className="text-white/90 shrink-0" />
        <span className="text-violet-100 text-xs sm:text-sm font-medium">
          {getGreeting()}
        </span>
      </div>

      <h1 className="relative text-lg sm:text-2xl md:text-3xl font-bold text-white tracking-tight leading-snug break-words">
        Welcome back, {firstName} 👋
      </h1>
      <p className="relative text-violet-100/80 text-xs sm:text-sm mt-1.5 sm:mt-2 max-w-md">
        Here's what's happening with your AI workspace today.
      </p>
    </div>
  );
}

export default WelcomeBanner;