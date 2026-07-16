import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getAdminOverview } from "../../../services/adminService";
import { LoadingState, requestError } from "../components/AdminUi";
import { OverviewPanel } from "../components/MonitoringPanels";

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      setOverview(await getAdminOverview());
      setError("");
    } catch (request) {
      setError(requestError(request, "Monitoring data is temporarily unavailable"));
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(load, 0);
    const polling = window.setInterval(() => load(true), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(polling);
    };
  }, [load]);

  if (loading && !overview) return <LoadingState label="Loading operations data" />;
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div><h1 className="text-xl font-bold">Operations overview</h1><p className="text-xs text-slate-500">Health and traffic refresh every 30 seconds.</p></div>
      <button onClick={() => load()} className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white" title="Refresh"><RefreshCw size={16} /></button>
    </div>
    {error && <div className="rounded-md border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-200">{error}</div>}
    {overview && <OverviewPanel overview={overview} />}
  </div>;
}
