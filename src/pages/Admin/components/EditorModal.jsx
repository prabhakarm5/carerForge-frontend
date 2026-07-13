import { Check, Loader2, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { saveAdminPlan, saveAdminPromo } from "../../../services/adminService";
import { requestError } from "./AdminUi";

const EMPTY_PLAN = { name: "", price: 0, tokens: 0, description: "" };
const EMPTY_PROMO = {
  code: "", title: "", description: "", discountPercent: 10, bonusTokens: 0,
  rewardType: "DISCOUNT", audience: "ALL_USERS", rewardPlanId: "", maxTotalClaims: 0,
  targetUserEmails: "", active: true, validFrom: "", expiresAt: "",
};

export default function EditorModal({ editor, plans = [], onClose, onSaved }) {
  const isPlan = editor.type === "plan";
  const [form, setForm] = useState(() => isPlan ? { ...EMPTY_PLAN, ...editor.item } : {
    ...EMPTY_PROMO, ...editor.item,
    targetUserEmails: (editor.item?.targetUserEmails || []).join(", "),
    validFrom: editor.item?.validFrom?.slice(0, 16) || "",
    expiresAt: editor.item?.expiresAt?.slice(0, 16) || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = async (event) => {
    event.preventDefault(); setSaving(true);
    try {
      const payload = isPlan ? {
        name: form.name.trim(), price: Number(form.price), tokens: Number(form.tokens), description: form.description?.trim() || "",
      } : {
        code: form.code.trim(), title: form.title.trim(), description: form.description?.trim() || "",
        rewardType: form.rewardType, audience: form.audience,
        discountPercent: form.rewardType === "DISCOUNT" ? Number(form.discountPercent) : 0,
        bonusTokens: form.rewardType === "FREE_PLAN" ? 0 : Number(form.bonusTokens),
        rewardPlanId: form.rewardType === "FREE_PLAN" ? form.rewardPlanId : null,
        maxTotalClaims: Number(form.maxTotalClaims || 0),
        targetUserEmails: form.audience === "SPECIFIC_USERS"
          ? form.targetUserEmails.split(/[\s,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean)
          : [],
        active: Boolean(form.active), validFrom: form.validFrom || null, expiresAt: form.expiresAt || null,
      };
      if (isPlan) await saveAdminPlan(editor.item?.id, payload);
      else await saveAdminPromo(editor.item?.id, payload);
      toast.success(`${isPlan ? "Plan" : "Promo"} saved`);
      await onSaved(); onClose();
    } catch (error) { toast.error(requestError(error, "Could not save changes")); }
    finally { setSaving(false); }
  };

  return <div className="admin-modal-layer"><button className="admin-modal-backdrop" onClick={onClose} aria-label="Close editor" />
    <form className="admin-editor" onSubmit={submit}><header><div><h2>{editor.item ? "Edit" : "Create"} {isPlan ? "plan" : "reward campaign"}</h2><p>Eligibility and rewards are always verified by the backend.</p></div><button type="button" onClick={onClose} title="Close"><X size={18} /></button></header>
      <div className="admin-editor-body">{isPlan ? <PlanFields form={form} set={set} /> : <PromoFields form={form} set={set} plans={plans} />}</div>
      <footer><button type="button" className="admin-secondary-btn" onClick={onClose}>Cancel</button><button className="admin-primary-btn" disabled={saving}>{saving ? <Loader2 className="admin-spin" size={15} /> : <Check size={15} />}Save</button></footer>
    </form>
  </div>;
}

function PlanFields({ form, set }) {
  return <><label><span>Plan name</span><input required maxLength={80} value={form.name} onChange={(e) => set("name", e.target.value)} /></label><div className="admin-form-grid"><label><span>Price (INR)</span><input required min="0" type="number" value={form.price} onChange={(e) => set("price", e.target.value)} /></label><label><span>Tokens</span><input required min="0" type="number" value={form.tokens} onChange={(e) => set("tokens", e.target.value)} /></label></div><label><span>Description</span><textarea maxLength={500} rows="4" value={form.description || ""} onChange={(e) => set("description", e.target.value)} /></label></>;
}

function PromoFields({ form, set, plans }) {
  return <>
    <div className="admin-form-grid"><label><span>Promo code</span><input required maxLength={32} value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} /></label><label><span>Campaign title</span><input required maxLength={80} value={form.title} onChange={(e) => set("title", e.target.value)} /></label></div>
    <label><span>Description shown to users</span><textarea maxLength={300} rows="3" value={form.description || ""} onChange={(e) => set("description", e.target.value)} /></label>
    <div className="admin-form-grid"><label><span>Reward type</span><select value={form.rewardType} onChange={(e) => set("rewardType", e.target.value)}><option value="DISCOUNT">Checkout discount</option><option value="BONUS_TOKENS">Free token reward</option><option value="FREE_PLAN">Free plan reward</option></select></label><label><span>Who can claim</span><select value={form.audience} onChange={(e) => set("audience", e.target.value)}><option value="ALL_USERS">All users</option><option value="NEVER_RECHARGED">Never recharged</option><option value="SPECIFIC_USERS">Specific users</option></select></label></div>
    {form.rewardType === "DISCOUNT" && <div className="admin-form-grid"><label><span>Discount %</span><input required min="1" max="90" type="number" value={form.discountPercent} onChange={(e) => set("discountPercent", e.target.value)} /></label><label><span>Bonus tokens after payment</span><input min="0" type="number" value={form.bonusTokens} onChange={(e) => set("bonusTokens", e.target.value)} /></label></div>}
    {form.rewardType === "BONUS_TOKENS" && <label><span>Free tokens</span><input required min="1" type="number" value={form.bonusTokens} onChange={(e) => set("bonusTokens", e.target.value)} /></label>}
    {form.rewardType === "FREE_PLAN" && <label><span>Plan granted immediately</span><select required value={form.rewardPlanId || ""} onChange={(e) => set("rewardPlanId", e.target.value)}><option value="">Select a plan</option>{plans.filter((plan) => plan.active !== false).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} - {Number(plan.tokens || 0).toLocaleString()} tokens</option>)}</select></label>}
    {form.audience === "SPECIFIC_USERS" && <label><span>Target user emails</span><textarea required rows="3" placeholder="user@example.com, another@example.com" value={form.targetUserEmails} onChange={(e) => set("targetUserEmails", e.target.value)} /><small>Separate emails with commas, spaces, or new lines.</small></label>}
    <label><span>Maximum total claims</span><input min="0" type="number" value={form.maxTotalClaims} onChange={(e) => set("maxTotalClaims", e.target.value)} /><small>Use 0 for no campaign-wide limit. Each user can claim once.</small></label>
    <div className="admin-form-grid"><label><span>Starts</span><input type="datetime-local" value={form.validFrom} onChange={(e) => set("validFrom", e.target.value)} /></label><label><span>Expires</span><input type="datetime-local" value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} /></label></div>
    <label className="admin-toggle"><input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} /><span><Check size={13} /></span>Campaign enabled</label>
  </>;
}