import { useState } from "react";
import { Check, ChevronLeft, Code, Copy, Download, Eye, FileText, X } from "lucide-react";

const LANG_COLORS = {
  javascript: "#f7df1e", typescript: "#3178c6", java: "#ed8b00",
  python: "#3776ab", html: "#e34f26", css: "#264de4",
  bash: "#23d18b", json: "#00acd7", sql: "#f29111",
  yaml: "#cb171e", markdown: "#94a3b8",
};

const LANG_ALIAS = { js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript", py: "python", sh: "bash", yml: "yaml", md: "markdown" };
const EXT_MAP = { javascript: "js", typescript: "ts", python: "py", java: "java", html: "html", css: "css", bash: "sh", json: "json", sql: "sql", yaml: "yml", markdown: "md" };

function downloadAsFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadSnippet(content, lang = "text") {
  const normalized = LANG_ALIAS[lang.toLowerCase()] || lang.toLowerCase();
  downloadAsFile(content, "snippet." + (EXT_MAP[normalized] || "txt"));
}

function slugify(text) {
  return (text || "response").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "response";
}

export default function ArtifactPanel({ panel, onClose, isMobile, renderDocument }) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const isDocument = panel.kind === "document";
  const [tab, setTab] = useState((panel.lang || "").toLowerCase() === "html" ? "preview" : "code");
  const color = LANG_COLORS[panel.lang?.toLowerCase()] || "#94a3b8";
  const canPreview = (panel.lang || "").toLowerCase() === "html";

  function copy() {
    navigator.clipboard.writeText(panel.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (isDocument) {
      downloadAsFile(panel.content, `${slugify(panel.title)}.md`);
    } else if (canPreview) {
      downloadAsFile(panel.content, `${slugify(panel.title || "generated-page")}.html`);
    } else {
      downloadSnippet(panel.content, panel.lang);
    }
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1600);
  }

  const containerStyle = isMobile
    ? {
        position: "fixed", left: 0, right: 0, top: 40, bottom: 0, zIndex: 1200,
        background: "#0b0f17", color: "#e5edf7",
        display: "flex", flexDirection: "column",
        overflow: "hidden", overscrollBehavior: "contain",
        animation: "slideUp 0.2s cubic-bezier(0.22,1,0.36,1)",
      }
    : {
        width: "clamp(420px, 48vw, 760px)",
        maxWidth: "calc(100vw - 52px)",
        position: "fixed", right: 0, top: 40, bottom: 0, zIndex: 1200,
        display: "flex", flexDirection: "column",
        background: "#0b0f17", color: "#e5edf7",
        borderLeft: "1px solid rgba(167,139,250,0.28)",
        boxShadow: "-18px 0 55px rgba(0,0,0,0.72)",
        overflow: "hidden", overscrollBehavior: "contain",
        animation: "slideInRight 0.18s cubic-bezier(0.22,1,0.36,1)",
      };
  return (
    <div style={containerStyle} onWheel={(e) => e.stopPropagation()}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "14px 14px 14px 8px" : "10px 14px",
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 8, minWidth: 0 }}>
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: "transparent", color: "#cbd5e1", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
              title="Back to chat"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {isDocument ? <FileText size={14} color="#64748b" style={{ flexShrink: 0 }} /> : <Code size={14} color="#64748b" style={{ flexShrink: 0 }} />}
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: isDocument || canPreview ? "#e2e8f0" : color,
            fontFamily: isDocument || canPreview ? "inherit" : "monospace",
            textTransform: isDocument || canPreview ? "none" : "uppercase",
            letterSpacing: isDocument || canPreview ? "normal" : "0.08em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {isDocument ? (panel.title || "Document") : (panel.title || panel.lang)}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {canPreview && !isDocument && (
            <div style={{ display: "flex", padding: 3, borderRadius: 9, background: "rgba(255,255,255,0.05)", marginRight: 2 }}>
              {["preview", "code"].map((item) => (
                <button
                  key={item}
                  onClick={() => setTab(item)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    padding: "4px 8px", borderRadius: 7, border: "none",
                    background: tab === item ? "rgba(124,58,237,0.28)" : "transparent",
                    color: tab === item ? "#fff" : "#64748b",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    textTransform: "capitalize",
                  }}
                >
                  {item === "preview" ? <Eye size={11} /> : <Code size={11} />}
                  <span>{item}</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={handleDownload}
            title="Download"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 7, cursor: "pointer",
              background: downloaded ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${downloaded ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)"}`,
              color: downloaded ? "#4ade80" : "#64748b", transition: "color 0.15s",
            }}
          >
            {downloaded ? <Check size={12} /> : <Download size={12} />}
          </button>
          <button
            onClick={copy}
            title="Copy"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 28, height: 28, borderRadius: 7, cursor: "pointer",
              background: copied ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${copied ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)"}`,
              color: copied ? "#4ade80" : "#64748b", transition: "color 0.15s",
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          {!isMobile && (
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 7, border: "none",
                background: "transparent", color: "#475569", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background-color 0.15s, color 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#94a3b8"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
              title="Close panel"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {isDocument ? (
        <div
          className="artifact-scroll"
          style={{
            flex: 1, overflowY: "auto", padding: "20px 22px",
            overscrollBehavior: "contain", WebkitOverflowScrolling: "touch",
          }}
        >
          {renderDocument ? renderDocument(panel.content) : panel.content}
        </div>
      ) : canPreview && tab === "preview" ? (
        <div style={{ flex: 1, background: "#fff" }}>
          <iframe
            title="artifact-preview"
            srcDoc={panel.content}
            sandbox="allow-scripts allow-forms allow-modals"
            referrerPolicy="no-referrer"
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      ) : (
        <pre
          className="artifact-scroll"
          style={{
            flex: 1, overflow: "auto", margin: 0,
            padding: "16px 16px",
            fontSize: 12.5, lineHeight: 1.7,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: "#d8dee9", background: "#070b12",
            whiteSpace: "pre",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <code>{panel.content}</code>
        </pre>
      )}
    </div>
  );
}
