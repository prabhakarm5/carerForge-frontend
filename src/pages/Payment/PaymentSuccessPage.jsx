import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { CheckCircle2, ArrowLeft, Receipt, Sparkles } from "lucide-react";

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { orderId, paymentId, verified } = location.state || {};
  const [seconds, setSeconds] = useState(8);

  // ==========================================================
  // GUARD: Ye page sirf tab dikhna chahiye jab handleCheckout()
  // ne khud navigate() call kiya ho (state.verified === true).
  // Agar koi seedha URL type/hit karta hai to location.state
  // hoga hi nahi (ya verified missing hoga) — turant wallet
  // pe wapas bhej do, fake success screen kabhi mat dikhao.
  // ==========================================================
  useEffect(() => {
    if (!verified) {
      navigate("/wallet", { replace: true });
    }
  }, [verified, navigate]);

  // Auto-redirect wallet page pe
  useEffect(() => {
    if (!verified) return; // guard fail hua to timer bhi mat chalao

    const interval = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(interval);
          navigate("/wallet");
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [navigate, verified]);

  // Jab tak redirect nahi ho jaata (guard fail case), kuch bhi render mat karo
  if (!verified) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 50% 0%, rgba(34,197,94,0.08), transparent 60%), #0a0a0d",
        padding: 20,
        position: "relative",
      }}
    >
      {/* Back button - top left */}
      <button
        onClick={() => navigate("/wallet")}
        style={{
          position: "absolute",
          top: 24,
          left: 24,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 99,
          padding: "8px 14px",
          color: "rgba(255,255,255,0.7)",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={15} /> Back
      </button>

      <div
        style={{
          maxWidth: 460,
          width: "100%",
          textAlign: "center",
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: 28,
          padding: "48px 32px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative glow */}
        <div
          style={{
            position: "absolute",
            top: -80,
            left: "50%",
            transform: "translateX(-50%)",
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.25) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Big animated success icon */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            margin: "0 auto 24px",
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
          className="success-pop"
        >
          <CheckCircle2 size={52} color="#4ade80" strokeWidth={2} />
          <Sparkles
            size={20}
            color="#fbbf24"
            style={{ position: "absolute", top: -4, right: -4 }}
          />
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#f4f4f5",
            margin: "0 0 10px",
            position: "relative",
          }}
        >
          Payment Successful!
        </h1>
        <p
          style={{
            fontSize: 14.5,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.7,
            margin: "0 0 28px",
            position: "relative",
          }}
        >
          Tokens aapke wallet mein credit ho gaye hain. Invoice aapke email pe bhej diya gaya hai.
        </p>

        {(paymentId || orderId) && (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16,
              padding: "16px 18px",
              marginBottom: 28,
              textAlign: "left",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Receipt size={14} color="rgba(255,255,255,0.4)" />
              <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", margin: 0, fontWeight: 600, letterSpacing: "0.03em" }}>
                TRANSACTION DETAILS
              </p>
            </div>
            {paymentId && (
              <div style={{ marginBottom: 6 }}>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 2px" }}>Payment ID</p>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", margin: 0, fontFamily: "monospace", wordBreak: "break-all" }}>
                  {paymentId}
                </p>
              </div>
            )}
            {orderId && (
              <div>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", margin: "0 0 2px" }}>Order ID</p>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.8)", margin: 0, fontFamily: "monospace", wordBreak: "break-all" }}>
                  {orderId}
                </p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => navigate("/wallet")}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 14,
            border: "none",
            background: "linear-gradient(135deg,#22c55e,#16a34a)",
            color: "#fff",
            fontSize: 14.5,
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 0 24px rgba(34,197,94,0.3)",
            position: "relative",
          }}
        >
          Go to Wallet ({seconds}s)
        </button>
      </div>

      <style>{`
        @keyframes successPop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.08); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .success-pop { animation: successPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
      `}</style>
    </div>
  );
}