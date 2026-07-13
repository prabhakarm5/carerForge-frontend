import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Plus, LayoutDashboard, MessageSquare, Image, FileText, Globe, File, BriefcaseBusiness,
  Wallet, Settings, LogOut, Sparkles, X, Search, MoreHorizontal,
  Pencil, Archive, Trash2, Check, RotateCcw, ChevronRight, ChevronUp,
  PanelLeftClose, PanelLeftOpen, User, Zap, Crown, Star, AlertTriangle, ChevronLeft,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getRecentChats, searchChats, renameChat,
  archiveChat, deleteChat,
} from "../../services/conversationService";
import { getWallet } from "../../services/walletService";
import useAuthStore from "../../store/authStore";
import { handleApiError } from "../../utils/errorHandler";
import RechargeModal from "../common/recharge/RechargeModal";
import WorkspaceHistoryPanel from "./WorkspaceHistoryPanel";
import BrandLogo from "../../shared/BrandLogo";

const SEARCH_DEBOUNCE_MS = 300;
const SIDEBAR_STORAGE_KEY = "sidebar_expanded";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
const REFRESH_EVENT = "cf:conversations:refresh";

// ✅ NEW — Kahin bhi app mein (Chat page pe naya chat banne ke baad, ya
// backend se AI title generate hone ke baad) ye function call karo:
//   import { notifyConversationsChanged } from "../layout/Sidebar";
//   notifyConversationsChanged();
// Sidebar turant khud list refresh kar lega — bina page reload/refresh
// kiye, exactly Claude/ChatGPT jaisa instant sync.
export function notifyConversationsChanged() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

const navItems = [
  { icon: LayoutDashboard, text: "Dashboard",   path: "/dashboard",       color: "#818cf8", bg: "rgba(129,140,248,0.12)" },
  { icon: MessageSquare,   text: "Chat AI",     path: "/chat",            color: "#34d399", bg: "rgba(52,211,153,0.12)"  },
  { icon: Image,           text: "Image AI",    path: "/image-generator", color: "#f472b6", bg: "rgba(244,114,182,0.12)" },
  { icon: FileText,        text: "Resume AI",   path: "/resume",          color: "#fb923c", bg: "rgba(251,146,60,0.12)"  },
  { icon: BriefcaseBusiness, text: "Live Jobs", path: "/jobs",            color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  { icon: Globe,           text: "Website AI",  path: "/website",         color: "#38bdf8", bg: "rgba(56,189,248,0.12)"  },
  { icon: File,            text: "PDF AI",      path: "/pdf-ai",          color: "#a78bfa", bg: "rgba(167,139,250,0.12)" },
];

function groupByDate(chats) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const groups = { "Today": [], "Yesterday": [], "Previous 7 Days": [], "Previous 30 Days": [], "Earlier": [] };
  chats.forEach((chat) => {
    const d = new Date(chat.updatedAt || chat.createdAt || Date.now()); d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) groups["Today"].push(chat);
    else if (d.getTime() === yesterday.getTime()) groups["Yesterday"].push(chat);
    else if (d >= sevenDaysAgo) groups["Previous 7 Days"].push(chat);
    else if (d >= thirtyDaysAgo) groups["Previous 30 Days"].push(chat);
    else groups["Earlier"].push(chat);
  });
  return Object.entries(groups).filter(([, list]) => list.length > 0);
}

function readStoredExpanded() {
  try {
    const v = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (v === null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

function getPlanInfo(planRaw) {
  const hasPlan = planRaw != null && String(planRaw).trim() !== "";
  const label = hasPlan ? String(planRaw).trim() : "Free";
  const lower = label.toLowerCase();

  if (!hasPlan || lower === "free")
    return { label: "Free", color: "rgba(255,255,255,0.4)", icon: Sparkles };
  if (lower.includes("enterprise") || lower.includes("business"))
    return { label, color: "#34d399", icon: Crown };
  if (lower.includes("ultimate") || lower.includes("ultra") || lower.includes("max"))
    return { label, color: "#fb7185", icon: Crown };
  if (lower.includes("pro") || lower.includes("premium") || lower.includes("plus"))
    return { label, color: "#fbbf24", icon: Star };
  if (lower.includes("basic") || lower.includes("starter"))
    return { label, color: "#818cf8", icon: Zap };
  return { label, color: "#a78bfa", icon: Sparkles };
}

/* ─── Hook: smooth mount/unmount ─── */
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

/* ─── Avatar ─────────────────────────────────────────────────────── */
function SidebarAvatar({ user, size = 32 }) {
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
      fontSize: size * 0.38, fontWeight: 700, color: "#fff",
      boxShadow: "0 2px 6px rgba(124,58,237,0.5), inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -1px 2px rgba(0,0,0,0.35)",
      position: "relative", userSelect: "none",
    }}>
      {showImage ? (
        <img
          src={imgSrc} alt={user?.name || "User"} onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
        />
      ) : initials}
    </div>
  );
}

/* ─── Tooltip ────────────────────────────────────────────────────── */
const Tooltip = memo(function Tooltip({ label, children }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{
          position: "absolute", left: "calc(100% + 12px)", top: "50%", transform: "translateY(-50%)",
          background: "#1c1c22", border: "1px solid rgba(255,255,255,0.1)",
          color: "#f4f4f5", fontSize: "12px", fontWeight: 500,
          padding: "5px 10px", borderRadius: "8px", whiteSpace: "nowrap",
          pointerEvents: "none", zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.6)",
          animation: `sbTipIn 140ms ${EASE}`,
        }}>
          {label}
          <div style={{
            position: "absolute", right: "100%", top: "50%", transform: "translateY(-50%)",
            borderWidth: "5px", borderStyle: "solid", borderColor: "transparent #1c1c22 transparent transparent",
          }} />
        </div>
      )}
      <style>{`@keyframes sbTipIn { from { opacity:0; transform: translate(-4px,-50%);} to { opacity:1; transform: translate(0,-50%);} }`}</style>
    </div>
  );
});

/* ─── Logout Modal — glass backdrop + scale/fade + step confirm ─── */
function LogoutModal({ open, onClose, onLogoutThis, onLogoutAll }) {
  const rendered = useSmoothOpen(open, 200);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState("confirm"); // confirm | scope
  const [busy, setBusy] = useState(null); // null | "this" | "all"

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = setTimeout(() => setStep("confirm"), 200);
    return () => clearTimeout(t);
  }, [open]);

  async function runThis() {
    if (busy) return;
    setBusy("this");
    try { await onLogoutThis(); } finally { setBusy(null); }
  }
  async function runAll() {
    if (busy) return;
    setBusy("all");
    try { await onLogoutAll(); } finally { setBusy(null); }
  }

  if (!rendered) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 999,
        background: visible ? "rgba(0,0,0,0.65)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(3px)" : "blur(0px)",
        WebkitBackdropFilter: visible ? "blur(3px)" : "blur(0px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, transition: `background 200ms ${EASE}, backdrop-filter 200ms ${EASE}`,
      }}
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(160deg,#23232d,#18181f)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 20,
          padding: "22px 22px 18px",
          width: "100%", maxWidth: 340,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          boxShadow: "0 24px 70px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(14px) scale(0.94)",
          transition: `opacity 220ms ${EASE}, transform 220ms ${EASE}`,
        }}
      >
        {step === "confirm" ? (
          <div key="confirm" style={{ animation: `sbFade 180ms ${EASE}` }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "linear-gradient(145deg, rgba(239,68,68,0.18), rgba(239,68,68,0.05))",
              border: "1px solid rgba(239,68,68,0.25)",
              boxShadow: "0 3px 10px rgba(239,68,68,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
            }}>
              <AlertTriangle size={20} color="#f87171" />
            </div>
            <h3 style={{ textAlign: "center", margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: "#f4f4f5" }}>
              Sign out?
            </h3>
            <p style={{ textAlign: "center", margin: "0 0 22px", fontSize: 13, color: "rgba(255,255,255,0.42)", lineHeight: 1.6 }}>
              Are you sure you want to sign out of your account?
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} className="sb-btn-ghost">Cancel</button>
              <button onClick={() => setStep("scope")} className="sb-btn-danger">Sign out</button>
            </div>
          </div>
        ) : (
          <div key="scope" style={{ animation: `sbFade 180ms ${EASE}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <button onClick={() => !busy && setStep("confirm")} className="sb-back-btn"><ChevronLeft size={14} /></button>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#f4f4f5" }}>Sign out scope</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button disabled={!!busy} onClick={runThis} className="sb-scope-btn">
                <span>
                  <span className="sb-scope-title">{busy === "this" ? "Signing out..." : "This device only"}</span>
                  {busy !== "this" && <span className="sb-scope-sub">End just this session</span>}
                </span>
                {busy === "this" && <span className="sb-spinner" />}
              </button>
              <button disabled={!!busy} onClick={runAll} className="sb-scope-btn strong">
                <span>
                  <span className="sb-scope-title">{busy === "all" ? "Signing out everywhere..." : "All devices"}</span>
                  {busy !== "all" && <span className="sb-scope-sub">Sign out of every session</span>}
                </span>
                {busy === "all" && <span className="sb-spinner" />}
              </button>
              <button onClick={onClose} disabled={!!busy} className="sb-cancel-link">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes sbFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

/* ─── AccountMenu — smooth mount + slide/scale ─── */
function AccountMenu({ open, anchorExpanded, anchorBtnRef, user, planInfo, onClose, onOpenPlans, onOpenLogout, navigate }) {
  const rendered = useSmoothOpen(open, 170);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
  }, [open]);

  useEffect(() => {
    function onDown(e) {
      const insideMenu = ref.current && ref.current.contains(e.target);
      const insideAnchor = anchorBtnRef?.current && anchorBtnRef.current.contains(e.target);
      if (!insideMenu && !insideAnchor) onClose();
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [onClose, anchorBtnRef]);

  if (!rendered) return null;
  const PlanIcon = planInfo.icon;

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: anchorExpanded ? 0 : "calc(100% + 8px)",
        width: 246,
        maxWidth: "calc(100vw - 24px)",
        maxHeight: "calc(100vh - 90px)",
        overflowY: "auto",
        background: "linear-gradient(160deg,#25252e,#1b1b21)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 16,
        boxShadow: "0 24px 70px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06)",
        zIndex: 60,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.95)",
        transformOrigin: "bottom left",
        transition: `opacity 170ms ${EASE}, transform 170ms ${EASE}`,
        willChange: "opacity, transform",
      }}
    >
      <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <SidebarAvatar user={user} size={36} />
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 12.5, fontWeight: 700, color: "#f4f4f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.name || "User"}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <PlanIcon size={11} color={planInfo.color} />
              <span style={{ fontSize: 11, fontWeight: 600, color: planInfo.color }}>{planInfo.label} plan</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: 6 }}>
        <MenuRow icon={Zap} label="Plans & tokens" sub="View or upgrade" onClick={() => { onClose(); onOpenPlans(); }} accent />
        <MenuRow icon={Wallet} label="Wallet" onClick={() => { onClose(); navigate("/wallet"); }} />
        <MenuRow icon={User} label="Profile" onClick={() => { onClose(); navigate("/profile"); }} />
        <MenuRow icon={Settings} label="Settings" onClick={() => { onClose(); navigate("/settings"); }} />
      </div>

      <div style={{ padding: 6, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <MenuRow icon={LogOut} label="Sign out" danger onClick={() => { onClose(); onOpenLogout(); }} />
      </div>
    </div>
  );
}

function MenuRow({ icon: Icon, label, sub, onClick, danger, accent }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 text-left sb-menu-row"
      style={{
        padding: "8px 10px", borderRadius: 9, border: "none", cursor: "pointer",
        background: "transparent", fontFamily: "inherit",
        color: danger ? "rgba(248,113,113,0.8)" : "rgba(255,255,255,0.75)",
      }}
    >
      <div style={{
        width: 26, height: 26, borderRadius: 7, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: accent ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.05)",
        transition: `background 140ms ${EASE}`,
      }}>
        <Icon size={13} color={accent ? "#a78bfa" : danger ? "#f87171" : "rgba(255,255,255,0.5)"} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12.5, fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ margin: 0, fontSize: 10.5, color: "rgba(255,255,255,0.3)" }}>{sub}</p>}
      </div>
    </button>
  );
}

/* ─── ChatRow ── */
const ChatRow = memo(function ChatRow({
  chat, isActive, isEditing, isConfirming, isBusy, openMenuId,
  onOpenChat, onStartRename, onEditChange, onEditKeyDown, onSubmitRename,
  onConfirmDelete, onDelete, onCancelDelete, onToggleMenu, onArchive, editValue,
}) {
  return (
    <div
      className="relative group"
      style={{
        opacity: isBusy ? 0.4 : 1,
        pointerEvents: isBusy ? "none" : "auto",
        transition: `opacity 160ms ${EASE}`,
        // ✅ PERF — bade chat history mein jo rows screen se bahar hain
        // unhe browser paint/layout hi nahi karta jab tak scroll karke
        // paas nahi aate. Lambi list ke saath scroll bahut zyada smooth
        // ho jaata hai, especially mobile pe.
        contentVisibility: "auto",
        containIntrinsicSize: "0px 34px",
      }}
    >
      {isEditing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", borderRadius: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)" }}>
          <input
            autoFocus value={editValue} onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => onEditKeyDown(e, chat.id)}
            style={{ flex: 1, background: "transparent", outline: "none", border: "none", fontSize: 12.5, color: "#f4f4f5" }}
          />
          <button onClick={() => onSubmitRename(chat.id)} style={{ padding: "2px 4px", borderRadius: 5 }}>
            <Check size={12} color="#4ade80" />
          </button>
        </div>
      ) : isConfirming ? (
        <div style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", animation: `sbFade 150ms ${EASE}` }}>
          <p style={{ fontSize: 11.5, color: "rgba(252,165,165,0.9)", marginBottom: 6 }}>Delete this chat?</p>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => onDelete(chat.id)} style={{ fontSize: 11.5, fontWeight: 600, color: "#fca5a5" }}>Delete</button>
            <button onClick={onCancelDelete} style={{ fontSize: 11.5, color: "rgba(255,255,255,0.3)" }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div
          className="chat-row"
          style={{ display: "flex", alignItems: "center", borderRadius: 8, background: isActive ? "rgba(255,255,255,0.07)" : "transparent", position: "relative", transition: `background 140ms ${EASE}` }}
        >
          {isActive && (
            <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 2.5, height: 16, borderRadius: 99, background: "linear-gradient(180deg, #818cf8, #c084fc)" }} />
          )}
          <Link
            to={`/chat/${chat.id}`}
            style={{ flex: 1, padding: "6px 8px", paddingLeft: isActive ? 12 : 8, fontSize: 12.5, fontWeight: isActive ? 500 : 400, color: isActive ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}
          >
            {chat.title}
          </Link>
          <div className="flex items-center gap-0.5 pr-1 shrink-0 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-150">
            <button onClick={() => onStartRename(chat)} title="Rename" className="chat-icon-btn">
              <Pencil size={11} color="rgba(255,255,255,0.4)" />
            </button>
            <button onClick={() => onConfirmDelete(chat.id)} title="Delete" className="chat-icon-btn">
              <Trash2 size={11} color="rgba(239,120,120,0.6)" />
            </button>
            <button onClick={() => onToggleMenu(chat.id)} title="More" className="chat-icon-btn">
              <MoreHorizontal size={11} color="rgba(255,255,255,0.4)" />
            </button>
          </div>
          {openMenuId === chat.id && (
            <div style={{ position: "absolute", right: 4, top: "calc(100% + 4px)", zIndex: 30, width: 150, borderRadius: 10, background: "#202027", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 8px 28px rgba(0,0,0,0.55)", padding: "4px", animation: `sbFade 150ms ${EASE}` }}>
              <button onClick={() => onArchive(chat.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "6px 9px", borderRadius: 7, fontSize: 12.5, color: "rgba(255,255,255,0.7)", background: "transparent", textAlign: "left" }}>
                <Archive size={12} color="rgba(255,255,255,0.35)" /> Archive
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/* ══════════════════════════════════════════════════════════════════
   SIDEBAR
   ══════════════════════════════════════════════════════════════════ */
function Sidebar({ sidebarOpen, setSidebarOpen, onExpandedChange, wallet, refreshWallet }) {
  const location = useLocation();
  const navigate = useNavigate();
  const workspaceKind = location.pathname.startsWith("/resume") ? "resume"
    : location.pathname.startsWith("/image-generator") ? "image"
    : location.pathname.startsWith("/chat") ? "chat"
    : null;
  const newItemLabel = workspaceKind === "resume" ? "New analysis" : workspaceKind === "image" ? "New image" : "New chat";
  const user = useAuthStore((state) => state.user);
  const logoutCurrentDevice = useAuthStore((state) => state.logoutCurrentDevice);
  const logoutEverywhere = useAuthStore((state) => state.logoutEverywhere);

  const [expanded, setExpanded] = useState(readStoredExpanded);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const listMenuRef = useRef(null);
  const debounceTimer = useRef(null);
  const accountBtnRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_STORAGE_KEY, expanded ? "1" : "0"); } catch { /* ignore */ }
    onExpandedChange?.(expanded);
  }, [expanded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (workspaceKind === "chat") loadConversations("");
    return () => clearTimeout(debounceTimer.current);
  }, [workspaceKind]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setSidebarOpen(false); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // ✅ NEW — bina refresh kiye list update: jab bhi koi doosri jagah se
  // (naya chat banane par, ya AI ka title generate hone ke baad)
  // notifyConversationsChanged() call hota hai, ye event sun ke turant
  // list quietly refresh ho jaati hai (koi loading skeleton nahi dikhta,
  // taaki flicker na ho). Saath hi ek halka background poll bhi hai —
  // taaki agar backend title thodi der baad generate kare, wo bhi apne
  // aap dikh jaye — bilkul Claude/ChatGPT jaisa.
  useEffect(() => {
    if (workspaceKind !== "chat") return undefined;

    function silentRefresh() {
      // Agar user abhi rename/delete-confirm/menu ke beech mein hai,
      // toh disturb mat karo — warna UI achanak neeche se badal jayega.
      if (editingId || confirmDeleteId || openMenuId) return;
      loadConversationsQuiet(activeQuery);
    }

    window.addEventListener(REFRESH_EVENT, silentRefresh);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") silentRefresh();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener(REFRESH_EVENT, silentRefresh);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [editingId, confirmDeleteId, openMenuId, activeQuery, workspaceKind]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function handleClickOutside(e) {
      if (listMenuRef.current && !listMenuRef.current.contains(e.target)) { setOpenMenuId(null); setConfirmDeleteId(null); }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearchInput(value) {
    setInputValue(value);
    clearTimeout(debounceTimer.current);
    if (!value.trim()) { setActiveQuery(""); setSearching(false); loadConversations(""); return; }
    setSearching(true);
    debounceTimer.current = setTimeout(() => { setActiveQuery(value.trim()); loadConversations(value.trim()); }, SEARCH_DEBOUNCE_MS);
  }

  function clearSearch() { clearTimeout(debounceTimer.current); setInputValue(""); setActiveQuery(""); setSearching(false); loadConversations(""); }

  async function loadConversations(keyword) {
    try {
      if (keyword) { const data = await searchChats(keyword); setConversations(data || []); }
      else { setLoading(true); const data = await getRecentChats(); setConversations(data || []); }
      setLoadError(false);
    } catch (error) { setLoadError(true); handleApiError(error); }
    finally { setLoading(false); setSearching(false); }
  }

  // ✅ NEW — "quiet" version: koi loading skeleton nahi dikhata, sirf
  // background mein chupke se latest data le aata hai. Isi se background
  // poll aur cross-page refresh event bina flicker/hang ke kaam karte hain.
  async function loadConversationsQuiet(keyword) {
    try {
      const data = keyword ? await searchChats(keyword) : await getRecentChats();
      setConversations(data || []);
      setLoadError(false);
    } catch {
      // background refresh fail ho toh user ko disturb mat karo
    }
  }

  function startNewWorkspaceItem() {
    if (workspaceKind === "resume") navigate("/resume?new=1");
    else if (workspaceKind === "image") navigate("/image-generator?new=1");
    else navigate("/chat");
  }

  async function handleLogoutThis() {
    await logoutCurrentDevice();
    toast.success("Logged out from this device");
    setShowLogoutModal(false);
    navigate("/login?logout=current", { replace: true });
  }

  async function handleLogoutAll() {
    await logoutEverywhere();
    toast.success("Logged out from all devices");
    setShowLogoutModal(false);
    navigate("/login?logout=all", { replace: true });
  }

  const startRename = useCallback((chat) => { setOpenMenuId(null); setEditingId(chat.id); setEditValue(chat.title); }, []);

  const submitRename = useCallback(async (id) => {
    const newTitle = editValue.trim();
    if (!newTitle) { setEditingId(null); return; }
    let prev;
    setConversations((list) => { prev = list; return list.map((c) => (c.id === id ? { ...c, title: newTitle } : c)); });
    setEditingId(null);
    try { setBusyId(id); await renameChat(id, newTitle); notifyConversationsChanged(); }
    catch (error) { setConversations(prev); handleApiError(error); }
    finally { setBusyId(null); }
  }, [editValue]);

  const handleArchive = useCallback(async (id) => {
    setOpenMenuId(null);
    let prev;
    setConversations((list) => { prev = list; return list.filter((c) => c.id !== id); });
    try {
      setBusyId(id); await archiveChat(id); toast.success("Chat archived");
      notifyConversationsChanged();
      if (location.pathname === `/chat/${id}`) navigate("/chat");
    } catch (error) { setConversations(prev); handleApiError(error); }
    finally { setBusyId(null); }
  }, [location.pathname, navigate]);

  const handleDelete = useCallback(async (id) => {
    let prev;
    setConversations((list) => { prev = list; return list.filter((c) => c.id !== id); });
    setConfirmDeleteId(null);
    try {
      setBusyId(id); await deleteChat(id); toast.success("Chat deleted");
      notifyConversationsChanged();
      if (location.pathname === `/chat/${id}`) navigate("/chat");
    } catch (error) { setConversations(prev); handleApiError(error); }
    finally { setBusyId(null); }
  }, [location.pathname, navigate]);

  const grouped = useMemo(() => groupByDate(conversations), [conversations]);

  const isExpanded = expanded || sidebarOpen;

  // ✅ FIX — mobile aur desktop ke liye alag width. Pehle mobile bhi
  // 260px full-desktop-width leta tha jo chhoti screen pe bahut bada
  // lagta tha. Ab mobile drawer sirf 82% (max 300px) leta hai, background
  // content thoda peek hota hai — modern drawer jaisa feel.
  const mobileWidthClass = "w-[calc(100vw-46px)] max-w-[320px]";
  const desktopWidthClass = isExpanded ? "lg:w-[260px]" : "lg:w-[60px]";

  const planInfo = useMemo(() => getPlanInfo(wallet?.currentPlanName), [wallet?.currentPlanName]);

  return (
    <>
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" style={{ animation: `sbFade 180ms ${EASE}` }} />
      )}

      <aside
        className={`fixed left-0 top-0 h-[100dvh] z-50 flex flex-col ${mobileWidthClass} ${desktopWidthClass} ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{
          background: "linear-gradient(180deg,#1c1c22,#17171b)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          // ✅ PERF — sirf width/transform transition karo, aur `contain`
          // se browser ko batao ke is element ke andar ka reflow bahar
          // ke page ko touch nahi karega. Ye hi "hang jaisa" feel ka
          // sabse bada reason tha — poore page ka layout recalc ho raha
          // tha har frame pe jab sidebar collapse/expand hota tha.
          transition: `width 200ms ${EASE}, transform 220ms ${EASE}`,
          willChange: "width, transform",
          contain: "layout style paint",
        }}
      >

        {/* ─── HEADER ─── */}
        <div
          className={`flex items-center shrink-0 h-[52px] px-2 ${isExpanded ? "justify-between" : "justify-center"}`}
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="min-w-0 pl-1" style={{ animation: `sbFade 220ms ${EASE}` }}>
            <BrandLogo size="xs" showText={isExpanded} />
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg sidebar-ghost-btn"
          >
            {isExpanded ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
          </button>
          {isExpanded && (
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden flex items-center justify-center w-8 h-8 rounded-lg"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* ─── NEW CHAT ─── */}
        <div className={`shrink-0 px-2 pt-2 pb-1 ${!isExpanded ? "flex justify-center" : ""}`}>
          {isExpanded ? (
            <button
              onClick={startNewWorkspaceItem}
              className="w-full flex items-center gap-2 rounded-xl py-2.5 px-3 text-white text-[13px] font-medium sb-new-chat-btn"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #db2777 100%)", boxShadow: "0 2px 12px rgba(124,58,237,0.35), inset 0 1px 0 rgba(255,255,255,0.15)" }}
            >
              <Plus size={15} />{newItemLabel}
            </button>
          ) : (
            <Tooltip label={newItemLabel}>
              <button
                onClick={startNewWorkspaceItem}
                className="sb-new-chat-btn"
                style={{ background: "linear-gradient(145deg, #8b5cf6, #db2777)", boxShadow: "0 2px 10px rgba(124,58,237,0.4), inset 0 1px 1px rgba(255,255,255,0.25)", width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <Plus size={16} color="#fff" />
              </button>
            </Tooltip>
          )}
        </div>

        {/* ─── NAV ITEMS ─── */}
        <div className="shrink-0 px-2 pb-1 flex flex-col gap-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(`${item.path}/`));
            if (!isExpanded) {
              return (
                <Tooltip key={item.path} label={item.text}>
                  <Link to={item.path} style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: isActive ? item.bg : "transparent", margin: "0 auto", transition: `background 140ms ${EASE}` }}>
                    <Icon size={16} color={isActive ? item.color : "rgba(255,255,255,0.33)"} />
                  </Link>
                </Tooltip>
              );
            }
            return (
              <Link key={item.path} to={item.path} className="nav-row" style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 10, background: isActive ? item.bg : "transparent", textDecoration: "none" }}>
                <Icon size={14} color={isActive ? item.color : "rgba(255,255,255,0.38)"} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: isActive ? 600 : 400, color: isActive ? item.color : "rgba(255,255,255,0.5)" }}>
                  {item.text}
                </span>
                {isActive && <ChevronRight size={12} color={`${item.color}80`} style={{ marginLeft: "auto" }} />}
              </Link>
            );
          })}
        </div>

        {/* ─── DIVIDER ─── */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", margin: "4px 12px" }} className="shrink-0" />

        {/* ─── SEARCH ─── */}
        {isExpanded && workspaceKind === "chat" && (
          <div className="px-2 pt-2 pb-1 shrink-0">
            <div style={{
              display: "flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 10,
              background: searchFocused ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
              border: searchFocused ? "1px solid rgba(255,255,255,0.14)" : "1px solid rgba(255,255,255,0.06)",
              transition: `background 180ms ${EASE}, border-color 180ms ${EASE}`,
            }}>
              <Search size={12} color={searchFocused ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)"} style={{ flexShrink: 0 }} />
              <input
                value={inputValue} onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => setSearchFocused(true)} onBlur={() => setSearchFocused(false)}
                placeholder="Search conversations..."
                style={{ background: "transparent", outline: "none", border: "none", fontSize: 12.5, color: "rgba(255,255,255,0.75)", width: "100%" }}
                className="placeholder:text-white/20"
              />
              {searching && <span className="w-3 h-3 rounded-full border-2 border-white/20 border-t-white/60 animate-spin shrink-0" />}
              {!searching && inputValue && (
                <button onClick={clearSearch} style={{ lineHeight: 0 }}>
                  <X size={11} color="rgba(255,255,255,0.3)" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── CONVERSATIONS LIST ─── */}
        {isExpanded && workspaceKind === "chat" && (
          <div className="flex-1 min-h-0 overflow-y-auto pb-2 sidebar-scroll" ref={listMenuRef} style={{ padding: "4px 8px 8px" }}>
            {loading ? (
              <div className="space-y-0.5 pt-1">
                {[...Array(8)].map((_, i) => (
                  <div key={i} style={{ height: 32, borderRadius: 8, background: "rgba(255,255,255,0.035)", margin: "0 2px" }} className="animate-pulse" />
                ))}
              </div>
            ) : loadError ? (
              <div className="py-6 text-center">
                <p style={{ color: "rgba(255,255,255,0.28)", fontSize: 12.5, marginBottom: 8 }}>Couldn't load conversations</p>
                <button onClick={() => loadConversations(activeQuery)} style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <RotateCcw size={11} /> Retry
                </button>
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-8 text-center">
                <MessageSquare size={22} color="rgba(255,255,255,0.1)" style={{ margin: "0 auto 6px" }} />
                <p style={{ color: "rgba(255,255,255,0.24)", fontSize: 12.5 }}>{activeQuery ? "No results found" : "No conversations yet"}</p>
              </div>
            ) : (
              grouped.map(([label, chats]) => (
                <div key={label} className="mb-3 mt-1">
                  {!activeQuery && (
                    <p style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,0.2)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "0 8px", marginBottom: 3 }}>
                      {label}
                    </p>
                  )}
                  <div className="flex flex-col gap-px">
                    {chats.map((chat) => (
                      <ChatRow
                        key={chat.id}
                        chat={chat}
                        isActive={location.pathname === `/chat/${chat.id}`}
                        isEditing={editingId === chat.id}
                        isConfirming={confirmDeleteId === chat.id}
                        isBusy={busyId === chat.id}
                        openMenuId={openMenuId}
                        editValue={editValue}
                        onStartRename={startRename}
                        onEditChange={setEditValue}
                        onEditKeyDown={(e, id) => { if (e.key === "Enter") submitRename(id); if (e.key === "Escape") setEditingId(null); }}
                        onSubmitRename={submitRename}
                        onConfirmDelete={(id) => { setOpenMenuId(null); setConfirmDeleteId(id); }}
                        onDelete={handleDelete}
                        onCancelDelete={() => setConfirmDeleteId(null)}
                        onToggleMenu={(id) => setOpenMenuId(openMenuId === id ? null : id)}
                        onArchive={handleArchive}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {isExpanded && (workspaceKind === "resume" || workspaceKind === "image") && (
          <WorkspaceHistoryPanel kind={workspaceKind} />
        )}

        {(!isExpanded || !workspaceKind) && <div className="flex-1" />}

        {/* ─── ACCOUNT STRIP ─── */}
        <div className="shrink-0 p-2 relative" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {isExpanded ? (
            <button
              ref={accountBtnRef}
              onClick={() => setShowAccountMenu((v) => !v)}
              className="sb-account-strip"
              style={{
                width: "100%", padding: "8px 10px", borderRadius: 12,
                background: showAccountMenu ? "rgba(255,255,255,0.07)" : "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                display: "flex", alignItems: "center", gap: 10,
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
              }}
            >
              <SidebarAvatar user={user} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user?.name || "User"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <planInfo.icon size={10} color={planInfo.color} />
                  <span style={{ fontSize: 10.5, color: planInfo.color, fontWeight: 600 }}>{planInfo.label}</span>
                </div>
              </div>
              <ChevronUp size={13} color="rgba(255,255,255,0.2)" style={{ transform: showAccountMenu ? "rotate(180deg)" : "none", transition: `transform 200ms ${EASE}` }} />
            </button>
          ) : (
            <Tooltip label="Account">
              <button
                ref={accountBtnRef}
                onClick={() => setShowAccountMenu((v) => !v)}
                style={{ width: 36, height: 36, borderRadius: "50%", margin: "0 auto", display: "block", background: "transparent", border: "none", cursor: "pointer" }}
              >
                <SidebarAvatar user={user} size={36} />
              </button>
            </Tooltip>
          )}

          <AccountMenu
            open={showAccountMenu}
            anchorExpanded={isExpanded}
            anchorBtnRef={accountBtnRef}
            user={user}
            planInfo={planInfo}
            navigate={navigate}
            onClose={() => setShowAccountMenu(false)}
            onOpenPlans={() => setShowPlansModal(true)}
            onOpenLogout={() => setShowLogoutModal(true)}
          />
        </div>
      </aside>

      <LogoutModal
        open={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onLogoutThis={handleLogoutThis}
        onLogoutAll={handleLogoutAll}
      />

      <RechargeModal
        open={showPlansModal}
        reason="tokens"
        onClose={() => setShowPlansModal(false)}
        currentPlanId={wallet?.currentPlanId}
        onActivated={refreshWallet}
      />

      <style>{`
        @keyframes sbFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

        .sidebar-scroll::-webkit-scrollbar { width: 2px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 99px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.12); }
        .sidebar-scroll { -webkit-overflow-scrolling: touch; }

        .sidebar-ghost-btn { color: rgba(255,255,255,0.25); background: transparent; transition: color 140ms ${EASE}, background 140ms ${EASE}; }
        .sidebar-ghost-btn:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.05); }

        .nav-row { transition: background 140ms ${EASE}; }
        .nav-row:hover { background: rgba(255,255,255,0.05); }

        .chat-row:hover { background: rgba(255,255,255,0.04); }

        .chat-icon-btn {
          width: 24px; height: 24px; border-radius: 6px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: transparent; transition: background 140ms ${EASE};
        }
        .chat-icon-btn:hover { background: rgba(255,255,255,0.08); }

        /* ✅ Mobile pe touch targets thode bade — 24px tap karna mushkil
           hota hai, 30px+ recommended hai. */
        @media (max-width: 1023px) {
          .chat-icon-btn { width: 30px; height: 30px; }
        }

        .sb-new-chat-btn { transition: transform 140ms ${EASE}, opacity 140ms ${EASE}; }
        .sb-new-chat-btn:hover { opacity: 0.92; }
        .sb-new-chat-btn:active { transform: scale(0.97); }

        .sb-account-strip { transition: background 150ms ${EASE}; }

        .sb-menu-row { transition: background 140ms ${EASE}, color 140ms ${EASE}; }
        .sb-menu-row:hover { background: rgba(255,255,255,0.06); }

        .sb-back-btn {
          width: 24px; height: 24px; border-radius: 7px; display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.6); border: none; cursor: pointer;
          transition: background 140ms ${EASE};
        }
        .sb-back-btn:hover { background: rgba(255,255,255,0.1); }

        .sb-btn-ghost, .sb-btn-danger {
          flex: 1; padding: 11px 16px; border-radius: 11px; font-size: 13.5px; font-weight: 600;
          cursor: pointer; font-family: inherit; border: 1px solid transparent;
          transition: transform 140ms ${EASE}, background 140ms ${EASE};
        }
        .sb-btn-ghost { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.75); border-color: rgba(255,255,255,0.1); }
        .sb-btn-ghost:hover { background: rgba(255,255,255,0.1); }
        .sb-btn-danger {
          background: linear-gradient(145deg, rgba(239,68,68,0.28), rgba(239,68,68,0.14));
          color: #fca5a5; border-color: rgba(239,68,68,0.35);
          box-shadow: 0 2px 10px rgba(239,68,68,0.28);
        }
        .sb-btn-danger:hover { transform: translateY(-1px); }
        .sb-btn-ghost:active, .sb-btn-danger:active { transform: scale(0.97); }

        .sb-scope-btn {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 11px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.09);
          background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); cursor: pointer;
          font-family: inherit; transition: background 140ms ${EASE}, transform 140ms ${EASE};
        }
        .sb-scope-btn:hover:not(:disabled) { background: rgba(255,255,255,0.09); transform: translateY(-1px); }
        .sb-scope-btn.strong {
          background: linear-gradient(145deg, rgba(239,68,68,0.2), rgba(239,68,68,0.08));
          border-color: rgba(239,68,68,0.3); color: #f87171;
        }
        .sb-scope-btn.strong:hover:not(:disabled) { background: linear-gradient(145deg, rgba(239,68,68,0.28), rgba(239,68,68,0.12)); }
        .sb-scope-title { display: block; font-size: 13px; font-weight: 600; }
        .sb-scope-sub { display: block; font-size: 10.5px; opacity: 0.55; font-weight: 400; margin-top: 1px; }

        .sb-cancel-link {
          margin-top: 4px; padding: 6px; background: none; border: none;
          color: rgba(255,255,255,0.3); font-size: 12px; cursor: pointer; font-family: inherit;
        }

        .sb-spinner {
          width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
          border: 2px solid rgba(255,255,255,0.2); border-top-color: currentColor;
          animation: sbSpin 0.7s linear infinite;
        }
        @keyframes sbSpin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}

export default Sidebar;