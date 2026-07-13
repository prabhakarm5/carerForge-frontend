import { useState } from "react";
import { Check, Gauge, Settings2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const optionStyle = (active) => ({
  minHeight: 36,
  padding: "0 14px",
  borderRadius: 8,
  border: active ? "1px solid rgba(34,211,238,.45)" : "1px solid rgba(255,255,255,.08)",
  background: active ? "rgba(34,211,238,.12)" : "rgba(255,255,255,.035)",
  color: active ? "#cffafe" : "#8290a7",
  fontSize: 12,
  fontWeight: 750,
  cursor: "pointer",
});

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      style={{
        width: 40,
        height: 22,
        padding: 2,
        flexShrink: 0,
        borderRadius: 99,
        border: checked ? "1px solid rgba(34,211,238,.5)" : "1px solid rgba(255,255,255,.12)",
        background: checked ? "linear-gradient(135deg,#0891b2,#7c3aed)" : "rgba(255,255,255,.07)",
        cursor: "pointer",
      }}
    >
      <span style={{
        display: "block",
        width: 16,
        height: 16,
        borderRadius: "50%",
        background: "#fff",
        transform: checked ? "translateX(18px)" : "translateX(0)",
        transition: "transform 140ms ease",
        boxShadow: "0 2px 6px rgba(0,0,0,.3)",
      }} />
    </button>
  );
}

function PreferenceRow({ icon: Icon, title, detail, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14, padding: "16px 0", borderBottom: "1px solid rgba(255,255,255,.065)" }}>
      <span style={{ width: 34, height: 34, flex: "0 0 34px", display: "grid", placeItems: "center", borderRadius: 8, background: "rgba(124,58,237,.12)", color: "#c4b5fd" }}>
        <Icon size={16} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: "#f8fafc", fontSize: 13.5, fontWeight: 750 }}>{title}</div>
        <div style={{ color: "#64748b", fontSize: 11.5, lineHeight: 1.55, marginTop: 2 }}>{detail}</div>
      </div>
      <div style={{ flexShrink: 0, maxWidth: "100%" }}>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [responseStyle, setResponseStyle] = useState(() => localStorage.getItem("cf_response_style") || "concise");
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem("cf_reduce_motion") === "1");

  function notify() {
    window.dispatchEvent(new Event("cf:settings-changed"));
  }

  function updateResponseStyle(value) {
    setResponseStyle(value);
    localStorage.setItem("cf_response_style", value);
    notify();
  }


  function updateMotion(value) {
    setReduceMotion(value);
    localStorage.setItem("cf_reduce_motion", value ? "1" : "0");
    document.documentElement.dataset.reduceMotion = value ? "true" : "false";
    notify();
  }

  function clearChatCache() {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("cf_conv_cache_")) localStorage.removeItem(key);
    }
    toast.success("Local chat cache cleared");
  }

  return (
    <section style={{ width: "100%", maxWidth: 820, margin: "0 auto", color: "#e2e8f0", padding: "8px 0 48px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0 20px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <span style={{ width: 38, height: 38, display: "grid", placeItems: "center", borderRadius: 9, background: "linear-gradient(135deg,#06b6d4,#7c3aed 58%,#ec4899)", color: "#fff" }}>
          <Settings2 size={18} />
        </span>
        <div>
          <h1 style={{ margin: 0, fontSize: 21, lineHeight: 1.2, fontWeight: 850, letterSpacing: 0 }}>Settings</h1>
          <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: 12 }}>Tune answers and chat behavior for this browser.</p>
        </div>
      </div>

      <div style={{ paddingTop: 12 }}>
        <PreferenceRow icon={Gauge} title="Answer length" detail="Concise is faster and uses fewer tokens. Balanced adds more explanation.">
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" onClick={() => updateResponseStyle("concise")} style={optionStyle(responseStyle === "concise")}>
              {responseStyle === "concise" && <Check size={12} style={{ display: "inline", marginRight: 5 }} />}
              Concise
            </button>
            <button type="button" onClick={() => updateResponseStyle("balanced")} style={optionStyle(responseStyle === "balanced")}>
              {responseStyle === "balanced" && <Check size={12} style={{ display: "inline", marginRight: 5 }} />}
              Balanced
            </button>
          </div>
        </PreferenceRow>

        <PreferenceRow icon={Gauge} title="Reduced motion" detail="Minimize animations on chat, login, and dashboard screens.">
          <Toggle checked={reduceMotion} onChange={updateMotion} label="Reduce interface motion" />
        </PreferenceRow>

        <PreferenceRow icon={Trash2} title="Local chat cache" detail="Clear browser copies only. Conversations remain safely stored on the server.">
          <button type="button" onClick={clearChatCache} style={{ ...optionStyle(false), color: "#fda4af", borderColor: "rgba(244,63,94,.2)", background: "rgba(244,63,94,.07)" }}>
            Clear
          </button>
        </PreferenceRow>
      </div>

      <div style={{ marginTop: 18, display: "flex", gap: 8, alignItems: "flex-start", color: "#64748b", fontSize: 11.5, lineHeight: 1.6 }}>
        <Check size={14} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} />
        New chat preferences apply immediately. Your existing server-side conversations are not changed.
      </div>
    </section>
  );
}
