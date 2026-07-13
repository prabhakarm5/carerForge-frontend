import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/dashboard/Sidebar";
import Topbar from "../components/dashboard/Topbar";
import { getWallet } from "../services/walletService";
import { handleApiError } from "../utils/errorHandler";

function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);       // mobile drawer
  const [sidebarExpanded, setSidebarExpanded] = useState(true); // desktop expanded/collapsed
  const [wallet, setWallet] = useState(null);
  const location = useLocation();

  useEffect(() => {
    getWallet()
      .then(setWallet)
      .catch((err) => handleApiError(err));
  }, []);

  // Sidebar widths — Sidebar.jsx ke andar bhi yahi values hain (w-[260px] / w-[60px])
  const EXPANDED_W  = 260;
  const COLLAPSED_W = 60;
  const contentMarginLeft = sidebarExpanded ? EXPANDED_W : COLLAPSED_W;

  // Chat page full-page honi chahiye — extra padding/scroll nahi
  const isChatPage = location.pathname.startsWith("/chat");
  const isFocusedWorkspace = isChatPage || location.pathname.startsWith("/resume");

  return (
    <div className="overflow-hidden bg-[#050810]" style={{ height: "var(--app-height, 100dvh)" }}>
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onExpandedChange={setSidebarExpanded}
        wallet={wallet}
        refreshWallet={() => getWallet().then(setWallet).catch(() => {})}
      />

      {/* margin-left sidebar ki current width ke barabar — collapse/expand par turant sync hota hai.
          Mobile (lg se neeche) par margin 0 — sidebar wahan drawer/overlay mode me hai. */}
      <style>{`
        @media (min-width: 1024px) {
          .dashboard-content-area { margin-left: ${contentMarginLeft}px !important; }
        }
      `}</style>

      <div
        className="dashboard-content-area flex flex-col overflow-hidden transition-[margin] duration-200"
        style={{ height: "var(--app-height, 100dvh)" }}
      >
        <Topbar
          setSidebarOpen={setSidebarOpen}
          wallet={wallet}
          refreshWallet={() => getWallet().then(setWallet).catch(() => {})}
        />

        {isFocusedWorkspace ? (
          // Chat: full remaining height, no padding, no extra scroll container
          <main className="flex-1 min-h-0 flex flex-col">
            <Outlet context={{ wallet, setWallet }} />
          </main>
        ) : (
          <main className="flex-1 overflow-auto p-3 sm:p-6">
            <Outlet context={{ wallet, setWallet }} />
          </main>
        )}
      </div>
    </div>
  );
}

export default DashboardLayout;