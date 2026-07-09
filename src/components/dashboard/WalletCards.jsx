import { useEffect, useState } from "react";
import { Coins, Wallet, TrendingDown, RotateCcw } from "lucide-react";
import { getWallet } from "../../services/walletService";
import { handleApiError } from "../../utils/errorHandler";

function CardSkeleton() {
  return (
    <div className="rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-6 h-[110px] sm:h-[140px] animate-pulse" />
  );
}

function WalletCards() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    loadWallet();
  }, []);

  async function loadWallet() {
    try {
      setLoading(true);
      setError(false);
      const data = await getWallet();
      setWallet(data);
    } catch (err) {
      setError(true);
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (error || !wallet) {
    return (
      <div className="rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-center">
        <p className="text-slate-500 text-sm mb-3">Failed to load wallet data</p>
        <button
          onClick={loadWallet}
          className="inline-flex items-center gap-1.5 text-sm text-violet-400 hover:text-violet-300"
        >
          <RotateCcw size={14} /> Retry
        </button>
      </div>
    );
  }

  const cards = [
    {
      label: "Total Tokens",
      value: wallet.totalTokens,
      icon: Coins,
      iconBg: "bg-yellow-400/10",
      iconColor: "text-yellow-400",
    },
    {
      label: "Used Tokens",
      value: wallet.usedTokens,
      icon: TrendingDown,
      iconBg: "bg-red-400/10",
      iconColor: "text-red-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="group rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-6 hover:border-slate-700 transition-colors"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <p className="text-slate-400 text-[11px] sm:text-sm truncate">{card.label}</p>
                <h2 className="text-xl sm:text-4xl text-white font-bold mt-1.5 sm:mt-3 tabular-nums truncate">
                  {card.value?.toLocaleString() ?? 0}
                </h2>
              </div>
              <div className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${card.iconBg} shrink-0 group-hover:scale-105 transition-transform`}>
                <Icon size={18} className={`${card.iconColor} sm:w-7 sm:h-7`} />
              </div>
            </div>
          </div>
        );
      })}

      {/* Remaining - full width on mobile (col-span-2) */}
      <div className="col-span-2 sm:col-span-1 group relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-4 sm:p-6 shadow-lg shadow-violet-900/30">
        <div className="absolute -top-8 -right-8 w-24 sm:w-32 h-24 sm:h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex justify-between items-start gap-2">
          <div className="min-w-0">
            <p className="text-violet-100 text-[11px] sm:text-sm">Remaining</p>
            <h2 className="text-xl sm:text-4xl text-white font-bold mt-1.5 sm:mt-3 tabular-nums">
              {wallet.remainingTokens?.toLocaleString() ?? 0}
            </h2>
          </div>
          <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-white/15 shrink-0 group-hover:scale-105 transition-transform">
            <Wallet size={18} className="text-white sm:w-7 sm:h-7" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default WalletCards;