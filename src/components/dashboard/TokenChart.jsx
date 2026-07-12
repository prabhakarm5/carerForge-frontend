// TokenChart.jsx
import { useEffect, useState, useRef } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getWallet } from "../../services/walletService";
import { handleApiError } from "../../utils/errorHandler";

const COLORS = ["#8b5cf6", "#334155"];

function TokenChart() {
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    getWallet()
      .then((data) => {
        if (mountedRef.current) setWallet(data);
      })
      .catch((err) => handleApiError(err))
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  if (loading) {
    return <div className="rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 h-[280px] sm:h-[340px] animate-pulse w-full min-w-0" />;
  }

  const used = wallet?.usedTokens ?? 0;
  const remaining = wallet?.remainingTokens ?? 0;
  const total = used + remaining;

  const data = [
    { name: "Remaining", value: remaining },
    { name: "Used", value: used },
  ];

  return (
    <div className="rounded-2xl sm:rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-6 w-full min-w-0">
      <h2 className="text-white text-base sm:text-xl font-bold mb-3 sm:mb-4">Token Usage</h2>

      {total === 0 ? (
        <div className="h-56 sm:h-72 flex items-center justify-center text-slate-500 text-sm">
          No token data yet
        </div>
      ) : (
        <div className="h-56 sm:h-72 relative min-w-0" style={{ contain: "layout" }}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-bold text-white">
                {Math.round((remaining / total) * 100)}%
              </p>
              <p className="text-[10px] sm:text-xs text-slate-500">left</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} debounce={150}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                outerRadius="75%"
                innerRadius="50%"
                paddingAngle={2}
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  border: "1px solid #1e293b",
                  borderRadius: "12px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: "12px" }}
                formatter={(value) => <span className="text-slate-400">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default TokenChart;