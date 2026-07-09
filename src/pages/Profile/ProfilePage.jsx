import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Shield, Zap, Camera, Check, X, Edit3,
  Star, Crown, Sparkles, LogOut, Settings,
  Calendar, Activity, Award, Copy, ZoomIn, ZoomOut, RotateCcw, Move,
} from "lucide-react";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";
import { updateProfile, updateAvatar } from "../../services/userService";
import { getWallet } from "../../services/walletService";
import axiosInstance from "../../utils/axiosInstance";
import { API } from "../../config/api";

/* ─── Tokens ─────────────────────────────────────────────────────── */
const T = {
  bg:         "#08080f",
  surface:    "#0f0f1a",
  card:       "#13131f",
  border:     "rgba(255,255,255,0.06)",
  borderHi:   "rgba(255,255,255,0.12)",
  text:       "rgba(255,255,255,0.92)",
  textMut:    "rgba(255,255,255,0.48)",
  textDim:    "rgba(255,255,255,0.22)",
  accent:     "#7c3aed",
  accentLt:   "#a78bfa",
  accentGlow: "rgba(124,58,237,0.25)",
  green:      "#34d399",
  red:        "#f87171",
  gold:       "#fbbf24",
  blue:       "#818cf8",
};

const CROP_CANVAS_SIZE = 280;
const CROP_OUTPUT_SIZE = 512;

/* ─── Plan config ────────────────────────────────────────────────── */
// FIXED: label is always the REAL plan name from the wallet
// (wallet.currentPlanName), never user?.plan (which the auth store
// never populated), and it no longer silently falls back to "Free"
// for names it doesn't recognize (e.g. "Ultimate"). Keywords only
// choose the accent color/icon — the label always reflects reality.
function getPlan(planRaw) {
  const hasPlan = planRaw != null && String(planRaw).trim() !== "";
  const label = hasPlan ? String(planRaw).trim() : "Free";
  const lower = label.toLowerCase();

  if (!hasPlan || lower === "free")
    return { label: "Free", color: T.textDim, bg: "rgba(255,255,255,0.03)", border: T.border, icon: Sparkles, glow: "transparent" };
  if (lower.includes("enterprise") || lower.includes("business"))
    return { label, color: T.green, bg: "rgba(52,211,153,0.1)", border: "rgba(52,211,153,0.2)", icon: Crown, glow: "rgba(52,211,153,0.12)" };
  if (lower.includes("ultimate") || lower.includes("ultra") || lower.includes("max"))
    return { label, color: "#fb7185", bg: "rgba(251,113,133,0.1)", border: "rgba(251,113,133,0.2)", icon: Crown, glow: "rgba(251,113,133,0.12)" };
  if (lower.includes("pro") || lower.includes("premium") || lower.includes("plus"))
    return { label, color: T.gold, bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.2)", icon: Star, glow: "rgba(251,191,36,0.12)" };
  if (lower.includes("basic") || lower.includes("starter"))
    return { label, color: T.blue, bg: "rgba(129,140,248,0.1)", border: "rgba(129,140,248,0.2)", icon: Zap, glow: "rgba(129,140,248,0.12)" };
  return { label, color: T.accentLt, bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.2)", icon: Sparkles, glow: "rgba(167,139,250,0.12)" };
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

/* ─── 3D tilt wrapper — subtle perspective tilt on mouse move.
   Pure CSS transform driven straight through the ref (no re-renders
   per frame), disabled automatically under prefers-reduced-motion. ── */
function TiltCard({ children, max = 6, style = {} }) {
  const ref = useRef(null);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  function handleMove(e) {
    if (reduced.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * max * 2;
    const rotateX = (0.5 - py) * max * 2;
    ref.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
  }
  function handleLeave() {
    if (!ref.current) return;
    ref.current.style.transform = "perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)";
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{ transition: "transform 0.4s cubic-bezier(0.16,1,0.3,1)", willChange: "transform", ...style }}
    >
      {children}
    </div>
  );
}

/* ─── Card ───────────────────────────────────────────────────────── */
const Card = ({ children, style = {}, danger = false }) => (
  <div style={{
    background: T.card,
    border: `1px solid ${danger ? "rgba(248,113,113,0.15)" : T.border}`,
    borderRadius: 20,
    padding: "24px",
    boxShadow: "0 24px 48px -28px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
    ...style,
  }}>
    {children}
  </div>
);

/* ─── Spinner ────────────────────────────────────────────────────── */
const Spinner = ({ size = 16, color = T.accentLt }) => (
  <span style={{
    display: "inline-block",
    width: size, height: size, borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.15)",
    borderTopColor: color,
    animation: "spin 0.7s linear infinite",
    flexShrink: 0,
  }} />
);

/* ─── Avatar ─────────────────────────────────────────────────────── */
function Avatar({ src, name, onUpload, uploading }) {
  const [imgErr, setImgErr] = useState(false);
  const [hov,    setHov]    = useState(false);

  useEffect(() => setImgErr(false), [src]);

  const initials = name
    ? name.trim().split(/\s+/).map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div
      onClick={onUpload}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ position: "relative", cursor: "pointer", flexShrink: 0 }}
    >
      {/* Gradient ring */}
      <div style={{
        position: "absolute", inset: -3, borderRadius: "50%",
        background: `conic-gradient(${T.accent}, #db2777, ${T.accent})`,
        opacity: hov ? 1 : 0.6, transition: "opacity 0.25s", zIndex: 0,
      }} />
      <div style={{
        position: "absolute", inset: -1, borderRadius: "50%",
        background: T.bg, zIndex: 1,
      }} />

      {/* Circle — layered shadows for a raised, 3D bevel look */}
      <div style={{
        position: "relative", zIndex: 2,
        width: 88, height: 88, borderRadius: "50%",
        background: "linear-gradient(135deg,#7c3aed,#db2777)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 28, fontWeight: 800, color: "#fff",
        overflow: "hidden",
        transition: "transform 0.2s",
        transform: hov ? "scale(1.04)" : "scale(1)",
        boxShadow: "0 12px 24px -8px rgba(124,58,237,0.5), inset 0 2px 3px rgba(255,255,255,0.25), inset 0 -3px 6px rgba(0,0,0,0.25)",
      }}>
        {src && !imgErr
          ? <img
              src={src}
              alt={name}
              onError={() => setImgErr(true)}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          : initials
        }

        <div style={{
          position: "absolute", inset: 0,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
          opacity: hov ? 1 : 0, transition: "opacity 0.2s",
        }}>
          {uploading
            ? <Spinner size={18} />
            : <><Camera size={18} color="#fff" /><span style={{ fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: "0.08em" }}>CHANGE</span></>
          }
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 2, right: 2, zIndex: 3,
        width: 22, height: 22, borderRadius: "50%",
        background: "linear-gradient(135deg,#7c3aed,#db2777)",
        border: `2px solid ${T.bg}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 10px rgba(124,58,237,0.5)",
      }}>
        <Camera size={10} color="#fff" />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   AVATAR EDIT MODAL — drag to reposition, slider/scroll to zoom,
   crops to a circle preview and exports a high-res square image so
   the face shows clearly instead of whatever the raw upload cropped
   to by default.
   ══════════════════════════════════════════════════════════════════ */
function AvatarEditModal({ imgUrl, onCancel, onSave }) {
  const canvasRef = useRef(null);
  const imgElRef = useRef(null);
  const naturalRef = useRef({ w: 0, h: 0 });
  const lastPos = useRef({ x: 0, y: 0 });

  const [imgReady, setImgReady] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);

  const getScale = useCallback((z = zoom) => {
    const { w, h } = naturalRef.current;
    if (!w || !h) return 1;
    return Math.max(CROP_CANVAS_SIZE / w, CROP_CANVAS_SIZE / h) * z;
  }, [zoom]);

  const clampOffset = useCallback((off, scale) => {
    const { w, h } = naturalRef.current;
    const drawW = w * scale, drawH = h * scale;
    return {
      x: clamp(off.x, CROP_CANVAS_SIZE - drawW, 0),
      y: clamp(off.y, CROP_CANVAS_SIZE - drawH, 0),
    };
  }, []);

  const centerFor = useCallback((scale) => {
    const { w, h } = naturalRef.current;
    return { x: (CROP_CANVAS_SIZE - w * scale) / 2, y: (CROP_CANVAS_SIZE - h * scale) / 2 };
  }, []);

  // Load image
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      imgElRef.current = img;
      naturalRef.current = { w: img.naturalWidth, h: img.naturalHeight };
      const scale = Math.max(CROP_CANVAS_SIZE / img.naturalWidth, CROP_CANVAS_SIZE / img.naturalHeight);
      setOffset(centerFor(scale));
      setImgReady(true);
    };
    img.src = imgUrl;
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgUrl]);

  // Draw
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imgElRef.current) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, CROP_CANVAS_SIZE, CROP_CANVAS_SIZE);
    const scale = getScale();
    const { w, h } = naturalRef.current;
    ctx.save();
    ctx.beginPath();
    ctx.arc(CROP_CANVAS_SIZE / 2, CROP_CANVAS_SIZE / 2, CROP_CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(imgElRef.current, offset.x, offset.y, w * scale, h * scale);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(CROP_CANVAS_SIZE / 2, CROP_CANVAS_SIZE / 2, CROP_CANVAS_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.stroke();
  }, [getScale, offset]);

  useEffect(() => { if (imgReady) draw(); }, [imgReady, zoom, offset, draw]);

  // Wheel-to-zoom — attached manually (not passive) so preventDefault works
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    function handler(e) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.08 : 0.08;
      setZoom((z) => {
        const next = clamp(z + delta, 1, 3);
        const scale = getScale(next);
        setOffset((prev) => clampOffset(prev, scale));
        return next;
      });
    }
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [getScale, clampOffset]);

  function handleZoomInput(next) {
    const scale = getScale(next);
    setZoom(next);
    setOffset((prev) => clampOffset(prev, scale));
  }

  function stepZoom(delta) {
    handleZoomInput(clamp(zoom + delta, 1, 3));
  }

  function handleReset() {
    const scale = getScale(1);
    setZoom(1);
    setOffset(centerFor(scale));
  }

  function onPointerDown(e) {
    setDragging(true);
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    const scale = getScale();
    setOffset((prev) => clampOffset({ x: prev.x + dx, y: prev.y + dy }, scale));
  }
  function onPointerUp(e) {
    setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  }

  function handleSave() {
    const img = imgElRef.current;
    if (!img) return;
    setSaving(true);
    const scale = getScale();
    const ratio = CROP_OUTPUT_SIZE / CROP_CANVAS_SIZE;
    const { w, h } = naturalRef.current;

    const out = document.createElement("canvas");
    out.width = CROP_OUTPUT_SIZE;
    out.height = CROP_OUTPUT_SIZE;
    const ctx = out.getContext("2d");
    ctx.drawImage(img, offset.x * ratio, offset.y * ratio, w * scale * ratio, h * scale * ratio);

    out.toBlob((blob) => {
      setSaving(false);
      if (!blob) { toast.error("Couldn't process image"); return; }
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      onSave(file);
    }, "image/jpeg", 0.92);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ animation: "backdropIn 0.18s ease-out" }}
    >
      <div className="absolute inset-0 bg-black/85" onClick={onCancel} />

      <div
        style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: 380,
          background: "#0d0d16",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          padding: "20px 20px 22px",
          boxShadow: "0 30px 80px rgba(0,0,0,0.75)",
          animation: "modalPop 0.22s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: T.text }}>Edit photo</h3>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: T.textDim }}>Drag and zoom to frame your face</p>
          </div>
          <button
            onClick={onCancel}
            style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <X size={13} color={T.textMut} />
          </button>
        </div>

        {/* Crop viewport */}
        <div
          style={{
            width: CROP_CANVAS_SIZE, height: CROP_CANVAS_SIZE, margin: "0 auto",
            borderRadius: "50%", position: "relative", overflow: "hidden",
            background: "repeating-conic-gradient(#1a1a24 0% 25%, #15151e 0% 50%) 50% / 20px 20px",
            boxShadow: "0 0 0 3px rgba(124,58,237,0.25), 0 20px 40px -12px rgba(0,0,0,0.6)",
          }}
        >
          {!imgReady && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Spinner size={22} />
            </div>
          )}
          <canvas
            ref={canvasRef}
            width={CROP_CANVAS_SIZE}
            height={CROP_CANVAS_SIZE}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{ touchAction: "none", cursor: dragging ? "grabbing" : "grab", display: imgReady ? "block" : "none" }}
          />
        </div>

        <p style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, margin: "10px 0 4px", fontSize: 10.5, color: T.textDim }}>
          <Move size={10} /> Drag to reposition · scroll to zoom
        </p>

        {/* Zoom controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <button onClick={() => stepZoom(-0.15)} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <ZoomOut size={13} color={T.textMut} />
          </button>
          <input
            type="range" min={1} max={3} step={0.01}
            value={zoom}
            onChange={(e) => handleZoomInput(Number(e.target.value))}
            style={{ flex: 1, accentColor: T.accent }}
          />
          <button onClick={() => stepZoom(0.15)} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <ZoomIn size={13} color={T.textMut} />
          </button>
          <button onClick={handleReset} style={{ width: 28, height: 28, borderRadius: 8, border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
            <RotateCcw size={12} color={T.textMut} />
          </button>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "10px", borderRadius: 11,
              border: `1px solid ${T.border}`, background: "transparent",
              color: T.textMut, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!imgReady || saving}
            style={{
              flex: 1.4, padding: "10px", borderRadius: 11, border: "none",
              background: "linear-gradient(135deg,#7c3aed,#db2777)",
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: (!imgReady || saving) ? "not-allowed" : "pointer",
              opacity: (!imgReady || saving) ? 0.6 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              boxShadow: "0 8px 20px rgba(124,58,237,0.35)",
            }}
          >
            {saving ? <Spinner size={14} /> : <Check size={14} />} Save photo
          </button>
        </div>
      </div>

      <style>{`
        @keyframes backdropIn { from{opacity:0} to{opacity:1} }
        @keyframes modalPop { from{opacity:0;transform:scale(0.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}

/* ─── Stat card — with a subtle 3D tilt on hover ─────────────────── */
function Stat({ label, value, sub, icon: Icon, color }) {
  const ref = useRef(null);
  const reduced = useRef(
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false
  );

  function handleMove(e) {
    if (reduced.current || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 14;
    const rotateX = (0.5 - py) * 14;
    ref.current.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
    ref.current.style.borderColor = T.borderHi;
  }
  function handleLeave() {
    if (!ref.current) return;
    ref.current.style.transform = "perspective(700px) rotateX(0deg) rotateY(0deg) translateY(0)";
    ref.current.style.borderColor = T.border;
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        flex: 1, minWidth: 0,
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: "18px 16px",
        display: "flex", flexDirection: "column", gap: 10,
        transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.2s",
        willChange: "transform",
        boxShadow: "0 16px 32px -20px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 9,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -2px 4px rgba(0,0,0,0.2)`,
      }}>
        <Icon size={14} color={color} />
      </div>
      <div>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.text, letterSpacing: "-0.02em", lineHeight: 1 }}>{value}</p>
        <p style={{ margin: "4px 0 0", fontSize: 11, color: T.textMut, fontWeight: 500 }}>{label}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 10, color: T.textDim }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Info row ───────────────────────────────────────────────────── */
function Row({ label, value, icon: Icon, copyable, onAction, actionLabel }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied!");
  }

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "13px 0",
      borderBottom: `1px solid ${T.border}`,
      gap: 12,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 9, flexShrink: 0,
          background: "rgba(255,255,255,0.04)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={13} color={T.textDim} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: T.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {value || "—"}
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {copyable && value && (
          <button
            onClick={copy}
            style={iconBtn()}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
          >
            {copied ? <Check size={12} color={T.green} /> : <Copy size={12} color={T.textDim} />}
          </button>
        )}
        {onAction && (
          <button
            onClick={onAction}
            style={ghostBtn()}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.1)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.35)"; e.currentTarget.style.color = T.accentLt; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMut; }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Button helpers ─────────────────────────────────────────────── */
const iconBtn = () => ({
  width: 30, height: 30, borderRadius: 8, border: "none",
  background: "rgba(255,255,255,0.04)", cursor: "pointer",
  display: "flex", alignItems: "center", justifyContent: "center",
  transition: "background 0.15s",
});
const ghostBtn = () => ({
  padding: "5px 13px", borderRadius: 8,
  border: `1px solid ${T.border}`, background: "transparent",
  color: T.textMut, fontSize: 11.5, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
  transition: "all 0.15s",
});

/* ─── Section header ─────────────────────────────────────────────── */
function SectionHeader({ title, sub, danger }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: danger ? T.red : T.text, letterSpacing: "-0.01em" }}>
        {title}
      </h3>
      <p style={{ margin: "2px 0 0", fontSize: 11.5, color: T.textDim }}>{sub}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PROFILE PAGE
   ══════════════════════════════════════════════════════════════════ */
export default function ProfilePage() {
  const navigate        = useNavigate();
  const user            = useAuthStore(s => s.user);
  const updateUser      = useAuthStore(s => s.updateUser);
  const logoutCurrentDevice = useAuthStore(s => s.logoutCurrentDevice);
  const logoutEverywhere    = useAuthStore(s => s.logoutEverywhere);

  const fileRef = useRef(null);

  const [editingName, setEditingName] = useState(false);
  const [nameVal,     setNameVal]     = useState(user?.name || "");
  const [savingName,  setSavingName]  = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [logoutMenu,  setLogoutMenu]  = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);

  // Instant preview ke liye local image src — optimistic update
  const [localImgSrc, setLocalImgSrc] = useState(user?.profileImage || null);

  // FIXED: plan now comes from the wallet (real source of truth), not
  // the stale user?.plan field.
  const [wallet, setWallet] = useState(null);
  const plan     = useMemo(() => getPlan(wallet?.currentPlanName), [wallet?.currentPlanName]);
  const PlanIcon = plan.icon;

  // Fetched purely to answer "is this already the top plan?" so the
  // Upgrade button can lock itself once there's nowhere higher to go.
  const [plans, setPlans] = useState([]);
  const isHighestPlan = useMemo(() => {
    if (!wallet?.currentPlanId || plans.length === 0) return false;
    const current = plans.find(p => p.id === wallet.currentPlanId);
    if (!current) return false;
    const maxPrice = Math.max(...plans.map(p => Number(p.price) || 0));
    return Number(current.price) >= maxPrice;
  }, [wallet?.currentPlanId, plans]);

  // Avatar crop/edit modal state
  const [showEditor, setShowEditor] = useState(false);
  const [pendingImgUrl, setPendingImgUrl] = useState(null);

  const joinDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "short" })
    : "N/A";

  useEffect(() => setNameVal(user?.name || ""), [user?.name]);

  useEffect(() => {
    if (user?.profileImage) setLocalImgSrc(user.profileImage);
  }, [user?.profileImage]);

  useEffect(() => {
    (async () => {
      try { setWallet(await getWallet()); } catch { /* plan badge just shows Free */ }
    })();
    (async () => {
      try {
        const res = await axiosInstance.get(API.PLANS.GET_ALL);
        setPlans((res.data || []).filter(p => p.active !== false && p.active !== 0));
      } catch { /* Upgrade button just stays enabled */ }
    })();
  }, []);

  /* ── Step 1: pick a file → open the crop/edit modal (no upload yet) ── */
  const handleFileSelected = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Upload an image file"); e.target.value = ""; return; }
    if (file.size > 5 * 1024 * 1024)    { toast.error("Max size is 5 MB");     e.target.value = ""; return; }

    const url = URL.createObjectURL(file);
    setPendingImgUrl(url);
    setShowEditor(true);
    e.target.value = ""; // allow re-selecting the same file later
  }, []);

  function closeEditor() {
    if (pendingImgUrl) URL.revokeObjectURL(pendingImgUrl);
    setPendingImgUrl(null);
    setShowEditor(false);
  }

  /* ── Step 2: actually upload the cropped result ── */
  const uploadAvatarFile = useCallback(async (file) => {
    const previewUrl = URL.createObjectURL(file);
    setLocalImgSrc(previewUrl);
    setUploading(true);

    try {
      const data = await updateAvatar(file);
      const serverUrl = data?.profileImage || data?.user?.profileImage || previewUrl;
      setLocalImgSrc(serverUrl);
      updateUser({ profileImage: serverUrl });
      toast.success("Photo updated!");
    } catch {
      setLocalImgSrc(user?.profileImage || null);
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      setTimeout(() => URL.revokeObjectURL(previewUrl), 30_000);
    }
  }, [user?.profileImage, updateUser]);

  function handleEditorSave(croppedFile) {
    closeEditor();
    uploadAvatarFile(croppedFile);
  }

  /* ── Name save ── */
  const saveName = useCallback(async () => {
    const trimmed = nameVal.trim();
    if (!trimmed || trimmed === user?.name) { setEditingName(false); return; }
    setSavingName(true);
    updateUser({ name: trimmed });

    try {
      const data = await updateProfile({ name: trimmed });
      const serverName = data?.name || data?.user?.name || trimmed;
      updateUser({ name: serverName });
      toast.success("Name updated!");
    } catch {
      updateUser({ name: user?.name });
      toast.error("Failed to update name");
    } finally {
      setSavingName(false);
      setEditingName(false);
    }
  }, [nameVal, user?.name, updateUser]);

  /* ── Logout ── */
  const doLogout = useCallback(async (all) => {
    setLoggingOut(true);
    try {
      all ? await logoutEverywhere() : await logoutCurrentDevice();
      toast.success(all ? "Signed out everywhere" : "Signed out");
      navigate("/");
    } catch {
      toast.error("Logout failed");
      setLoggingOut(false);
    }
  }, [logoutEverywhere, logoutCurrentDevice, navigate]);

  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      padding: "clamp(16px,4vw,40px) clamp(12px,4vw,24px) 80px",
    }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.35); border-radius: 4px; }
        @media (max-width: 480px) {
          .profile-hero-inner { flex-direction:column !important; align-items:center !important; text-align:center !important; }
          .profile-actions    { flex-direction:row !important; flex-wrap:wrap !important; justify-content:center !important; }
          .profile-stats      { flex-direction:column !important; }
          .profile-name-row   { justify-content:center !important; }
        }
      `}</style>

      <div style={{ maxWidth: 700, margin: "0 auto", animation: "fadeUp 0.35s ease both" }}>

        {/* ── HERO ─────────────────────────────────────────────── */}
        <TiltCard max={3} style={{ marginBottom: 16 }}>
          <Card style={{ padding: "28px 24px 22px", overflow: "hidden", position: "relative" }}>
            <div style={{
              position: "absolute", top: -80, right: -80, width: 340, height: 340,
              borderRadius: "50%", pointerEvents: "none",
              background: `radial-gradient(circle, ${T.accentGlow} 0%, transparent 65%)`,
            }} />
            <div style={{
              position: "absolute", bottom: -60, left: -40, width: 200, height: 200,
              borderRadius: "50%", pointerEvents: "none",
              background: "radial-gradient(circle, rgba(219,39,119,0.06) 0%, transparent 65%)",
            }} />

            <div className="profile-hero-inner" style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 22, flexWrap: "wrap" }}>
              <Avatar
                src={localImgSrc}
                name={user?.name}
                uploading={uploading}
                onUpload={() => fileRef.current?.click()}
              />
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFileSelected} style={{ display: "none" }} />

              <div style={{ flex: 1, minWidth: 180 }}>
                <div className="profile-name-row" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
                  {editingName ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                      <input
                        autoFocus
                        value={nameVal}
                        onChange={e => setNameVal(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter")  saveName();
                          if (e.key === "Escape") { setEditingName(false); setNameVal(user?.name || ""); }
                        }}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(124,58,237,0.45)",
                          borderRadius: 10, padding: "6px 12px",
                          fontSize: "clamp(16px,3vw,20px)", fontWeight: 700, color: T.text,
                          outline: "none", fontFamily: "inherit", width: "min(200px,55vw)",
                        }}
                      />
                      <button
                        onClick={saveName}
                        disabled={savingName}
                        style={{ ...iconBtn(), background: "rgba(52,211,153,0.1)" }}
                      >
                        {savingName ? <Spinner size={14} color={T.green} /> : <Check size={13} color={T.green} />}
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setNameVal(user?.name || ""); }}
                        style={iconBtn()}
                      >
                        <X size={13} color={T.textDim} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h1 style={{ margin: 0, fontSize: "clamp(18px,4vw,23px)", fontWeight: 800, color: T.text, letterSpacing: "-0.025em" }}>
                        {user?.name || "User"}
                      </h1>
                      <button
                        onClick={() => setEditingName(true)}
                        style={{ ...iconBtn(), width: 26, height: 26 }}
                        onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
                        onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
                      >
                        <Edit3 size={11} color={T.textDim} />
                      </button>
                    </>
                  )}
                </div>

                <p style={{ margin: "0 0 14px", fontSize: 13, color: T.textMut, fontWeight: 400, wordBreak: "break-all" }}>
                  {user?.email || ""}
                </p>

                <div style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 13px 5px 9px",
                  background: plan.bg, border: `1px solid ${plan.border}`,
                  borderRadius: 99,
                  boxShadow: `0 0 18px ${plan.glow}, inset 0 1px 0 rgba(255,255,255,0.08)`,
                }}>
                  <PlanIcon size={12} color={plan.color} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: plan.color, letterSpacing: "0.04em" }}>
                    {plan.label} Plan
                  </span>
                </div>
              </div>

              <div className="profile-actions" style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <button
                  onClick={() => navigate("/settings")}
                  style={{
                    display: "flex", alignItems: "center", gap: 7,
                    padding: "8px 14px", borderRadius: 11,
                    border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.04)",
                    color: T.textMut, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.15s", whiteSpace: "nowrap",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = T.text; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = T.textMut; }}
                >
                  <Settings size={13} /> Settings
                </button>

                {isHighestPlan ? (
                  <button
                    disabled
                    title="You're already on the highest plan"
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "8px 14px", borderRadius: 11,
                      border: "1px solid rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.08)",
                      color: T.green, fontSize: 12.5, fontFamily: "inherit",
                      whiteSpace: "nowrap", cursor: "not-allowed", opacity: 0.85,
                    }}
                  >
                    <Crown size={13} /> Highest plan
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/wallet")}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "8px 14px", borderRadius: 11,
                      border: "1px solid rgba(124,58,237,0.3)", background: "rgba(124,58,237,0.09)",
                      color: T.accentLt, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.15s", whiteSpace: "nowrap",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(124,58,237,0.18)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(124,58,237,0.09)"}
                  >
                    <Zap size={13} /> Upgrade
                  </button>
                )}
              </div>
            </div>
          </Card>
        </TiltCard>

        {/* ── STATS ────────────────────────────────────────────── */}
        <div className="profile-stats" style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <Stat label="Current plan"   value={plan.label} icon={PlanIcon} color={plan.color} />
          <Stat label="Member since"   value={joinDate}   icon={Calendar} color={T.blue} />
          <Stat label="Account status" value="Active"     icon={Activity} color={T.green} sub="Good standing" />
        </div>

        {/* ── ACCOUNT DETAILS ──────────────────────────────────── */}
        <Card style={{ marginBottom: 16 }}>
          <SectionHeader title="Account Details" sub="Your personal information" />
          <Row label="Full Name"     value={user?.name}                       icon={User}    onAction={() => setEditingName(true)} actionLabel="Edit" />
          <Row label="Email Address" value={user?.email}                      icon={Mail}    copyable />
          <Row label="Role"          value={user?.role || "User"}             icon={Shield} />
          <Row label="Account ID"    value={user?.id ? String(user.id) : null} icon={Award} copyable />
          <div style={{ paddingTop: 4 }}>
            <Row label="Subscription" value={plan.label} icon={PlanIcon} onAction={() => navigate("/wallet")} actionLabel="Manage" />
          </div>
        </Card>

        {/* ── SIGN OUT ─────────────────────────────────────────── */}
        <Card danger>
          <SectionHeader title="Sign Out" sub="Choose how you want to sign out" danger />
          {!logoutMenu ? (
            <button
              onClick={() => setLogoutMenu(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 18px", borderRadius: 11,
                border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.07)",
                color: T.red, fontSize: 13, fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.14)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.07)"}
            >
              <LogOut size={14} /> Sign Out
            </button>
          ) : (
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <button
                onClick={() => doLogout(false)}
                disabled={loggingOut}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 16px", borderRadius: 11,
                  border: `1px solid ${T.border}`, background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.72)", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.09)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
              >
                {loggingOut ? <Spinner size={13} /> : <LogOut size={13} />} This device
              </button>
              <button
                onClick={() => doLogout(true)}
                disabled={loggingOut}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 16px", borderRadius: 11,
                  border: "1px solid rgba(248,113,113,0.3)", background: "rgba(248,113,113,0.1)",
                  color: T.red, fontSize: 13, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit", transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(248,113,113,0.18)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(248,113,113,0.1)"}
              >
                {loggingOut ? <Spinner size={13} color={T.red} /> : <LogOut size={13} />} All devices
              </button>
              <button
                onClick={() => setLogoutMenu(false)}
                style={{
                  padding: "10px 14px", borderRadius: 11,
                  border: `1px solid ${T.border}`, background: "transparent",
                  color: T.textDim, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHi}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
              >
                Cancel
              </button>
            </div>
          )}
        </Card>
      </div>

      {showEditor && pendingImgUrl && (
        <AvatarEditModal
          imgUrl={pendingImgUrl}
          onCancel={closeEditor}
          onSave={handleEditorSave}
        />
      )}
    </div>
  );
}