// StatsCards.jsx
import { useEffect, useState } from "react";
import { MessageSquare, Coins, Clock } from "lucide-react";
import { getRecentChats } from "../../services/conversationService";
import { getWallet } from "../../services/walletService";
import { handleApiError } from "../../utils/errorHandler";

function StatsCards() {
  const [stats, setStats] = useState({ chats: 0, tokensUsed: 0, lastActive: "—" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const [conversations, wallet] = await Promise.all([
        getRecentChats().catch(() => []),
        getWallet().catch(() => null),
      ]);

      const lastActive = conversations?.[0]?.updatedAt
        ? new Date(conversations[0].updatedAt).toLocaleDateString()
        : "—";

      setStats({
        chats: conversations?.length ?? 0,
        tokensUsed: wallet?.usedTokens ?? 0,
        lastActive,
      });
    } catch (error) {
      handleApiError(error);
    } finally {
      setLoading(false);
    }
  }

  const cards = [
    { title: "Conversations", value: stats.chats, icon: MessageSquare, color: "violet" },
    { title: "Tokens Used", value: stats.tokensUsed.toLocaleString(), icon: Coins, color: "pink" },
    { title: "Last Active", value: stats.lastActive, icon: Clock, color: "cyan" },
  ];

  const colorMap = {
    violet: { bg: "bg-violet-500/10", text: "text-violet-400" },
    pink: { bg: "bg-pink-500/10", text: "text-pink-400" },
    cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400" },
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 w-full min-w-0">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-[90px] sm:h-[120px] rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 w-full min-w-0">
      {cards.map((item, index) => {
        const Icon = item.icon;
        const colors = colorMap[item.color];
        return (
          <div
            key={index}
            className="group min-w-0 bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hover:border-violet-600/50 transition-colors"
          >
            <div className="flex justify-between items-center sm:items-start gap-2">
              <div className="min-w-0">
                <p className="text-slate-400 text-xs sm:text-sm truncate">{item.title}</p>
                <h2 className="text-xl sm:text-3xl font-bold text-white mt-1 sm:mt-3 truncate">{item.value}</h2>
              </div>
              <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl ${colors.bg} shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon className={`${colors.text} w-5 h-5 sm:w-6 sm:h-6`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StatsCards;