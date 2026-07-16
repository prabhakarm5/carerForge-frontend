import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AppWindow,
  CreditCard,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ServerCog,
  Tag,
  Users,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import BrandLogo from "../../shared/BrandLogo";
import useAuthStore from "../../store/authStore";
import "./admin.css";

const NAVIGATION = [
  { to: "/admin/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/requests", label: "Requests", icon: Activity },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/promos", label: "Promos", icon: Tag },
  { to: "/admin/plans", label: "Plans", icon: CreditCard },
  { to: "/admin/support", label: "Support", icon: LifeBuoy },
  { to: "/admin/system", label: "System", icon: ServerCog },
];

const COLLAPSED_KEY = "cf_admin_sidebar_collapsed";

export default function AdminLayout() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logoutEverywhere = useAuthStore((state) => state.logoutEverywhere);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeLabel = useMemo(
    () => NAVIGATION.find((item) => location.pathname.startsWith(item.to))?.label || "Admin",
    [location.pathname],
  );

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  }, [collapsed]);


  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);

  async function signOut() {
    await logoutEverywhere();
    window.location.assign("/admin/login");
  }

  const showLabels = !collapsed || mobileOpen;

  return (
    <div className="flex min-h-dvh bg-[#070b12] text-slate-100">
      {mobileOpen && <button type="button" aria-label="Close admin navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm lg:hidden" />}

      <aside className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-[80] flex w-[min(86vw,280px)] flex-col border-r border-white/10 bg-[#090f1a] shadow-2xl shadow-black/50 transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0 lg:shadow-none ${collapsed ? "lg:w-[76px]" : "lg:w-[248px]"}`}>
        <div className={`flex h-16 shrink-0 items-center border-b border-white/10 ${showLabels ? "justify-between px-4" : "justify-center px-2"}`}>
          {showLabels && <BrandLogo size="sm" />}
          <button type="button" onClick={() => mobileOpen ? setMobileOpen(false) : setCollapsed((value) => !value)} className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.035] text-slate-400 transition hover:bg-white/[0.07] hover:text-white" title={mobileOpen ? "Close navigation" : collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {mobileOpen ? <X size={16} /> : collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3" aria-label="Admin navigation">
          {NAVIGATION.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setMobileOpen(false)} title={!showLabels ? label : undefined} className={({ isActive }) => `flex h-10 items-center rounded-md text-sm font-semibold transition ${showLabels ? "gap-3 px-3" : "justify-center px-0"} ${isActive ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-200" : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-white"}`}>
              <Icon size={17} className="shrink-0" />
              {showLabels && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          {showLabels && <div className="mb-3 min-w-0 px-1"><strong className="block truncate text-xs text-white">{user?.name || "Administrator"}</strong><span className="mt-0.5 block truncate text-[10px] text-slate-500">{user?.email}</span></div>}
          <div className={showLabels ? "grid grid-cols-2 gap-2" : "grid gap-2"}>
            <button type="button" onClick={() => window.location.assign("/dashboard")} className="grid h-9 place-items-center rounded-md border border-white/10 text-slate-400 hover:bg-white/5 hover:text-white" title="Open user app"><AppWindow size={16} /></button>
            <button type="button" onClick={signOut} className="grid h-9 place-items-center rounded-md border border-rose-400/15 text-rose-300 hover:bg-rose-400/10" title="Sign out everywhere"><LogOut size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#070b12]/95 px-3 backdrop-blur lg:hidden">
          <button type="button" onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-slate-300" title="Open navigation"><Menu size={17} /></button>
          <strong className="text-sm text-white">{activeLabel}</strong>
          <button type="button" onClick={() => window.location.assign("/dashboard")} className="grid h-9 w-9 place-items-center rounded-md border border-white/10 text-slate-400" title="Open user app"><AppWindow size={16} /></button>
        </header>
        <main className="mx-auto w-full max-w-[1600px] p-3 sm:p-5 lg:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}