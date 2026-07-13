import { Copy, CreditCard, Gift, Pencil, Plus, Tag, Trash2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import { EmptyState, formatDateTime, formatNumber, LoadingState, SectionHeader } from "./AdminUi";

export function PlansPanel({ plans, loading, onEdit, onDelete }) {
  return <div className="admin-section-stack">
    <SectionHeader title="Subscription plans" description="Create, update or retire plans visible in recharge and pricing surfaces." action={<button className="admin-primary-btn" onClick={() => onEdit(null)}><Plus size={16} />New plan</button>} />
    {loading ? <LoadingState label="Loading plans" /> : <section className="admin-commerce-grid">
      {plans.map((plan) => <article className="admin-commerce-card" key={plan.id}><div className="admin-commerce-icon"><Zap size={18} /></div><span className={`admin-state-pill ${plan.active === false ? "inactive" : "active"}`}>{plan.active === false ? "Inactive" : "Live"}</span><h3>{plan.name}</h3><strong>₹{formatNumber(plan.price)}</strong><p>{formatNumber(plan.tokens)} AI tokens</p><small>{plan.description || "No description"}</small><footer><button title="Edit plan" onClick={() => onEdit(plan)}><Pencil size={15} /></button><button className="danger" title="Delete plan" onClick={() => onDelete(plan)}><Trash2 size={15} /></button></footer></article>)}
      {!plans.length && <EmptyState icon={CreditCard} label="No plans configured" />}
    </section>}
  </div>;
}

export function PromosPanel({ promos, loading, onEdit, onDelete }) {
  const copy = (code) => navigator.clipboard.writeText(code).then(() => toast.success("Code copied"));
  return <div className="admin-section-stack">
    <SectionHeader title="Promo campaigns" description="Publish time-bound offers shown to signed-in users in recharge." action={<button className="admin-primary-btn" onClick={() => onEdit(null)}><Plus size={16} />New promo</button>} />
    {loading ? <LoadingState label="Loading promos" /> : <section className="admin-commerce-grid">
      {promos.map((promo) => <article className="admin-commerce-card admin-promo-card" key={promo.id}><div className="admin-commerce-icon"><Gift size={18} /></div><span className={`admin-state-pill ${promo.currentlyAvailable ? "active" : "inactive"}`}>{promo.currentlyAvailable ? "Live" : promo.active ? "Scheduled" : "Disabled"}</span><button className="admin-code" onClick={() => copy(promo.code)} title="Copy promo code"><span>{promo.code}</span><Copy size={13} /></button><h3>{promo.title}</h3><p>{promo.rewardType === "FREE_PLAN" ? "Free plan reward" : promo.rewardType === "BONUS_TOKENS" ? `${formatNumber(promo.bonusTokens)} free tokens` : `${promo.discountPercent}% discount${promo.bonusTokens ? ` + ${formatNumber(promo.bonusTokens)} tokens` : ""}`}</p><small>{String(promo.audience || "ALL_USERS").replaceAll("_", " ")} - {formatNumber(promo.totalClaims)} claimed{promo.maxTotalClaims ? ` / ${formatNumber(promo.maxTotalClaims)}` : ""}</small><small>{promo.expiresAt ? `Ends ${formatDateTime(promo.expiresAt)}` : "No expiry"}</small><footer><button title="Edit promo" onClick={() => onEdit(promo)}><Pencil size={15} /></button><button className="danger" title="Delete promo" onClick={() => onDelete(promo)}><Trash2 size={15} /></button></footer></article>)}
      {!promos.length && <EmptyState icon={Tag} label="No promo campaigns" />}
    </section>}
  </div>;
}