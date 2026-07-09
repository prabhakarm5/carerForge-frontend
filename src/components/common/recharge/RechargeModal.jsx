import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  X, Zap, Star, Crown, Rocket,
  Check, Loader2, ArrowRight, Sparkles,
} from "lucide-react";
import toast from "react-hot-toast";
import axiosInstance from "../../../utils/axiosInstance";
import { API } from "../../../config/api";
import { handleApiError } from "../../../utils/errorHandler";

// ─── Per-plan visual identity ────────────────────────────────────────────────
const PLAN_THEMES = [
  { Icon: Zap,   grad: "from-violet-500 to-fuchsia-500", border: "border-violet-500/20", badge: "bg-violet-500/15 text-violet-300 border-violet-500/20", popular: false },
  { Icon: Crown, grad: "from-amber-400 to-orange-500",   border: "border-amber-500/20",  badge: "bg-amber-500/15 text-amber-300 border-amber-500/20",   popular: true  },
  { Icon: Rocket,grad: "from-blue-500 to-cyan-500",       border: "border-blue-500/20",   badge: "bg-blue-500/15 text-blue-300 border-blue-500/20",       popular: false },
  { Icon: Star,  grad: "from-emerald-500 to-teal-500",    border: "border-emerald-500/20",badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", popular: false },
];

// ─── Plan Card (compact, modal-specific) ──────────────────────────────────────
function PlanCard({ plan, index, onSelect, isCurrent, isThisLoading }) {
  const theme = PLAN_THEMES[index % PLAN_THEMES.length];
  const { Icon } = theme;
  const isFree = Number(plan?.price ?? 0) === 0;

  return (
    <button
      onClick={() => onSelect(plan)}
      disabled={isThisLoading || isCurrent}
      className={`
        recharge-plan-card
        group relative flex flex-col text-left w-full h-full
        rounded-xl border ${isCurrent ? "border-emerald-500/40" : theme.border}
        bg-white/[0.03]
        p-3
        ${theme.popular && !isCurrent ? "ring-1 ring-violet-500/30" : ""}
        ${isCurrent ? "ring-1 ring-emerald-500/30" : ""}
        disabled:cursor-not-allowed
      `}
    >
      {(theme.popular || isCurrent) && (
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10">
          <span className={`
            px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider text-white shadow-md
            flex items-center gap-1
            ${isCurrent ? "bg-emerald-600" : `bg-gradient-to-r ${theme.grad}`}
          `}>
            {isCurrent ? <><Check size={9} /> Current</> : "Popular"}
          </span>
        </div>
      )}

      <div className={`w-8 h-8 rounded-[9px] bg-gradient-to-br ${theme.grad} flex items-center justify-center mb-2.5 shadow-md shrink-0 ${isCurrent ? "opacity-70" : ""}`}>
        <Icon size={14} className="text-white" />
      </div>

      <p className="text-white font-bold text-[13.5px] leading-tight mb-2">{plan?.name || "Plan"}</p>

      <div className="mt-auto space-y-1.5">
        <div className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-semibold border ${theme.badge}`}>
          <Zap size={9} />
          {(plan?.tokens || 0).toLocaleString()} tokens
        </div>

        <div className="flex items-end gap-1">
          <span className="text-[18px] font-extrabold text-white tracking-tight leading-none">
            {isFree ? "Free" : `₹${plan?.price ?? 0}`}
          </span>
          {!isFree && <span className="text-slate-600 text-[10px] mb-0.5 leading-none">one-time</span>}
        </div>

        {isThisLoading && (
          <p className="text-[10.5px] text-violet-400 flex items-center gap-1 pt-0.5">
            <Loader2 size={10} className="animate-spin" /> Processing…
          </p>
        )}
      </div>

      {!isCurrent && (
        <div className="hidden sm:block absolute right-2.5 bottom-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowRight size={12} className="text-slate-500" />
        </div>
      )}
    </button>
  );
}

// ─── Fetch helper ────────────────────────────────────────────────────────────
async function fetchPlans(setPlans, setError, setLoading) {
  setLoading(true);
  setError(false);
  try {
    const res = await axiosInstance.get(API.PLANS.GET_ALL);
    // strict `=== true` filtering silently dropped plans where
    // `active` came back as 1 / "true" / undefined-but-meant-active.
    const list = (res.data || []).filter((p) => p.active !== false && p.active !== 0);
    setPlans(list);
  } catch {
    setError(true);
  } finally {
    setLoading(false);
  }
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export default function RechargeModal({ open, reason = "tokens", onClose, currentPlanId = null, onActivated }) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Per-plan loading id instead of one shared boolean — keeps a stuck
  // request from disabling every other card on screen.
  const [loadingPlanId, setLoadingPlanId] = useState(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = "auto"; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    fetchPlans(setPlans, setError, setLoading);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open, onClose]);

  async function handleSelect(plan) {
    if (!plan || loadingPlanId) return;
    if (currentPlanId != null && plan.id === currentPlanId) return; // already active
    const isFree = Number(plan.price ?? 0) === 0;

    // Free plan: activate directly via API, no checkout redirect needed.
    if (isFree) {
      setLoadingPlanId(plan.id);
      try {
        await axiosInstance.post(API.PLANS.ACTIVATE_FREE, { planId: plan.id });
        toast.success(`${plan.name} plan activated`);
        await onActivated?.(plan);
        onClose();
      } catch (err) {
        handleApiError(err);
      } finally {
        setLoadingPlanId(null);
      }
      return;
    }

    // Paid plan: hand off to wallet/checkout page.
    onClose();
    navigate(`/wallet?plan=${plan.id}`);
  }

  if (!open) return null;

  const isRateLimit = reason === "rateLimit";

  return (
    <>
      <style>{`
        @keyframes backdropIn { from{opacity:0} to{opacity:1} }
        @keyframes modalSlide {
          from{opacity:0;transform:translateY(20px) scale(0.98)}
          to{opacity:1;transform:translateY(0) scale(1)}
        }
        .recharge-plan-card { transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease; }
        @media (hover: hover) {
          .recharge-plan-card:hover:not(:disabled) { background-color: rgba(255,255,255,0.06); transform: translateY(-2px); }
        }
        .recharge-plan-card:active:not(:disabled) { transform: scale(0.98); }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4"
        style={{ animation: "backdropIn 0.2s ease-out" }}
      >
        {/* Plain solid overlay — cheap to repaint, no backdrop-blur lag on mobile */}
        <div
          className="absolute inset-0 bg-black/85"
          onClick={onClose}
        />

        <div
          className="
            relative z-10 w-full sm:max-w-xl
            bg-[#0a0d14] border border-white/[0.08]
            rounded-t-3xl sm:rounded-3xl
            shadow-2xl shadow-black/70
            overflow-hidden
            flex flex-col
            max-h-[90vh] sm:max-h-[80vh]
          "
          style={{ animation: "modalSlide 0.25s cubic-bezier(0.16,1,0.3,1)" }}
        >
          <div className="h-[2px] w-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-violet-600 shrink-0" />

          <div className="sm:hidden flex justify-center pt-2.5 shrink-0">
            <div className="w-9 h-1 rounded-full bg-white/15" />
          </div>

          <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-3 sm:pt-5 pb-0 shrink-0">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-[13px] bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-900/40 shrink-0">
                {isRateLimit ? <Zap size={18} className="text-white" /> : <Sparkles size={18} className="text-white" />}
              </div>
              <div className="pt-0.5 min-w-0">
                <h2 className="text-white font-bold text-[16px] leading-tight">
                  {isRateLimit ? "You're going fast!" : "Plans & tokens"}
                </h2>
                <p className="text-slate-500 text-[11.5px] mt-1 leading-relaxed max-w-[300px]">
                  {isRateLimit
                    ? "You've hit the request limit. Upgrade for more capacity."
                    : "Pick a plan — tokens are credited instantly."}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-600 hover:text-slate-300 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-all shrink-0 mt-0.5"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-5 sm:px-6 pt-4 pb-5 sm:pb-6 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 size={20} className="text-violet-400 animate-spin" />
                <p className="text-slate-600 text-xs">Loading plans…</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <p className="text-slate-500 text-sm">Failed to load plans</p>
                <button
                  onClick={() => fetchPlans(setPlans, setError, setLoading)}
                  className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : plans.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-slate-500 text-sm">No plans available right now.</p>
              </div>
            ) : (
              <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3">
                {plans.map((plan, i) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    index={i}
                    onSelect={handleSelect}
                    isCurrent={currentPlanId != null && plan.id === currentPlanId}
                    isThisLoading={loadingPlanId === plan.id}
                  />
                ))}
              </div>
            )}

            {!loading && !error && plans.length > 0 && (
              <div className="flex items-start gap-2.5 mt-4 pt-4 border-t border-white/[0.05]">
                <Check size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11.5px] text-slate-600 leading-relaxed">
                  Tokens are credited instantly after payment. View your balance in{" "}
                  <button
                    onClick={() => { onClose(); navigate("/wallet"); }}
                    className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors"
                  >
                    Wallet
                  </button>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}