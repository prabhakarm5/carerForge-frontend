import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AppWindow, CreditCard, LayoutDashboard, LogOut, RefreshCw, Tag, Users } from "lucide-react";
import toast from "react-hot-toast";
import BrandLogo from "../../shared/BrandLogo";
import useAuthStore from "../../store/authStore";
import {
  deleteAdminPlan, deleteAdminPromo, deleteAdminUser, getAdminOverview, getAdminPlans,
  getAdminPromos, getAdminUserActivity, getAdminUsers, updateAdminUser,
} from "../../services/adminService";
import { LoadingState, requestError } from "./components/AdminUi";
import { OverviewPanel, TrafficPanel } from "./components/MonitoringPanels";
import UsersPanel from "./components/UsersPanel";
import UserDrawer from "./components/UserDrawer";
import { PlansPanel, PromosPanel } from "./components/CommercePanels";
import EditorModal from "./components/EditorModal";
import "./admin.css";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "traffic", label: "Traffic", icon: Activity },
  { id: "users", label: "Users", icon: Users },
  { id: "plans", label: "Plans", icon: CreditCard },
  { id: "promos", label: "Promos", icon: Tag },
];

export default function AdminDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const logoutEverywhere = useAuthStore((state) => state.logoutEverywhere);
  const [activeTab, setActiveTab] = useState("overview");
  const [overview, setOverview] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [usersPage, setUsersPage] = useState(null);
  const [usersLoading, setUsersLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [promos, setPromos] = useState([]);
  const [promosLoading, setPromosLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activity, setActivity] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [editor, setEditor] = useState(null);

  const loadOverview = useCallback(async (quiet = false) => {
    if (!quiet) setOverviewLoading(true);
    try { setOverview(await getAdminOverview()); setError(""); }
    catch (request) { setError(requestError(request, "Monitoring data is temporarily unavailable")); }
    finally { if (!quiet) setOverviewLoading(false); }
  }, []);

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    try { setUsersPage(await getAdminUsers(page, 20, query)); }
    catch (request) { toast.error(requestError(request, "Could not load users")); }
    finally { setUsersLoading(false); }
  }, [page, query]);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    try { setPlans(await getAdminPlans()); }
    catch (request) { toast.error(requestError(request, "Could not load plans")); }
    finally { setPlansLoading(false); }
  }, []);

  const loadPromos = useCallback(async () => {
    setPromosLoading(true);
    try { setPromos(await getAdminPromos()); }
    catch (request) { toast.error(requestError(request, "Could not load promos")); }
    finally { setPromosLoading(false); }
  }, []);

  const loadActivity = useCallback(async (id) => {
    setDrawerLoading(true);
    try { setActivity(await getAdminUserActivity(id)); }
    catch (request) { toast.error(requestError(request, "Could not load user activity")); }
    finally { setDrawerLoading(false); }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(0); setQuery(queryInput.trim()); }, 300);
    return () => clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    if (!["overview", "traffic"].includes(activeTab)) return undefined;
    const initial = window.setTimeout(() => loadOverview(), 0);
    const polling = window.setInterval(() => loadOverview(true), 30000);
    return () => { window.clearTimeout(initial); window.clearInterval(polling); };
  }, [activeTab, loadOverview]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (activeTab === "users") loadUsers();
      if (activeTab === "plans") loadPlans();
      if (activeTab === "promos") loadPromos();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [activeTab, loadUsers, loadPlans, loadPromos]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selectedUserId) loadActivity(selectedUserId);
      else setActivity(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedUserId, loadActivity]);

  const activeMeta = useMemo(() => TABS.find((tab) => tab.id === activeTab), [activeTab]);

  const actOnUser = async (account, action) => {
    if (action === "delete" && !window.confirm(`Delete ${account.email}? This cannot be undone.`)) return;
    setActionId(account.id + action);
    try {
      if (action === "delete") await deleteAdminUser(account.id);
      else await updateAdminUser(account.id, action);
      toast.success(`User ${action} completed`);
      await Promise.all([loadUsers(), loadOverview(true)]);
      if (action === "delete") setSelectedUserId(null);
      else if (selectedUserId === account.id) await loadActivity(account.id);
    } catch (request) { toast.error(requestError(request, "Admin action failed")); }
    finally { setActionId(null); }
  };

  const removePlan = async (plan) => {
    if (!window.confirm(`Delete plan ${plan.name}?`)) return;
    try { await deleteAdminPlan(plan.id); toast.success("Plan deleted"); await loadPlans(); }
    catch (request) { toast.error(requestError(request, "Could not delete plan")); }
  };

  const removePromo = async (promo) => {
    if (!window.confirm(`Delete promo ${promo.code}?`)) return;
    try { await deleteAdminPromo(promo.id); toast.success("Promo deleted"); await loadPromos(); }
    catch (request) { toast.error(requestError(request, "Could not delete promo")); }
  };

  const refreshCurrent = () => {
    if (activeTab === "users") return loadUsers();
    if (activeTab === "plans") return loadPlans();
    if (activeTab === "promos") return loadPromos();
    return loadOverview();
  };

  const signOut = async () => { await logoutEverywhere(); window.location.assign("/admin/login"); };

  return <div className="admin-shell admin-console">
    <aside className="admin-sidebar"><BrandLogo size="sm" /><nav aria-label="Admin navigation">{TABS.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)} title={label}><Icon size={17} /><span>{label}</span></button>)}</nav><div className="admin-sidebar-user"><span>{user?.name?.slice(0, 1)?.toUpperCase() || "A"}</span><div><strong>{user?.name || "Administrator"}</strong><small>{user?.email}</small></div></div></aside>
    <div className="admin-workspace"><header className="admin-topbar"><div><span className="admin-live-dot" /><div><h1>{activeMeta?.label}</h1><p>Secure operations console - live data updates every 30 seconds</p></div></div><div className="admin-topbar-actions"><button title="Open user app" onClick={() => window.location.assign("/dashboard")}><AppWindow size={17} /></button><button title="Refresh current section" onClick={refreshCurrent}><RefreshCw size={17} /></button><button title="Sign out everywhere" onClick={signOut}><LogOut size={17} /></button></div></header>
      <nav className="admin-mobile-tabs">{TABS.map(({ id, label, icon: Icon }) => <button key={id} className={activeTab === id ? "active" : ""} onClick={() => setActiveTab(id)}><Icon size={16} /><span>{label}</span></button>)}</nav>
      <main className="admin-main">{error && <div className="admin-error-banner"><span>{error}</span><button onClick={loadOverview}>Retry</button></div>}
        {["overview", "traffic"].includes(activeTab) && overviewLoading && !overview ? <LoadingState label="Loading operations data" /> : <>
          {activeTab === "overview" && overview && <OverviewPanel overview={overview} />}
          {activeTab === "traffic" && overview && <TrafficPanel overview={overview} />}
          {activeTab === "users" && <UsersPanel pageData={usersPage} loading={usersLoading} query={queryInput} setQuery={setQueryInput} page={page} setPage={setPage} onSelect={(account) => setSelectedUserId(account.id)} onAction={actOnUser} actionId={actionId} />}
          {activeTab === "plans" && <PlansPanel plans={plans} loading={plansLoading} onEdit={(item) => setEditor({ type: "plan", item })} onDelete={removePlan} />}
          {activeTab === "promos" && <PromosPanel promos={promos} loading={promosLoading} onEdit={(item) => setEditor({ type: "promo", item })} onDelete={removePromo} />}
        </>}
      </main>
    </div>
    {selectedUserId && <UserDrawer activity={activity} loading={drawerLoading} onClose={() => setSelectedUserId(null)} onAction={actOnUser} onRefresh={() => loadActivity(selectedUserId)} />}
    {editor && <EditorModal editor={editor} plans={plans} onClose={() => setEditor(null)} onSaved={editor.type === "plan" ? loadPlans : loadPromos} />}
  </div>;
}