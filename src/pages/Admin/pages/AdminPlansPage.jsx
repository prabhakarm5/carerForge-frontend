import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { deleteAdminPlan, getAdminPlans } from "../../../services/adminService";
import { PlansPanel } from "../components/CommercePanels";
import EditorModal from "../components/EditorModal";
import { requestError } from "../components/AdminUi";

export default function AdminPlansPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    try { setPlans(await getAdminPlans()); }
    catch (error) { toast.error(requestError(error, "Could not load plans")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function remove(plan) {
    if (!window.confirm(`Delete plan ${plan.name}?`)) return;
    try { await deleteAdminPlan(plan.id); toast.success("Plan deleted"); await load(); }
    catch (error) { toast.error(requestError(error, "Could not delete plan")); }
  }

  return <>
    <PlansPanel plans={plans} loading={loading} onEdit={(item) => setEditor({ type: "plan", item })} onDelete={remove} />
    {editor && <EditorModal editor={editor} plans={plans} onClose={() => setEditor(null)} onSaved={load} />}
  </>;
}
