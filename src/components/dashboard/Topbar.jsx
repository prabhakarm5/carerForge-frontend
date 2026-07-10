import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Zap, User, Settings, LogOut, Shield, Star, Crown, Sparkles, ChevronLeft, AlertTriangle } from "lucide-react";
import useAuthStore from "../../store/authStore";

/* ─── Design Tokens ──────────────────────────────────────────────── */
const TOPBAR_H   = 40;
const TOPBAR_BG  = "linear-gradient(180deg, rgba(24,24,32,0.96), rgba(15,15,20,0.96))";
const BORDER     = "rgba(255,255,255,0.08)";
const TEXT       = "rgba(255,255,255,0.9)";
const TEXT_MUTED = "rgba(255,255,255,0.45)";
const TEXT_DIM   = "rgba(255,255,255,0.22)";
const MENU_BG    = "linear-gradient(160deg,#24242e,#18181f)";
const ACCENT_LT  = "#a78bfa";
const EASE       = "cubic-bezier(0.22, 1, 0.36, 1)";

function getPlanStyle(planRaw) {
  const hasPlan = planRaw != null && String(planRaw).trim() !== "";
  const label = hasPlan ? String(planRaw).trim() : "Free";
  const lower = label.toLowerCase();

  if (!hasPlan || lower === "free")
    return { label: "Free", color: TEXT_DIM, bg: "rgba(255,255,255,0.04)", border: BORDER, icon: Sparkles };
  if (lower.includes("enterprise") || lower.includes("business"))
    return { label, color: "#34d399", bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)", icon: Crown };
  if (lower.includes("ultimate") || lower.includes("ultra") || lower.includes("max"))
    return { label, color: "#fb7185", bg: "rgba(251,113,133,0.12)", border: "rgba(251,113,133,0.25)", icon: Crown };
  if (lower.includes("pro") || lower.includes("premium") || lower.includes("plus"))
    return { label, color: "#fbbf24", bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.25)", icon: Star };
  if (lower.includes("basic") || lower.includes("starter"))
    return { label, color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "rgba(129,140,248,0.25)", icon: Zap };
  return { label, color: "#a78bfa", bg: "rgba(167,139,250,0.12)", border: "rgba(167,139,250,0.25)", icon: Sparkles };
}

function useSmoothOpen(isOpen, durationMs = 180) {
  const [rendered, setRendered] = useState(isOpen);
  useEffect(() => {
    let t;
    if (isOpen) setRendered(true);
    else t = setTimeout(() => setRendered(false), durationMs);
    return () => clearTimeout(t);
  }, [isOpen, durationMs]);
  return rendered;
}

function Avatar({ user, size = 26 }) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = user?.profileImage || null;
  useEffect(() => { setImgError(false); }, [imgSrc]);
  const initials = user?.name
    ? user.name.trim().split(/\s+/).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";
  const showImage = imgSrc && !imgError;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      overflow: "hidden",
      background: "linear-gradient(145deg,#8b5cf6,#db2777)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, color: "#fff",
      boxShadow: "0 2px 6px rgba(124,58,237,0.5), inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -1px 2px rgba(0,0,0,0.35)",
      userSelect: "none", cursor: "pointer", position: "relative",
      transition: `transform 160ms ${EASE}`,
    }}>
      {showImage ? (
        <img
          src={imgSrc}
          alt={user?.name || "User"}
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
        />
      ) : initials}
    </div>
  );
}

function IBtn({ onClick, children, style = {}, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`topbar-ibtn inline-flex items-center justify-center ${className}`}
      style={{
        width: 28, height: 28, borderRadius: 9, border: `1px solid ${BORDER}`, cursor: "pointer",
        background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(255,255,255,0.015))",
        boxShadow: "0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
        color: TEXT_MUTED,
        flexShrink: 0, transition: `all 150ms ${EASE}`, ...style,
      }}
    >{children}</button>
  );
}

function TokenBadge({ wallet }) {
  if (!wallet) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      background: "linear-gradient(145deg, rgba(124,58,237,0.22), rgba(124,58,237,0.08))",
      border: "1px solid rgba(124,58,237,0.35)",
      boxShadow: "0 1px 3px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
      borderRadius: 99, padding: "3px 9px 3px 6px", cursor: "default", flexShrink: 0,
    }}>
      <Zap size={10} color={ACCENT_LT} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: "#c4b5fd", fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
        {wallet.remainingTokens ?? 0}
      </span>
    </div>
  );
}

function ProfileDropdown({ user, wallet, open, onClose }) {
  const rendered = useSmoothOpen(open, 180);
  const [visible, setVisible] = useState(false);
  const [panel, setPanel] = useState("menu");
  const [loggingOut, setLoggingOut] = useState(null);
  const dropRef = useRef(null);

  const navigate = useNavigate();
  const logoutCurrentDevice = useAuthStore((s) => s.logoutCurrentDevice);
  const logoutEverywhere = useAuthStore((s) => s.logoutEverywhere);

  const planStyle = getPlanStyle(wallet?.currentPlanName);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setPanel("menu"), 180);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const doLogoutThis = useCallback(async () => {
    setLoggingOut("this");
    try { await logoutCurrentDevice(); onClose(); navigate("/login"); }
    finally { setLoggingOut(null); }
  }, [logoutCurrentDevice, navigate, onClose]);

  const doLogoutAll = useCallback(async () => {
    setLoggingOut("all");
    try { await logoutEverywhere(); onClose(); navigate("/login"); }
    finally { setLoggingOut(null); }
  }, [logoutEverywhere, navigate, onClose]);

  if (!rendered) return null;

  return (
    <div
      ref={dropRef}
      style={{
        position: "absolute", top: "calc(100% + 10px)", right: 0,
        zIndex: 100, width: "min(252px, calc(100vw - 24px))",
        maxHeight: "calc(100vh - 80px)", overflow: "hidden",
        background: MENU_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        boxShadow: "0 24px 70px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.96)",
        transformOrigin: "top right",
        transition: `opacity 180ms ${EASE}, transform 180ms ${EASE}`,
        willChange: "opacity, transform",
      }}
    >
      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 80px)" }}>

        {panel === "menu" && (
          <Panel>
            <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Avatar user={user} size={40} />
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user?.name || "User"}
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: TEXT_MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {user?.email || ""}
                  </p>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    fontSize: 10, fontWeight: 700, color: planStyle.color,
                    background: planStyle.bg, padding: "2px 8px",
                    borderRadius: 99, letterSpacing: "0.04em", marginTop: 4,
                    border: `1px solid ${planStyle.border}`,
                  }}>
                    <planStyle.icon size={9} /> {planStyle.label} Plan
                  </span>
                </div>
              </div>
            </div>

            <div style={{ padding: "6px" }}>
              <DropItem icon={User} label="View Profile" onClick={() => { onClose(); navigate("/profile"); }} />
              <DropItem icon={Zap} label="Plans & Tokens" onClick={() => { onClose(); navigate("/wallet"); }} />
              <DropItem icon={Settings} label="Settings" onClick={() => { onClose(); navigate("/settings"); }} />
              <DropItem icon={Shield} label="Security" onClick={() => { onClose(); navigate("/settings?tab=security"); }} />
            </div>

            <div style={{ padding: "6px", borderTop: `1px solid ${BORDER}` }}>
              <DropItem icon={LogOut} label="Sign Out" danger onClick={() => setPanel("confirmLogout")} />
            </div>
          </Panel>
        )}

        {panel === "confirmLogout" && (
          <Panel>
            <PanelHeader onBack={() => setPanel("menu")} title="Sign out" />
            <div style={{ padding: "6px 16px 16px" }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, margin: "6px auto 12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(145deg, rgba(239,68,68,0.18), rgba(239,68,68,0.05))",
                border: "1px solid rgba(239,68,68,0.25)",
                boxShadow: "0 3px 10px rgba(239,68,68,0.22), inset 0 1px 0 rgba(255,255,255,0.08)",
              }}>
                <AlertTriangle size={18} color="#f87171" />
              </div>
              <p style={{ margin: "0 0 16px", fontSize: 12.5, color: "rgba(255,255,255,0.55)", textAlign: "center", lineHeight: 1.6 }}>
                Are you sure you want to sign out?
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setPanel("menu")} className="tb-btn-ghost">Cancel</button>
                <button onClick={() => setPanel("chooseScope")} className="tb-btn-danger">Sign out</button>
              </div>
            </div>
          </Panel>
        )}

        {panel === "chooseScope" && (
          <Panel>
            <PanelHeader onBack={() => !loggingOut && setPanel("confirmLogout")} title="Sign out scope" />
            <div style={{ padding: "6px 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <ScopeBtn
                label="This device only"
                sub="Just end this session"
                busy={loggingOut === "this"}
                disabled={!!loggingOut}
                onClick={doLogoutThis}
              />
              <ScopeBtn
                label="All devices"
                sub="Sign out everywhere"
                busy={loggingOut === "all"}
                disabled={!!loggingOut}
                onClick={doLogoutAll}
                strong
              />
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
}

function Panel({ children }) {
  return (
    <div style={{ animation: `tbFadeSlide 200ms ${EASE}` }}>
      {children}
      <style>{`@keyframes tbFadeSlide { from { opacity: 0; transform: translateX(6px); } to { opacity: 1; transform: translateX(0); } }`}</style>
    </div>
  );
}

function PanelHeader({ onBack, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 10px", borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={onBack} className="tb-back-btn">
        <ChevronLeft size={14} />
      </button>
      <span style={{ fontSize: 12.5, fontWeight: 700, color: TEXT }}>{title}</span>
    </div>
  );
}

function ScopeBtn({ label, sub, onClick, busy, disabled, strong }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={strong ? "tb-scope-btn strong" : "tb-scope-btn"}
      style={{ opacity: disabled && !busy ? 0.45 : 1 }}
    >
      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{busy ? "Signing out..." : label}</span>
        {!busy && <span style={{ fontSize: 10.5, opacity: 0.6, fontWeight: 400 }}>{sub}</span>}
      </span>
      {busy && <span className="tb-spinner" />}
    </button>
  );
}

function DropItem({ icon: Icon, label, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className={danger ? "topbar-drop-item danger" : "topbar-drop-item"}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: "8px 10px", borderRadius: 9, border: "none", cursor: "pointer",
        background: "transparent",
        color: danger ? "rgba(248,113,113,0.75)" : TEXT_MUTED,
        fontSize: 13, fontFamily: "inherit", textAlign: "left",
      }}
    >
      <Icon size={14} style={{ flexShrink: 0 }} />
      {label}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN TOPBAR
   ══════════════════════════════════════════════════════════════════ */
export default function Topbar({ setSidebarOpen, wallet }) {
  const user = useAuthStore((s) => s.user);
  const [showProfile, setShowProfile] = useState(false);

  const headerStyle = {
    position: "sticky", top: 0, zIndex: 30,
    width: "100%", boxSizing: "border-box",
    background: TOPBAR_BG,
    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    borderBottom: `1px solid ${BORDER}`,
    boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
  };

  return (
    <header style={headerStyle}>
      <div style={{ height: TOPBAR_H, width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px" }}>
        <IBtn onClick={() => setSidebarOpen(true)} className="lg:hidden" style={{ marginLeft: -2 }}>
          <Menu size={15} />
        </IBtn>

        <div style={{ flex: 1, minWidth: 0 }} />

        <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0, minWidth: 0 }}>
          <TokenBadge wallet={wallet} />

          <div style={{ position: "relative" }}>
            <div onClick={() => setShowProfile((v) => !v)} className="topbar-avatar-btn">
              <Avatar user={user} size={26} />
            </div>
            <ProfileDropdown user={user} wallet={wallet} open={showProfile} onClose={() => setShowProfile(false)} />
          </div>
        </div>
      </div>

      <style>{`
        .topbar-ibtn:hover { background: linear-gradient(145deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03)); color: ${TEXT}; }
        .topbar-ibtn:active { transform: translateY(1px) scale(0.96); }
        .topbar-avatar-btn { cursor: pointer; transition: transform 150ms ${EASE}; }
        .topbar-avatar-btn:active { transform: scale(0.92); }

        .topbar-drop-item { transition: background 140ms ${EASE}, color 140ms ${EASE}; }
        .topbar-drop-item:hover { background: rgba(255,255,255,0.06); color: ${TEXT}; }
        .topbar-drop-item.danger:hover { background: rgba(239,68,68,0.09); color: #fca5a5; }

        .tb-back-btn {
          width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.6); border: none; cursor: pointer;
          transition: background 140ms ${EASE};
        }
        .tb-back-btn:hover { background: rgba(255,255,255,0.1); }

        .tb-btn-ghost, .tb-btn-danger {
          flex: 1; padding: 9px 10px; border-radius: 10px; font-size: 12.5px; font-weight: 600;
          cursor: pointer; font-family: inherit; border: 1px solid transparent;
          transition: transform 140ms ${EASE}, background 140ms ${EASE};
        }
        .tb-btn-ghost { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.08); }
        .tb-btn-ghost:hover { background: rgba(255,255,255,0.1); }
        .tb-btn-danger {
          background: linear-gradient(145deg, rgba(239,68,68,0.28), rgba(239,68,68,0.14));
          color: #fca5a5; border-color: rgba(239,68,68,0.35);
          box-shadow: 0 2px 8px rgba(239,68,68,0.25);
        }
        .tb-btn-danger:hover { transform: translateY(-1px); }
        .tb-btn-danger:active, .tb-btn-ghost:active { transform: scale(0.97); }

        .tb-scope-btn {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.75); cursor: pointer;
          font-family: inherit; transition: background 140ms ${EASE}, transform 140ms ${EASE};
        }
        .tb-scope-btn:hover:not(:disabled) { background: rgba(255,255,255,0.08); transform: translateY(-1px); }
        .tb-scope-btn.strong {
          background: linear-gradient(145deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08));
          border-color: rgba(239,68,68,0.3); color: #f87171;
        }
        .tb-scope-btn.strong:hover:not(:disabled) { background: linear-gradient(145deg, rgba(239,68,68,0.28), rgba(239,68,68,0.12)); }

        .tb-spinner {
          width: 13px; height: 13px; border-radius: 50%; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.2); border-top-color: currentColor;
          animation: tbSpin 0.7s linear infinite;
        }
        @keyframes tbSpin { to { transform: rotate(360deg); } }
      `}</style>
    </header>
  );
}