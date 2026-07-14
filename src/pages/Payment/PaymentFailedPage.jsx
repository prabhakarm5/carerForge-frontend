import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { XCircle, RotateCcw, ArrowLeft, LayoutDashboard, AlertTriangle, LifeBuoy } from "lucide-react";

export default function PaymentFailedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { reason, verified, orderId } = location.state || {};

  // ==========================================================
  // GUARD: Same as success page — direct URL hit karne se
  // ye page nahi khulna chahiye. Sirf handleCheckout() ke
  // catch block se navigate() ke through hi access allowed.
  // ==========================================================
  useEffect(() => {
    if (!verified) {
      navigate("/wallet", { replace: true });
    }
  }, [verified, navigate]);

  if (!verified) return null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(circle at 50% 0%, rgba(239,68,68,0.08), transparent 60%), #0a0a0d",
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
          border: "1px solid rgba(239,68,68,0.2)",
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
            background: "radial-gradient(circle, rgba(239,68,68,0.22) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Big animated failed icon */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: "50%",
            margin: "0 auto 24px",
            background: "rgba(239,68,68,0.12)",
            border: "1px solid rgba(239,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="failed-shake"
        >
          <XCircle size={52} color="#f87171" strokeWidth={2} />
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
          Payment Failed
        </h1>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            textAlign: "left",
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.18)",
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 28,
            position: "relative",
          }}
        >
          <AlertTriangle size={17} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.6 }}>
            {reason || "Aapka payment complete nahi ho paaya."} Agar paise kate hain to 5-7 din mein refund ho jayenge.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, position: "relative" }}>
          <button
            onClick={() => navigate("/wallet")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "14px",
              borderRadius: 14,
              border: "none",
              background: "linear-gradient(135deg,#7c3aed,#db2777)",
              color: "#fff",
              fontSize: 14.5,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 0 24px rgba(124,58,237,0.3)",
            }}
          >
            <RotateCcw size={16} /> Try Again
          </button>
          <button
            onClick={() => navigate("/support?new=1&orderId=" + encodeURIComponent(orderId || "") + "&reason=" + encodeURIComponent(reason || "Payment failed after checkout"))}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              width: "100%", padding: "13px", borderRadius: 14,
              background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.22)",
              color: "#67e8f9", fontSize: 13.5, fontWeight: 650, cursor: "pointer",
            }}
          >
            <LifeBuoy size={15} /> Raise a support ticket
          </button>          <button
            onClick={() => navigate("/dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              width: "100%",
              padding: "13px",
              borderRadius: 14,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.65)",
              fontSize: 13.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <LayoutDashboard size={15} /> Back to Dashboard
          </button>
        </div>
      </div>

      <style>{`
        @keyframes failedShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px) scale(1.03); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .failed-shake { animation: failedShake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}