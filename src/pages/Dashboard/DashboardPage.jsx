import WelcomeBanner from "../../components/dashboard/WelcomeBanner";
import WalletCards from "../../components/dashboard/WalletCards";
import StatsCards from "../../components/dashboard/StatsCards";
import QuickActions from "../../components/dashboard/QuickActions";
import RecentConversations from "../../components/dashboard/RecentConversations";
import TokenChart from "../../components/dashboard/TokenChart";

function DashboardPage() {
  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8">
      <WelcomeBanner />
      <WalletCards />
      <StatsCards />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div className="xl:col-span-2">
          <RecentConversations />
        </div>
        <TokenChart />
      </div>

      <QuickActions />
    </div>
  );
}

export default DashboardPage;