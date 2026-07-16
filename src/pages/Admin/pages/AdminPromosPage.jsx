import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { deleteAdminPromo, getAdminPlans, getAdminPromos } from "../../../services/adminService";
import { PromosPanel } from "../components/CommercePanels";
import EditorModal from "../components/EditorModal";
import { requestError } from "../components/AdminUi";

export default function AdminPromosPage() {
  const [promos, setPromos] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [promoData, planData] = await Promise.all([getAdminPromos(), getAdminPlans()]);
      setPromos(promoData);
      setPlans(planData);
    } catch (error) {
      toast.error(requestError(error, "Could not load promo campaigns"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function remove(promo) {
    if (!window.confirm(`Delete promo ${promo.code}?`)) return;
    try { await deleteAdminPromo(promo.id); toast.success("Promo deleted"); await load(); }
    catch (error) { toast.error(requestError(error, "Could not delete promo")); }
  }

  return <>
    <PromosPanel promos={promos} loading={loading} onEdit={(item) => setEditor({ type: "promo", item })} onDelete={remove} />
    {editor && <EditorModal editor={editor} plans={plans} onClose={() => setEditor(null)} onSaved={load} />}
  </>;
}
