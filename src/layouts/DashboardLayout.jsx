import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";
import { getWallet } from "../services/walletService";
import { handleApiError } from "../utils/errorHandler";
import RechargeModal, { preloadRechargePlans } from "../components/common/recharge/RechargeModal";
import { RECHARGE_REQUIRED_EVENT } from "../utils/rechargeEvents";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);       // mobile drawer
  const [sidebarExpanded, setSidebarExpanded] = useState(true); // desktop expanded/collapsed
  const [wallet, setWallet] = useState(null);
  const [globalRecharge, setGlobalRecharge] = useState({ open: false, reason: "tokens" });
  const location = useLocation();

  const refreshWallet = useCallback(() => getWallet().then(setWallet).catch(() => {}), []);

  useEffect(() => {
    document.documentElement.classList.add("cf-dashboard-shell-active");
    document.body.classList.add("cf-dashboard-shell-active");
    return () => {
      document.documentElement.classList.remove("cf-dashboard-shell-active");
      document.body.classList.remove("cf-dashboard-shell-active");
    };
  }, []);

  useEffect(() => {
    getWallet()
      .then(setWallet)
      .catch((err) => handleApiError(err));
  }, []);

  useEffect(() => {
    const warmPlans = () => preloadRechargePlans();
    const idleId = "requestIdleCallback" in window
      ? window.requestIdleCallback(warmPlans, { timeout: 2500 })
      : window.setTimeout(warmPlans, 1200);
    let frame = 0;

    const handleRechargeRequired = (event) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        // Feature-local modals use this component too. During migration,
        // keep only one portal visible for a credit error.
        if (document.querySelector(".recharge-overlay")) return;
        setGlobalRecharge({ open: true, reason: event.detail?.reason || "tokens" });
      });
    };

    window.addEventListener(RECHARGE_REQUIRED_EVENT, handleRechargeRequired);
    return () => {
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      window.cancelAnimationFrame(frame);
      window.removeEventListener(RECHARGE_REQUIRED_EVENT, handleRechargeRequired);
    };
  }, []);

  // Sidebar widths — Sidebar.jsx ke andar bhi yahi values hain (w-[260px] / w-[60px])
  const EXPANDED_W  = 260;
  const COLLAPSED_W = 60;
  const contentMarginLeft = sidebarExpanded ? EXPANDED_W : COLLAPSED_W;

  // Chat page full-page honi chahiye — extra padding/scroll nahi
  const isChatPage = location.pathname.startsWith("/chat");
  const isFocusedWorkspace = isChatPage || location.pathname.startsWith("/resume") || location.pathname.startsWith("/cover-letter") || location.pathname.startsWith("/interview");

  return (
    <div className="dashboard-shell overflow-hidden bg-[#050810]" style={{ height: "var(--app-height, 100dvh)" }}>
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onExpandedChange={setSidebarExpanded}
        wallet={wallet}
        refreshWallet={refreshWallet}
      />

      {/* margin-left sidebar ki current width ke barabar — collapse/expand par turant sync hota hai.
          Mobile (lg se neeche) par margin 0 — sidebar wahan drawer/overlay mode me hai. */}
      <style>{`
        @media (min-width: 1024px) {
          .dashboard-content-area { margin-left: ${contentMarginLeft}px !important; --dashboard-topbar-left: ${contentMarginLeft}px; }
        }
      `}</style>

      <div
        className="dashboard-content-area flex flex-col overflow-hidden transition-[margin] duration-200"
        style={{ height: "100%", paddingTop: 40, "--sidebar-width": `${contentMarginLeft}px` }}
      >
        <Topbar
          setSidebarOpen={setSidebarOpen}
          wallet={wallet}
          onRefreshWallet={refreshWallet}
        />

        {isFocusedWorkspace ? (
          // Chat: full remaining height, no padding, no extra scroll container
          <main className="flex-1 min-h-0 flex flex-col">
            <Outlet context={{ wallet, setWallet, refreshWallet }} />
          </main>
        ) : (
          <main className="flex-1 overflow-auto p-3 sm:p-6">
            <Outlet context={{ wallet, setWallet, refreshWallet }} />
          </main>
        )}
      </div>

      <RechargeModal
        open={globalRecharge.open}
        reason={globalRecharge.reason}
        currentPlanId={wallet?.currentPlanId}
        onClose={() => setGlobalRecharge((current) => ({ ...current, open: false }))}
        onActivated={refreshWallet}
      />
    </div>
  );
}

export default DashboardLayout;