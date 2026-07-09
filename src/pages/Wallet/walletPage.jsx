import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownRight,
  Loader2, RotateCcw, Zap, Gift, Image as ImageIcon, CreditCard,
  Star, Crown, Sparkles, ChevronRight, Calendar, X, ChevronDown,
  ArrowLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import { getWallet, getWalletHistory } from "../../services/walletService";
import { startCheckout, enablePaymentGuard, disablePaymentGuard } from "../../services/paymentService";
import useAuthStore from "../../store/authStore";
import RechargeModal from "../../components/common/recharge/RechargeModal";
import PaymentProcessingOverlay from "../../pages/Payment/PaymentProcessingOverlay";

// Feature type ke hisaab se icon/color — history list sundar dikhane ke liye
const FEATURE_META = {
  SUBSCRIPTION: { icon: CreditCard, color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  BONUS:        { icon: Gift,       color: "#fbbf24", bg: "rgba(251,191,36,0.12)" },
  IMAGE:        { icon: ImageIcon,  color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  DEFAULT:      { icon: Zap,        color: "#34d399", bg: "rgba(52,211,153,0.12)" },
};

const HISTORY_PAGE_SIZE = 6;

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function toISODate(dateStr) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
}

// Plan label hamesha backend se aayega; icon/color sirf keyword-based accent hai
function getPlanInfo(planRaw) {
  const hasPlan = planRaw != null && String(planRaw).trim() !== "";
  const label = hasPlan ? String(planRaw).trim() : "Free";
  const lower = label.toLowerCase();

  if (!hasPlan || lower === "free")
    return { label: "Free", color: "rgba(255,255,255,0.5)", bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.1)", icon: Sparkles };
  if (lower.includes("enterprise") || lower.includes("business"))
    return { label, color: "#34d399", bg: "rgba(52,211,153,0.10)", border: "rgba(52,211,153,0.25)", icon: Crown };
  if (lower.includes("ultimate") || lower.includes("ultra") || lower.includes("max"))
    return { label, color: "#fb7185", bg: "rgba(251,113,133,0.10)", border: "rgba(251,113,133,0.25)", icon: Crown };
  if (lower.includes("pro") || lower.includes("premium") || lower.includes("plus"))
    return { label, color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.25)", icon: Star };
  if (lower.includes("basic") || lower.includes("starter"))
    return { label, color: "#818cf8", bg: "rgba(129,140,248,0.10)", border: "rgba(129,140,248,0.25)", icon: Zap };
  return { label, color: "#a78bfa", bg: "rgba(167,139,250,0.10)", border: "rgba(167,139,250,0.25)", icon: Sparkles };
}

/* ── Skeleton block ───────────────────────────────────────────── */
function Skeleton({ h = 56, r = 14 }) {
  return <div style={{ height: h, borderRadius: r, background: "rgba(255,255,255,0.045)" }} className="animate-pulse" />;
}

export default function WalletPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);

  const [wallet, setWallet] = useState(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [walletError, setWalletError] = useState(false);

  const planInfo = useMemo(() => getPlanInfo(wallet?.currentPlanName), [wallet?.currentPlanName]);
  const PlanIcon = planInfo.icon;

  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  const [dateFilter, setDateFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);

  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeReason, setRechargeReason] = useState("tokens");
  const [checkoutInProgress, setCheckoutInProgress] = useState(false);

  // ================= LOAD WALLET BALANCE =================
  const loadWallet = useCallback(async () => {
    try {
      setWalletLoading(true);
      const data = await getWallet();
      setWallet(data);
      setWalletError(false);
    } catch {
      setWalletError(true);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  // ================= LOAD TRANSACTION HISTORY =================
  const loadHistory = useCallback(async () => {
    try {
      setHistoryLoading(true);
      const data = await getWalletHistory();
      setHistory(data || []);
      setHistoryError(false);
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWallet();
    loadHistory();
  }, [loadWallet, loadHistory]);

  // RechargeModal se navigate("/wallet?plan=<id>") karke aata hai
  useEffect(() => {
    const planId = searchParams.get("plan");
    if (planId && !checkoutInProgress) {
      handleCheckout(planId);
      searchParams.delete("plan");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ================= CHECKOUT FLOW =================
  async function handleCheckout(planId) {
    setCheckoutInProgress(true);
    enablePaymentGuard(); // refresh/close warning ON

    try {
      const result = await startCheckout({
        planId,
        userName: user?.name,
        userEmail: user?.email,
      });

      toast.success("Payment successful!");
      await Promise.all([loadWallet(), loadHistory()]);

      navigate("/payment/success", {
        state: {
          verified: true,
          orderId: result?.raw?.razorpay_order_id,
          paymentId: result?.raw?.razorpay_payment_id,
        },
      });
    } catch (err) {
      if (err?.status === "cancelled") {
        toast("Payment cancelled", { icon: "⚠️" });
      } else {
        toast.error("Payment failed");
        navigate("/payment/failed", {
          state: {
            verified: true,
            reason: err?.reason || "Payment could not be completed",
          },
        });
      }
    } finally {
      setCheckoutInProgress(false);
      disablePaymentGuard(); // warning OFF
    }
  }

  function openRecharge(reason = "tokens") {
    setRechargeReason(reason);
    setRechargeOpen(true);
  }

  async function handlePlanActivated() {
    await Promise.all([loadWallet(), loadHistory()]);
  }

  const remaining = wallet?.remainingTokens ?? 0;
  const total = wallet?.totalTokens ?? 0;
  const used = wallet?.usedTokens ?? 0;
  const usedPercent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

  const filteredHistory = useMemo(() => {
    if (!dateFilter) return history;
    return history.filter((tx) => toISODate(tx.createdAt) === dateFilter);
  }, [history, dateFilter]);

  const visibleHistory = filteredHistory.slice(0, visibleCount);
  const hasMore = filteredHistory.length > visibleCount;

  function clearDateFilter() {
    setDateFilter("");
    setVisibleCount(HISTORY_PAGE_SIZE);
  }

  function onDateChange(value) {
    setDateFilter(value);
    setVisibleCount(HISTORY_PAGE_SIZE);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0d", padding: "24px 16px 60px" }} className="sm:p-8">
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* ─── HEADER with BACK BUTTON ─── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "rgba(255,255,255,0.7)", cursor: "pointer",
              }}
              className="wallet-back-btn"
              aria-label="Go back"
            >
              <ArrowLeft size={17} />
            </button>

            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: "linear-gradient(135deg,#7c3aed,#db2777)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 18px rgba(124,58,237,0.3)", flexShrink: 0,
            }}>
              <WalletIcon size={18} color="#fff" />
            </div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#f4f4f5", margin: 0 }}>
              Wallet
            </h1>
          </div>
        </div>

        {/* ─── TOP GRID: Balance + Current Plan ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">

          {/* Balance card */}
          <div className="sm:col-span-3">
            {walletLoading ? (
              <Skeleton h={218} r={20} />
            ) : walletError ? (
              <div style={{
                padding: 24, borderRadius: 20, textAlign: "center", height: "100%",
                background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)",
              }}>
                <p style={{ color: "rgba(252,165,165,0.9)", fontSize: 13, marginBottom: 10 }}>
                  Couldn't load wallet balance
                </p>
                <button onClick={loadWallet} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  color: "#fca5a5", fontSize: 12.5, background: "none", border: "none", cursor: "pointer",
                }}>
                  <RotateCcw size={13} /> Retry
                </button>
              </div>
            ) : (
              <div style={{
                borderRadius: 20, padding: "22px 22px 20px", height: "100%",
                background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(219,39,119,0.12))",
                border: "1px solid rgba(255,255,255,0.08)",
                position: "relative", overflow: "hidden",
              }}>
                <div style={{
                  position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%",
                  background: "radial-gradient(circle, rgba(124,58,237,0.25) 0%, transparent 70%)", pointerEvents: "none",
                }} />
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", margin: "0 0 6px", position: "relative" }}>
                  Available balance
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 18, position: "relative" }}>
                  <span style={{ fontSize: "clamp(28px,6vw,36px)", fontWeight: 800, color: "#fff" }}>
                    {remaining.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>tokens</span>
                </div>

                <div style={{ height: 6, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: 10, position: "relative" }}>
                  <div style={{
                    height: "100%", width: `${usedPercent}%`,
                    background: "linear-gradient(90deg,#818cf8,#c084fc)",
                    borderRadius: 99, transition: "width 0.4s ease",
                  }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "rgba(255,255,255,0.4)", marginBottom: 20, position: "relative" }}>
                  <span>{used.toLocaleString()} used</span>
                  <span>{total.toLocaleString()} total</span>
                </div>

                <button
                  onClick={() => openRecharge("tokens")}
                  disabled={checkoutInProgress}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                    width: "100%", padding: "11px 16px", borderRadius: 12, position: "relative",
                    background: "linear-gradient(135deg,#7c3aed,#db2777)",
                    color: "#fff", fontSize: 13.5, fontWeight: 600, border: "none",
                    cursor: checkoutInProgress ? "not-allowed" : "pointer",
                    opacity: checkoutInProgress ? 0.6 : 1,
                    boxShadow: "0 0 18px rgba(124,58,237,0.3)",
                  }}
                >
                  {checkoutInProgress ? (
                    <><Loader2 size={15} className="animate-spin" /> Processing…</>
                  ) : (
                    <><Plus size={15} /> Recharge wallet</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Current plan card */}
          <div className="sm:col-span-2">
            {walletLoading ? (
              <Skeleton h={218} r={20} />
            ) : (
              <div
                style={{
                  borderRadius: 20, padding: "20px", height: "100%",
                  background: `linear-gradient(160deg, ${planInfo.bg}, rgba(17,17,23,0.9))`,
                  border: `1px solid ${planInfo.border}`,
                  display: "flex", flexDirection: "column",
                  position: "relative", overflow: "hidden",
                }}
              >
                <div style={{
                  position: "absolute", top: -40, right: -40, width: 140, height: 140, borderRadius: "50%",
                  background: `radial-gradient(circle, ${planInfo.color}22 0%, transparent 70%)`, pointerEvents: "none",
                }} />

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, position: "relative" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: planInfo.bg,
                    border: `1px solid ${planInfo.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <PlanIcon size={18} color={planInfo.color} />
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                    color: planInfo.color, background: planInfo.bg,
                    border: `1px solid ${planInfo.border}`, borderRadius: 99, padding: "3px 8px",
                  }}>
                    Active
                  </span>
                </div>

                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "0 0 4px", fontWeight: 500, position: "relative" }}>
                  Current plan
                </p>
                <p style={{ fontSize: 21, fontWeight: 800, color: planInfo.color, margin: "0 0 auto", position: "relative" }}>
                  {planInfo.label}
                </p>

                <button
                  onClick={() => openRecharge("tokens")}
                  className="wallet-view-plans-btn"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    marginTop: 16, width: "100%", padding: "9px 14px", borderRadius: 11, position: "relative",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.8)", fontSize: 12.5, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {planInfo.label === "Free" ? "View plans" : "View plan"} <ChevronRight size={13} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── TRANSACTION HISTORY ─── */}
        <div style={{ marginTop: 28 }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            flexWrap: "wrap", gap: 10, marginBottom: 12,
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)", margin: 0 }}>
              Transaction history
            </h2>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 10, padding: "6px 10px",
              }}>
                <Calendar size={12} color="rgba(255,255,255,0.35)" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => onDateChange(e.target.value)}
                  style={{
                    background: "transparent", border: "none", outline: "none",
                    color: "rgba(255,255,255,0.75)", fontSize: 12, fontFamily: "inherit",
                    colorScheme: "dark", cursor: "pointer",
                  }}
                />
                {dateFilter && (
                  <button onClick={clearDateFilter} style={{ lineHeight: 0, background: "none", border: "none", cursor: "pointer" }}>
                    <X size={12} color="rgba(255,255,255,0.35)" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} h={56} r={12} />)}
            </div>
          ) : historyError ? (
            <div style={{ padding: 20, textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12.5, marginBottom: 8 }}>
                Couldn't load history
              </p>
              <button onClick={loadHistory} style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer" }}>
                <RotateCcw size={12} /> Retry
              </button>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div style={{ padding: "32px 0", textAlign: "center" }}>
              <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13 }}>
                {dateFilter ? "No transactions on this date" : "No transactions yet"}
              </p>
              {dateFilter && (
                <button onClick={clearDateFilter} style={{ marginTop: 6, color: "#a78bfa", fontSize: 12, background: "none", border: "none", cursor: "pointer" }}>
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {visibleHistory.map((tx, i) => {
                  const meta = FEATURE_META[tx.featureType] || FEATURE_META.DEFAULT;
                  const Icon = meta.icon;
                  const isCredit = tx.transactionType === "CREDIT";

                  return (
                    <div key={tx.id ?? i} className="wallet-tx-row" style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 14,
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: meta.bg, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Icon size={16} color={meta.color} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.85)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {tx.description || tx.featureType}
                        </p>
                        <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", margin: "2px 0 0" }}>
                          {formatDate(tx.createdAt)}
                        </p>
                      </div>

                      <div style={{
                        display: "flex", alignItems: "center", gap: 4,
                        color: isCredit ? "#4ade80" : "#f87171",
                        fontSize: 13.5, fontWeight: 700, flexShrink: 0,
                      }}>
                        {isCredit ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {isCredit ? "+" : "-"}{tx.amount?.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <button
                  onClick={() => setVisibleCount((v) => v + HISTORY_PAGE_SIZE)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    width: "100%", marginTop: 10, padding: "10px", borderRadius: 12,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    color: "rgba(255,255,255,0.55)", fontSize: 12.5, fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Show more <ChevronDown size={13} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Recharge Modal */}
      <RechargeModal
        open={rechargeOpen}
        reason={rechargeReason}
        onClose={() => setRechargeOpen(false)}
        currentPlanId={wallet?.currentPlanId}
        onActivated={handlePlanActivated}
      />

      {/* Full-screen block jab tak payment process chal raha hai */}
      <PaymentProcessingOverlay visible={checkoutInProgress} />

      <style>{`
        .wallet-view-plans-btn { transition: background-color 0.15s ease, border-color 0.15s ease; }
        .wallet-view-plans-btn:hover { background: rgba(255,255,255,0.09); border-color: rgba(255,255,255,0.18); }
        .wallet-back-btn { transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.15s ease; }
        .wallet-back-btn:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); transform: translateX(-2px); }
        .wallet-tx-row { transition: background-color 0.15s ease, border-color 0.15s ease; }
        .wallet-tx-row:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}