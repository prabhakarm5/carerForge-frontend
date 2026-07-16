import { useCallback, useEffect, useState } from "react";
import { Filter, RefreshCw, Search } from "lucide-react";
import toast from "react-hot-toast";
import { getAdminRequestLogs } from "../../../services/adminService";
import { LoadingState, RequestTable, requestError } from "../components/AdminUi";

export default function AdminRequestsPage() {
  const [filters, setFilters] = useState({ user: "", path: "", status: "" });
  const [query, setQuery] = useState(filters);
  const [page, setPage] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(0);
      setQuery(filters);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [filters]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await getAdminRequestLogs({ page, size: 25, ...query })); }
    catch (error) { toast.error(requestError(error, "Could not load request history")); }
    finally { setLoading(false); }
  }, [page, query]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-xl font-bold">Request history</h1><p className="text-xs text-slate-500">Retained, sanitized API outcomes with full administrator-only IP visibility.</p></div>
      <button onClick={load} className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white" title="Refresh"><RefreshCw size={16} /></button>
    </div>

    <section className="grid gap-2 rounded-md border border-white/10 bg-[#0d1420] p-3 md:grid-cols-[1fr_1fr_160px]">
      <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-black/15 px-3 text-slate-500"><Search size={15} /><input value={filters.user} onChange={(event) => setFilters((current) => ({ ...current, user: event.target.value }))} placeholder="User name or email" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" /></label>
      <label className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-black/15 px-3 text-slate-500"><Filter size={15} /><input value={filters.path} onChange={(event) => setFilters((current) => ({ ...current, path: event.target.value }))} placeholder="Endpoint contains..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" /></label>
      <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="h-10 rounded-md border border-white/10 bg-[#0b1220] px-3 text-sm text-slate-300 outline-none">
        <option value="">All statuses</option>
        {[200,201,204,400,401,403,404,409,429,500,502,503].map((status) => <option key={status}>{status}</option>)}
      </select>
    </section>

    <section className="admin-panel admin-table-panel">
      <header><div><h3>Captured requests</h3><p>Response bodies are not stored, preventing secrets and personal data from leaking into monitoring.</p></div><span>{data?.totalElements || 0} events</span></header>
      {loading && !data ? <LoadingState label="Loading request history" /> : <RequestTable requests={data?.content || []} detailed />}
      <footer className="admin-pagination">
        <button disabled={page === 0 || loading} onClick={() => setPage((value) => Math.max(0, value - 1))}>Previous</button>
        <span>Page {page + 1} of {Math.max(1, data?.totalPages || 1)}</span>
        <button disabled={loading || page + 1 >= (data?.totalPages || 0)} onClick={() => setPage((value) => value + 1)}>Next</button>
      </footer>
    </section>
  </div>;
}
