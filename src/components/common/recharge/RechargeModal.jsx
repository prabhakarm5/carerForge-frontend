import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Crown, Gift, Loader2, Rocket, Sparkles, Star, TicketCheck, X, Zap } from "lucide-react";
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

const PlanCard = memo(function PlanCard({ plan, index, onSelect, isCurrent, isThisLoading, discountPercent }) {
  const theme = PLAN_THEMES[index % PLAN_THEMES.length];
  const { Icon } = theme;
  const price = Number(plan?.price || 0);
  const discounted = Math.max(0, Math.round(price * (100 - discountPercent) / 100));
  return <button type="button" onClick={() => onSelect(plan)} disabled={isThisLoading || isCurrent}
    className={`recharge-plan-card recharge-tone-${theme.tone} ${isCurrent ? "is-current" : ""}`}>
    {(theme.popular || isCurrent) && <span className="recharge-plan-label">{isCurrent ? <><Check size={10} />Current</> : "Popular"}</span>}
    <span className="recharge-plan-icon"><Icon size={15} /></span>
    <strong>{plan?.name || "Plan"}</strong>
    <span className="recharge-token-count"><Zap size={10} />{Number(plan?.tokens || 0).toLocaleString()} tokens</span>
    <span className="recharge-price">{price === 0 ? "Free" : `\u20B9${discountPercent ? discounted : price}`}
      <small>{discountPercent ? <del>\u20B9{price}</del> : price === 0 ? " included" : " one-time"}</small>
    </span>
    {isThisLoading ? <span className="recharge-processing"><Loader2 size={11} />Processing</span> : !isCurrent && <ArrowRight className="recharge-plan-arrow" size={14} />}
  </button>;
});

function rewardLabel(promo) {
  if (promo.rewardType === "FREE_PLAN") return "Free plan reward";
  if (promo.rewardType === "BONUS_TOKENS") return `${Number(promo.bonusTokens || 0).toLocaleString()} free tokens`;
  return `${promo.discountPercent}% off${promo.bonusTokens ? ` + ${Number(promo.bonusTokens).toLocaleString()} tokens` : ""}`;
}

function audienceLabel(audience) {
  if (audience === "NEVER_RECHARGED") return "First recharge only";
  if (audience === "SPECIFIC_USERS") return "Reward assigned to you";
  return "All eligible users";
}

export default function RechargeModal({ open, reason = "tokens", onClose, currentPlanId = null, onActivated }) {
  const navigate = useNavigate();
  const [plans, setPlans] = useState(() => cachedPlans || []);
  const [loading, setLoading] = useState(!cachedPlans);
  const [error, setError] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState(null);
  const [promos, setPromos] = useState([]);
  const [promoInput, setPromoInput] = useState("");
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [claimingCode, setClaimingCode] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    loadPlans().then((data) => { if (active) { setPlans(data); setError(false); } })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    axiosInstance.get(API.PROMOS.AVAILABLE).then((response) => {
      if (!active) return;
      const offers = response.data || [];
      setPromos(offers);
      const claimedDiscount = offers.find((promo) => promo.rewardType === "DISCOUNT" && promo.claimStatus === "CLAIMED");
      if (claimedDiscount) setSelectedPromo(claimedDiscount);
    }).catch(() => { if (active) setPromos([]); });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  const claimPromo = async (rawCode) => {
    const code = rawCode.trim().toUpperCase();
    if (!code || claimingCode) return;
    setClaimingCode(code);
    try {
      const { data } = await axiosInstance.post(API.PROMOS.CLAIM(code));
      const promo = data.promo;
      setPromos((current) => current.some((item) => item.id === promo.id)
        ? current.map((item) => item.id === promo.id ? promo : item)
        : [promo, ...current]);
      setPromoInput("");
      toast.success(data.message);
      if (data.rewardGranted) await onActivated?.();
      else setSelectedPromo(promo);
    } catch (request) {
      toast.error(request?.response?.data?.message || "Promo could not be claimed");
    } finally { setClaimingCode(""); }
  };

  const retry = () => {
    setLoading(true); setError(false);
    loadPlans(true).then(setPlans).catch(() => setError(true)).finally(() => setLoading(false));
  };

  const handleSelect = (plan) => {
    if (!plan || loadingPlanId || plan.id === currentPlanId) return;
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
  const selectedDiscount = selectedPromo?.rewardType === "DISCOUNT" ? Number(selectedPromo.discountPercent || 0) : 0;

  return createPortal(<div className="recharge-overlay" role="presentation">
    <button type="button" className="recharge-backdrop" onClick={onClose} aria-label="Close plans" />
    <section className="recharge-dialog" role="dialog" aria-modal="true" aria-labelledby="recharge-title">
      <header className="recharge-header"><span className="recharge-header-icon">{isRateLimit ? <Zap size={18} /> : <Sparkles size={18} />}</span>
        <div><h2 id="recharge-title">{isRateLimit ? "Request limit reached" : "Plans and rewards"}</h2><p>{isRateLimit ? "Choose a plan with more capacity." : "Claim an offer, then choose your plan."}</p></div>
        <button type="button" className="recharge-close" onClick={onClose} aria-label="Close"><X size={17} /></button>
      </header>
      <div className="recharge-content">
        <section className="recharge-claim-box" aria-label="Claim promo code">
          <div><TicketCheck size={15} /><span><strong>Have a reward code?</strong><small>Claim it before choosing a plan</small></span></div>
          <form onSubmit={(event) => { event.preventDefault(); claimPromo(promoInput); }}>
            <input value={promoInput} onChange={(event) => setPromoInput(event.target.value.toUpperCase())} maxLength={32} placeholder="ENTER CODE" />
            <button disabled={!promoInput.trim() || Boolean(claimingCode)}>{claimingCode === promoInput.trim() ? <Loader2 className="recharge-spin" size={13} /> : "Claim"}</button>
          </form>
        </section>

        {promos.length > 0 && <section className="recharge-offers" aria-label="Available promo offers">
          <div className="recharge-offers-title"><Gift size={14} /><span>Rewards available for your account</span></div>
          <div className="recharge-offer-list">{promos.map((promo) => {
            const claimed = promo.claimStatus === "CLAIMED";
            const used = promo.claimStatus === "REDEEMED";
            const selected = selectedPromo?.id === promo.id;
            return <article key={promo.id} className={`recharge-offer ${selected ? "selected" : ""}`}>
              <div><strong>{promo.code}</strong><small>{promo.title} - {rewardLabel(promo)}</small><em>{audienceLabel(promo.audience)}</em></div>
              <button type="button" disabled={used || claimingCode === promo.code} onClick={() => claimed && promo.rewardType === "DISCOUNT" ? setSelectedPromo(promo) : claimPromo(promo.code)}>
                {claimingCode === promo.code ? <Loader2 className="recharge-spin" size={12} /> : used ? "Used" : selected ? <><Check size={11} />Applied</> : claimed ? "Apply" : "Claim"}
              </button>
            </article>;
          })}</div>
        </section>}

        {selectedPromo && <div className="recharge-applied"><Check size={13} /><span><strong>{selectedPromo.code} applied</strong><small>{rewardLabel(selectedPromo)} will be verified by the server.</small></span><button onClick={() => setSelectedPromo(null)} title="Remove promo"><X size={13} /></button></div>}

        {loading ? <div className="recharge-state"><Loader2 className="recharge-spin" size={21} /><strong>Loading plans</strong></div>
          : error ? <div className="recharge-state"><strong>Plans could not be loaded</strong><button type="button" onClick={retry}>Retry</button></div>
          : plans.length === 0 ? <div className="recharge-state"><strong>No plans are available right now.</strong></div>
          : <div className="recharge-plan-grid">{plans.map((plan, index) => <PlanCard key={plan.id} plan={plan} index={index} onSelect={handleSelect}
              isCurrent={currentPlanId != null && plan.id === currentPlanId} isThisLoading={loadingPlanId === plan.id} discountPercent={selectedDiscount} />)}</div>}

        {!loading && !error && plans.length > 0 && <footer className="recharge-footer"><Check size={14} /><p>Amount and rewards are verified on the backend. <button type="button" onClick={() => { onClose(); navigate("/wallet"); }}>Open wallet</button></p></footer>}
      </div>
    </section>
  </div>, document.body);
}