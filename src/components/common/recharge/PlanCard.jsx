import { Check, Zap, Crown, Rocket, Sparkles } from "lucide-react";

const PLAN_COLORS = [
  { icon: Zap, gradient: "from-violet-500 to-fuchsia-500", border: "border-violet-500/40" },
  { icon: Crown, gradient: "from-amber-400 to-orange-500", border: "border-amber-500/40" },
  { icon: Rocket, gradient: "from-cyan-500 to-blue-600", border: "border-cyan-500/40" },
  { icon: Sparkles, gradient: "from-emerald-500 to-green-600", border: "border-emerald-500/40" },
];

const FEATURES = {
  Free: ["Chat AI"],
  Basic: ["Chat AI", "Image AI"],
  Pro: ["Chat AI", "Image AI", "Resume AI", "Website AI"],
  Enterprise: ["Unlimited Chat", "Image AI", "Resume AI", "Website AI", "Priority Support"],
};

/**
 * No framer-motion here on purpose — whileHover/whileTap were the actual
 * cause of the lag/hang on mobile when several cards rendered together.
 * Everything below is plain CSS (transform + transition only), which the
 * browser can composite on the GPU with zero JS work per frame.
 *
 * `isCurrent` — pass the caller's active plan id comparison in so this
 * card can show "Current plan" instead of "Choose plan" and skip the
 * click handler, matching the behavior in RechargeModal's inline card.
 */
function PlanCard({ plan, index, selected, onSelect, loading, isCurrent = false }) {
  const theme = PLAN_COLORS[index % PLAN_COLORS.length];
  const Icon = theme.icon;
  const features = FEATURES[plan.name] || FEATURES.Pro;
  const popular = index === 1 && !isCurrent;

  return (
    <button
      onClick={() => !isCurrent && onSelect(plan)}
      disabled={loading || isCurrent}
      className={`
        plan-card-btn
        relative flex flex-col h-full w-full min-w-0 text-left
        overflow-hidden rounded-2xl border ${isCurrent ? "border-emerald-500/50" : theme.border}
        bg-slate-900/70
        p-4 sm:p-5
        shadow-lg
        ${selected ? "ring-2 ring-violet-500" : ""}
        ${isCurrent ? "ring-2 ring-emerald-500/40" : ""}
        disabled:cursor-not-allowed
        ${isCurrent ? "" : "disabled:opacity-60"}
      `}
    >
      {popular && (
        <div className="absolute right-3 top-3 rounded-full bg-violet-600 px-2.5 py-1 text-[10px] font-semibold text-white whitespace-nowrap">
          MOST POPULAR
        </div>
      )}
      {isCurrent && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-semibold text-white whitespace-nowrap">
          <Check size={10} /> CURRENT PLAN
        </div>
      )}

      {/* Icon */}
      <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-r ${theme.gradient} shadow-md shrink-0 ${isCurrent ? "opacity-75" : ""}`}>
        <Icon size={20} className="text-white" />
      </div>

      {/* Name */}
      <h2 className="mt-3 sm:mt-4 text-base sm:text-xl font-bold text-white leading-tight">
        {plan.name}
      </h2>

      {/* Description */}
      <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-slate-400 min-h-[28px] sm:min-h-[36px] line-clamp-2">
        {plan.description}
      </p>

      {/* Price */}
      <div className="mt-3 sm:mt-5">
        <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          ₹{plan.price}
        </span>
        <p className="mt-1 text-violet-400 font-semibold text-xs sm:text-sm">
          {(plan.tokens ?? 0).toLocaleString()} Tokens
        </p>
      </div>

      {/* Divider */}
      <div className="my-3 sm:my-4 border-t border-slate-800" />

      {/* Features */}
      <div className="space-y-2 sm:space-y-2.5 flex-1">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-2 sm:gap-2.5">
            <Check size={14} className="text-green-400 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-300 truncate">{feature}</span>
          </div>
        ))}
      </div>

      {/* Button */}
      <div
        className={`
          mt-4 sm:mt-5 w-full rounded-xl
          ${isCurrent ? "bg-emerald-700/40 border border-emerald-500/40" : `bg-gradient-to-r ${theme.gradient}`}
          py-2.5 sm:py-3
          text-sm sm:text-base font-bold text-white text-center
          ${loading ? "opacity-50" : ""}
        `}
      >
        {loading ? "Please wait…" : isCurrent ? "Active" : "Choose plan"}
      </div>

      <style>{`
        .plan-card-btn {
          transition: border-color 0.15s ease, background-color 0.15s ease;
          transform: translateZ(0);
          will-change: transform;
        }
        @media (hover: hover) and (pointer: fine) {
          .plan-card-btn:hover:not(:disabled) { transform: translateY(-4px); background-color: rgba(15,23,42,0.9); }
        }
        .plan-card-btn:active:not(:disabled) { transform: scale(0.98); transition-duration: 0.08s; }
      `}</style>
    </button>
  );
}

export default PlanCard;