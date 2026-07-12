import WelcomeBanner from "../../components/dashboard/WelcomeBanner";
import WalletCards from "../../components/dashboard/WalletCards";
import StatsCards from "../../components/dashboard/StatsCards";
import QuickActions from "../../components/dashboard/QuickActions";
import RecentConversations from "../../components/dashboard/RecentConversations";
import TokenChart from "../../components/dashboard/TokenChart";

function DashboardPage() {
  return (
    <div className="w-full min-w-0 space-y-4 overflow-x-hidden sm:space-y-6 lg:space-y-8">
      <WelcomeBanner />
      <WalletCards />
      <StatsCards />

      <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <RecentConversations />
        </div>
        <div className="min-w-0">
          <TokenChart />
        </div>
      </div>

      <QuickActions />
    </div>
  );
}

export default DashboardPage;