// ─────────────────────────────────────────────────────────────────────────────
// ArtifactPanel.jsx — Claude-style side panel: Code / Preview tabs,
// live iframe preview for HTML, simple line-based syntax coloring,
// polished copy + download. Drop-in replacement for the old CodePanel.
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useMemo } from "react";
import { Code, Eye, Copy, Check, X, Download } from "lucide-react";

const LANG_COLORS = {
  javascript: "#f7df1e", js: "#f7df1e",
  typescript: "#3178c6", ts: "#3178c6",
  java:       "#ed8b00",
  python:     "#3776ab", py: "#3776ab",
  html:       "#e34f26",
  css:        "#264de4",
  bash:       "#23d18b", sh: "#23d18b",
  json:       "#00acd7",
  sql:        "#f29111",
  xml:        "#f60",
};

const EXT_MAP = {
  javascript: "js", typescript: "ts", python: "py", java: "java",
  html: "html", css: "css", bash: "sh", json: "json", sql: "sql", xml: "xml",
};

// Languages that can be rendered live in an iframe preview tab
const PREVIEWABLE = ["html", "xml"];

// ── Super-light syntax tokenizer (no external lib, zero backend load) ──────
// Colors keywords / strings / comments / numbers per-line. Good enough for
// a chat preview — not meant to replace a real highlighter like Shiki.
const KEYWORDS = new Set([
  "function","const","let","var","return","if","else","for","while","class",
  "import","export","default","new","this","extends","async","await","try",
  "catch","finally","switch","case","break","continue","public","private",
  "protected","static","void","int","String","boolean","def","print","from",
  "as","with","lambda","interface","implements","package","null","true","false",
]);

function tokenizeLine(line) {
  const tokens = [];
  let i = 0;
  while (i < line.length) {
    const rest = line.slice(i);

    // comments
    if (rest.startsWith("//") || rest.startsWith("#")) {
      tokens.push({ text: rest, color: "#6a9955" });
      break;
    }

    // strings
    const strMatch = rest.match(/^("([^"\\]|\\.)*"|'([^'\\]|\\.)*'|`([^`\\]|\\.)*`)/);
    if (strMatch) {
      tokens.push({ text: strMatch[0], color: "#ce9178" });
      i += strMatch[0].length;
      continue;
    }

    // numbers
    const numMatch = rest.match(/^\b\d+(\.\d+)?\b/);
    if (numMatch) {
      tokens.push({ text: numMatch[0], color: "#b5cea8" });
      i += numMatch[0].length;
      continue;
    }

    // word (keyword or identifier)
    const wordMatch = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (wordMatch) {
      const w = wordMatch[0];
      tokens.push({ text: w, color: KEYWORDS.has(w) ? "#c586c0" : "#d4d4d4" });
      i += w.length;
      continue;
    }

    // whitespace / punctuation / everything else, char by char until next match
    let j = i + 1;
    tokens.push({ text: line[i], color: "#858585" });
    i = j;
  }
  return tokens;
}

function HighlightedCode({ content }) {
  const lines = useMemo(() => content.split("\n"), [content]);
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} style={{ display: "flex" }}>
          <span style={{
            display: "inline-block", width: 36, flexShrink: 0,
            textAlign: "right", paddingRight: 14,
            color: "#3a3f4b", userSelect: "none", fontSize: 12,
          }}>
            {i + 1}
          </span>
          <span style={{ whiteSpace: "pre" }}>
            {tokenizeLine(line).map((tok, j) => (
              <span key={j} style={{ color: tok.color }}>{tok.text}</span>
            ))}
            {line.length === 0 && "\u00A0"}
          </span>
        </div>
      ))}
    </>
  );
}

export default function ArtifactPanel({ panel, onClose }) {
  const lang = (panel.lang || "code").toLowerCase();
  const color = LANG_COLORS[lang] || "#94a3b8";
  const canPreview = PREVIEWABLE.includes(lang);

  const [tab, setTab] = useState(canPreview ? "preview" : "code");
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(panel.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function download() {
    const ext = EXT_MAP[lang] || "txt";
    const blob = new Blob([panel.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artifact.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      background: "#0d1117",
      borderLeft: "1px solid rgba(255,255,255,0.06)",
    }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "block" }} />
          <span style={{
            fontSize: 12, fontFamily: "monospace", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.08em", color: "#cbd5e1",
          }}>
            {lang}
          </span>
        </div>

        <button
          onClick={onClose}
          style={{
            width: 28, height: 28, borderRadius: 7, border: "none",
            background: "transparent", color: "#475569", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#94a3b8"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#475569"; }}
          title="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* ── Tab bar (Claude-style pill tabs) ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        flexShrink: 0,
      }}>
        <div style={{
          display: "flex", gap: 2, padding: 3,
          background: "rgba(255,255,255,0.04)", borderRadius: 10,
        }}>
          {canPreview && (
            <button
              onClick={() => setTab("preview")}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 12px", borderRadius: 8, border: "none",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                background: tab === "preview" ? "rgba(124,58,237,0.25)" : "transparent",
                color: tab === "preview" ? "#fff" : "#64748b",
                transition: "all 0.15s",
              }}
            >
              <Eye size={12} /> Preview
            </button>
          )}
          <button
            onClick={() => setTab("code")}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "5px 12px", borderRadius: 8, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              background: tab === "code" ? "rgba(124,58,237,0.25)" : "transparent",
              color: tab === "code" ? "#fff" : "#64748b",
              transition: "all 0.15s",
            }}
          >
            <Code size={12} /> Code
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={download}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 11px",
              borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#94a3b8", fontFamily: "inherit", transition: "all 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.09)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
            title="Download file"
          >
            <Download size={12} /> Download
          </button>
          <button
            onClick={copy}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "5px 11px",
              borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: copied ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${copied ? "rgba(74,222,128,0.25)" : "rgba(255,255,255,0.08)"}`,
              color: copied ? "#4ade80" : "#94a3b8", fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      {tab === "preview" && canPreview ? (
        <div style={{ flex: 1, background: "#ffffff" }}>
          <iframe
            title="artifact-preview"
            srcDoc={panel.content}
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        </div>
      ) : (
        <pre style={{
          flex: 1, overflow: "auto", margin: 0,
          padding: "16px 8px",
          fontSize: 13, lineHeight: 1.85,
          fontFamily: "'JetBrains Mono','Fira Code',monospace",
        }}>
          <HighlightedCode content={panel.content} />
        </pre>
      )}
    </div>
  );
}