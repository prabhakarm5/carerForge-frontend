import { useCallback, useEffect, useState } from "react";
import { Check, Gift, Loader2, RefreshCw, Sparkles, TicketCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axiosInstance from "../../utils/axiosInstance";
import { API } from "../../config/api";

function rewardLabel(promo) {
  if (promo.rewardType === "FREE_PLAN") return "Free plan reward";
  if (promo.rewardType === "BONUS_TOKENS") return `${Number(promo.bonusTokens || 0).toLocaleString()} free tokens`;
  return `${promo.discountPercent}% discount${promo.bonusTokens ? ` + ${Number(promo.bonusTokens).toLocaleString()} tokens` : ""}`;
}

function audienceLabel(audience) {
  if (audience === "NEVER_RECHARGED") return "First recharge";
  if (audience === "SPECIFIC_USERS") return "Assigned to your account";
  return "Eligible users";
}

export default function PromosPage() {
  const navigate = useNavigate();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get(API.PROMOS.AVAILABLE);
      setPromos(data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Rewards could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function claim(promo) {
    if (claiming || promo.claimStatus === "REDEEMED") return;
    if (promo.claimStatus === "CLAIMED" && promo.rewardType === "DISCOUNT") {
      navigate(`/wallet?offer=${encodeURIComponent(promo.code)}`);
      return;
    }
    setClaiming(promo.code);
    try {
      const { data } = await axiosInstance.post(API.PROMOS.CLAIM(promo.code));
      setPromos((current) => current.map((item) => item.id === data.promo.id ? data.promo : item));
      toast.success(data.message);
      if (data.rewardGranted) localStorage.removeItem("cf_models_cache_v1");
      if (!data.rewardGranted) navigate(`/wallet?offer=${encodeURIComponent(promo.code)}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Reward could not be claimed");
    } finally {
      setClaiming("");
    }
  }

  return <div className="mx-auto w-full max-w-5xl space-y-5 pb-10 text-white">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-fuchsia-400/10 text-fuchsia-300"><Gift size={19} /></span>
        <div><h1 className="text-xl font-bold">Rewards and promo codes</h1><p className="text-xs text-slate-400">Claim here first. Checkout opens only when you choose to use a discount.</p></div>
      </div>
      <button onClick={load} title="Refresh rewards" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"><RefreshCw size={15} /></button>
    </header>

    {loading ? <div className="grid min-h-56 place-items-center text-slate-400"><Loader2 className="animate-spin" /></div> : promos.length === 0 ? (
      <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-white/10 text-center text-slate-500"><div><Sparkles className="mx-auto mb-3" /><p className="text-sm">No rewards are available for this account right now.</p></div></div>
    ) : <section className="grid gap-3 md:grid-cols-2">
      {promos.map((promo) => {
        const claimed = promo.claimStatus === "CLAIMED";
        const used = promo.claimStatus === "REDEEMED";
        return <article key={promo.id} className="relative overflow-hidden rounded-lg border border-white/10 bg-[#0d1420] p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><TicketCheck size={17} /></span>
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${used ? "bg-slate-400/10 text-slate-400" : claimed ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{used ? "Used" : claimed ? "Claimed" : "Available"}</span>
          </div>
          <button onClick={() => navigator.clipboard?.writeText(promo.code)} className="mb-2 font-mono text-lg font-black tracking-wider text-white" title="Copy promo code">{promo.code}</button>
          <h2 className="text-sm font-bold text-slate-100">{promo.title}</h2>
          <p className="mt-1 text-sm text-cyan-200">{rewardLabel(promo)}</p>
          <p className="mt-3 text-xs text-slate-500">{audienceLabel(promo.audience)}{promo.expiresAt ? ` · Ends ${new Date(promo.expiresAt).toLocaleDateString("en-IN")}` : ""}</p>
          <button disabled={used || claiming === promo.code} onClick={() => claim(promo)} className="mt-5 inline-flex h-9 items-center gap-2 rounded-lg bg-cyan-400 px-3 text-xs font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-45">
            {claiming === promo.code ? <Loader2 size={14} className="animate-spin" /> : claimed ? <Check size={14} /> : <Gift size={14} />}
            {used ? "Already used" : claimed && promo.rewardType === "DISCOUNT" ? "Use at checkout" : claimed ? "Claimed" : "Claim reward"}
          </button>
        </article>;
      })}
    </section>}
  </div>;
}
