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

  return (
    <div className="min-h-screen bg-[#020617]">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onExpandedChange={setSidebarExpanded}
      />

      {/* margin-left sidebar ki current width ke barabar — collapse/expand par turant sync hota hai.
          Mobile (lg se neeche) par margin 0 — sidebar wahan drawer/overlay mode me hai. */}
      <style>{`
        @media (min-width: 1024px) {
          .dashboard-content-area { margin-left: ${contentMarginLeft}px !important; }
        }
      `}</style>

      <div
        className="dashboard-content-area min-h-screen flex flex-col transition-all duration-300"
      >
        <Topbar
          setSidebarOpen={setSidebarOpen}
          wallet={wallet}
          refreshWallet={() => getWallet().then(setWallet).catch(() => {})}
        />

        {isChatPage ? (
          // Chat: full remaining height, no padding, no extra scroll container
          <main className="flex-1 min-h-0 flex flex-col">
            <Outlet context={{ wallet, setWallet }} />
          </main>
        ) : (
          <main className="flex-1 p-6 overflow-auto">
            <Outlet context={{ wallet, setWallet }} />
          </main>
        )}
      </div>
    </div>
  );
}

export default DashboardLayout;