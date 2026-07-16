import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Crown, Loader2, Rocket, Sparkles, Star, TicketCheck, X, Zap } from "lucide-react";
import toast from "react-hot-toast";

import axiosInstance from "../../../utils/axiosInstance";
import { API } from "../../../config/api";
import "./RechargeModal.css";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedPlans = null;
let cachedAt = 0;
let plansRequest = null;

const PLAN_THEMES = [
  { Icon: Zap, tone: "violet", popular: false },
  { Icon: Crown, tone: "amber", popular: true },
  { Icon: Rocket, tone: "cyan", popular: false },
  { Icon: Star, tone: "emerald", popular: false },
];

async function loadPlans(force = false) {
  if (!force && cachedPlans && Date.now() - cachedAt < CACHE_TTL_MS) return cachedPlans;
  if (!force && plansRequest) return plansRequest;
  plansRequest = axiosInstance.get(API.PLANS.GET_ALL).then((response) => {
    const plans = (response.data || []).filter((plan) => plan.active !== false && plan.active !== 0);
    cachedPlans = plans;
    cachedAt = Date.now();
    return plans;
  }).finally(() => { plansRequest = null; });
  return plansRequest;
}

// Call this ahead of time (e.g. on hover/focus over the "recharge" trigger,
// or once on app mount) to warm the plans cache so the modal renders
// instantly with data already in hand instead of showing a loading state.
export function preloadRechargePlans() {
  loadPlans().catch(() => {});
}

/**
 * Derives a safe, consistent price pair for a plan given a discount percent.
 * Clamped and defensive so a bad/late-arriving promo can never render a
 * negative, NaN, or stale "original price" next to the live price.
 */
function derivePrice(rawPrice, discountPercent) {
  const price = Number.isFinite(rawPrice) ? rawPrice : 0;
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  if (price <= 0 || pct <= 0) {
    return { original: price, final: price, hasDiscount: false };
  }
  const final = Math.max(0, Math.round(price * (100 - pct) / 100));
  // Guard against a discount that (due to bad data) doesn't actually reduce price.
  if (final >= price) {
    return { original: price, final: price, hasDiscount: false };
  }
  return { original: price, final, hasDiscount: true };
}

const PlanCard = memo(function PlanCard({ plan, index, onSelect, isCurrent, isThisLoading, discountPercent }) {
  const theme = PLAN_THEMES[index % PLAN_THEMES.length];
  const { Icon } = theme;
  const rawPrice = Number(plan?.price || 0);
  const { original, final, hasDiscount } = useMemo(
    () => derivePrice(rawPrice, discountPercent),
    [rawPrice, discountPercent]
  );

  return <button type="button" onClick={() => onSelect(plan)} disabled={isThisLoading}
    className={`recharge-plan-card recharge-tone-${theme.tone} ${isCurrent ? "is-current" : ""}`}>
    {(theme.popular || isCurrent) && <span className="recharge-plan-label">{isCurrent ? <><Check size={10} />Active · buy again</> : "Popular"}</span>}
    <span className="recharge-plan-icon"><Icon size={15} /></span>
    <strong title={plan?.name || "Plan"}>{plan?.name || "Plan"}</strong>
    <span className="recharge-token-count"><Zap size={10} />{Number(plan?.tokens || 0).toLocaleString()} tokens</span>
    <span className="recharge-price">
      {rawPrice === 0 ? "Free" : `\u20B9${final.toLocaleString()}`}
      <small>
        {hasDiscount ? <del>{`\u20B9${original.toLocaleString()}`}</del> : rawPrice === 0 ? " included" : " one-time"}
      </small>
    </span>
    {isThisLoading ? <span className="recharge-processing"><Loader2 size={11} />Processing</span> : <ArrowRight className="recharge-plan-arrow" size={14} />}
  </button>;
});

const PlanCardSkeleton = memo(function PlanCardSkeleton() {
  return <div className="recharge-plan-card recharge-skeleton" aria-hidden="true">
    <span className="recharge-skel-icon" />
    <span className="recharge-skel-line" style={{ width: "60%" }} />
    <span className="recharge-skel-line" style={{ width: "40%", height: 9 }} />
    <span className="recharge-skel-line" style={{ width: "45%", height: 18, marginTop: 13 }} />
  </div>;
});

function rewardLabel(promo) {
  if (promo.rewardType === "FREE_PLAN") return "Free plan reward";
  if (promo.rewardType === "BONUS_TOKENS") return `${Number(promo.bonusTokens || 0).toLocaleString()} free tokens`;
  return `${promo.discountPercent}% off${promo.bonusTokens ? ` + ${Number(promo.bonusTokens).toLocaleString()} tokens` : ""}`;
}

export default function RechargeModal({
  open,
  reason = "tokens",
  onClose,
  currentPlanId = null,
  initialPromoCode = "",
  onActivated,
}) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(() => cachedPlans || []);
  const [loading, setLoading] = useState(!cachedPlans);
  const [error, setError] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [promoCode, setPromoCode] = useState(initialPromoCode);
  const [claimingPromo, setClaimingPromo] = useState(false);

  // Tracks whether we're transitioning from closed -> open, so every open of
  // the modal starts from a clean slate. Without this, promo/price state
  // from a previous session could briefly render before being cleared,
  // which is what caused the "purana price galat" flash.
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) { wasOpen.current = false; return undefined; }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const freshOpen = !wasOpen.current;
    wasOpen.current = true;

    let active = true;

    if (freshOpen) {
      // Reset synchronously on every fresh open — no setTimeout race, no
      // stale promo/price bleeding over from the last time the modal was open.
      setSelectedPromo(null);
      setPromoCode(initialPromoCode || "");
      setError(false);
    }

    loadPlans().then((data) => { if (active) { setPlans(data); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });

    if (initialPromoCode) {
      axiosInstance.get(API.PROMOS.AVAILABLE).then((response) => {
        if (!active) return;
        const selected = (response.data || []).find((promo) =>
          promo.code === initialPromoCode && promo.rewardType === "DISCOUNT" && promo.claimStatus === "CLAIMED");
        setSelectedPromo(selected || null);
      }).catch(() => { if (active) setSelectedPromo(null); });
    }

    return () => { active = false; };
  }, [open, initialPromoCode]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  const retry = () => {
    setLoading(true); setError(false);
    loadPlans(true).then(setPlans).catch(() => setError(true)).finally(() => setLoading(false));
  };

  const claimPromo = async (event) => {
    event.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (!code || claimingPromo) return;
    setClaimingPromo(true);
    try {
      const { data } = await axiosInstance.post(API.PROMOS.CLAIM(code));
      const claimedPromo = data?.promo;
      if (claimedPromo?.rewardType === "DISCOUNT" && claimedPromo?.claimStatus !== "REDEEMED") {
        setSelectedPromo(claimedPromo);
      } else {
        setSelectedPromo(null);
      }
      toast.success(data?.message || "Promo applied");
      if (data?.rewardGranted) {
        localStorage.removeItem("cf_models_cache_v1");
        await onActivated?.();
      }
    } catch (claimError) {
      toast.error(claimError.response?.data?.message || "Promo code could not be applied");
    } finally {
      setClaimingPromo(false);
    }
  };

  const removePromo = useCallback(() => setSelectedPromo(null), []);

  const handleSelect = (plan) => {
    if (!plan || loadingPlanId) return;
    if (Number(plan.price ?? 0) === 0) { toast("Free plans are assigned through eligible rewards."); return; }
    setLoadingPlanId(plan.id);
    const params = new URLSearchParams({ plan: plan.id });
    if (selectedPromo?.code) params.set("promo", selectedPromo.code);
    onClose();
    navigate(`/wallet?${params.toString()}`);
    setLoadingPlanId(null);
  };

  if (!open) return null;
  const isRateLimit = reason === "rateLimit";
  const selectedDiscount = selectedPromo?.rewardType === "DISCOUNT"
    ? Math.min(100, Math.max(0, Number(selectedPromo.discountPercent || 0)))
    : 0;

  return createPortal(<div className="recharge-overlay" role="presentation">
    <button type="button" className="recharge-backdrop" onClick={onClose} aria-label="Close plans" />
    <section className="recharge-dialog" role="dialog" aria-modal="true" aria-labelledby="recharge-title">
      <header className="recharge-header"><span className="recharge-header-icon">{isRateLimit ? <Zap size={18} /> : <Sparkles size={18} />}</span>
        <div><h2 id="recharge-title">{isRateLimit ? "Request limit reached" : "Choose a token plan"}</h2><p>{isRateLimit ? "Choose a plan with more capacity." : "You can buy the same plan again or switch plans anytime."}</p></div>
        <button type="button" className="recharge-close" onClick={onClose} aria-label="Close"><X size={17} /></button>
      </header>
      <div className="recharge-content">
        <div className="recharge-claim-box">
          <div>
            <TicketCheck size={18} />
            <span><strong>Have a promo code?</strong><small>Claim rewards or apply a discount before checkout.</small></span>
          </div>
          <form onSubmit={claimPromo}>
            <input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              maxLength={40}
              autoComplete="off"
              aria-label="Promo code"
            />
            <button type="submit" disabled={!promoCode.trim() || claimingPromo}>
              {claimingPromo ? <Loader2 size={13} className="recharge-spin" /> : "Apply"}
            </button>
          </form>
        </div>
        {selectedPromo && <div className="recharge-applied"><Check size={13} /><span><strong>{selectedPromo.code} applied</strong><small>{rewardLabel(selectedPromo)} will be verified by the server.</small></span><button onClick={removePromo} title="Remove promo"><X size={13} /></button></div>}

        {loading
          ? <div className="recharge-plan-grid" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => <PlanCardSkeleton key={i} />)}
            </div>
          : error ? <div className="recharge-state"><strong>Plans could not be loaded</strong><button type="button" onClick={retry}>Retry</button></div>
          : plans.length === 0 ? <div className="recharge-state"><strong>No plans are available right now.</strong></div>
          : <div className="recharge-plan-grid">{plans.map((plan, index) => <PlanCard key={plan.id} plan={plan} index={index} onSelect={handleSelect}
              isCurrent={currentPlanId != null && plan.id === currentPlanId} isThisLoading={loadingPlanId === plan.id} discountPercent={selectedDiscount} />)}</div>}

        {!loading && !error && plans.length > 0 && <footer className="recharge-footer"><Check size={14} /><p>Amount and rewards are verified on the backend. <button type="button" onClick={() => { onClose(); navigate("/wallet"); }}>Open wallet</button></p></footer>}
      </div>
    </section>
  </div>, document.body);
}