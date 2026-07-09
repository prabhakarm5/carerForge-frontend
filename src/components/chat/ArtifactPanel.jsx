import { useState } from "react";
import {
  Check, Copy, Download, X, ChevronLeft, Code2, Eye, FileCode,
} from "lucide-react";

// ─── Shared language → accent color map (kept in sync with ChatPage) ─────
const LANG_COLORS = {
  javascript: "#f7df1e", js: "#f7df1e",
  typescript: "#3178c6", ts: "#3178c6",
  jsx: "#61dafb", tsx: "#61dafb",
  java:       "#ed8b00",
  python:     "#3776ab", py: "#3776ab",
  html:       "#e34f26",
  css:        "#264de4",
  bash:       "#23d18b", sh: "#23d18b",
  json:       "#00acd7",
  sql:        "#f29111",
  xml:        "#f60",
  yaml: "#cb171e", yml: "#cb171e",
};

const EXT_MAP = {
  javascript: "js", typescript: "ts", python: "py", java: "java",
  html: "html", css: "css", bash: "sh", json: "json", sql: "sql", yaml: "yml",
};

const LANG_ALIAS = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", sh: "bash", yml: "yaml",
};

export function downloadSnippet(content, lang) {
  const ext = EXT_MAP[(LANG_ALIAS[lang.toLowerCase()] || lang.toLowerCase())] || "txt";
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `snippet.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Minimal syntax highlighter (same tokenizer used inline in chat) ────
const KEYWORDS = {
  javascript: ["const","let","var","function","return","if","else","for","while","do","class","extends","import","export","default","from","new","this","async","await","try","catch","finally","throw","typeof","instanceof","switch","case","break","continue","null","undefined","true","false","of","in","yield","static","get","set","super"],
  typescript: ["const","let","var","function","return","if","else","for","while","do","class","extends","implements","import","export","default","from","new","this","async","await","try","catch","finally","throw","typeof","instanceof","switch","case","break","continue","null","undefined","true","false","of","in","yield","static","get","set","interface","type","public","private","protected","readonly","enum","as","namespace","super"],
  python: ["def","return","if","elif","else","for","while","class","import","from","as","try","except","finally","with","lambda","None","True","False","yield","pass","break","continue","global","nonlocal","raise","is","not","in","and","or","async","await","self"],
  java: ["public","private","protected","class","interface","extends","implements","static","final","void","new","return","if","else","for","while","do","try","catch","finally","throw","throws","import","package","this","super","null","true","false","int","long","double","float","boolean","char","enum","abstract","synchronized"],
  bash: ["if","then","else","fi","for","do","done","while","echo","export","function","return","case","esac","in"],
  sql: ["select","from","where","insert","into","values","update","set","delete","create","table","join","left","right","inner","on","group","by","order","having","as","and","or","not","null","primary","key","foreign","references","drop","alter","limit"],
  yaml: [], html: [], css: [], json: [],
};

const TOKEN_COLORS = {
  keyword: "#ff7ab6", string: "#a3e635", comment: "#6b7280",
  number: "#fbbf24", type: "#67e8f9", function: "#60a5fa",
  identifier: "#e2e8f0", punct: "#9ca3af", plain: "#cbd5e1",
};

function tokenizeLine(line, lang) {
  const norm = LANG_ALIAS[lang] || lang;
  const keywords = new Set(KEYWORDS[norm] || []);
  const isHashComment = ["python", "bash", "yaml"].includes(norm);
  const tokens = [];
  const re = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\/\/.*|#.*)|(\b\d+\.?\d*\b)|([A-Za-z_$][A-Za-z0-9_$]*)|([{}()[\].,;:+\-*/%=<>!&|^~?]+)|(\s+)/g;
  let m;
  let last = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) tokens.push({ text: line.slice(last, m.index), type: "plain" });
    last = re.lastIndex;
    if (m[1]) {
      tokens.push({ text: m[1], type: "string" });
    } else if (m[2]) {
      const isComment = isHashComment ? m[2].startsWith("#") : m[2].startsWith("//");
      tokens.push({ text: m[2], type: isComment ? "comment" : "punct" });
    } else if (m[3]) {
      tokens.push({ text: m[3], type: "number" });
    } else if (m[4]) {
      const word = m[4];
      const after = line.slice(re.lastIndex).trimStart();
      if (keywords.has(word) || (norm === "sql" && keywords.has(word.toLowerCase()))) {
        tokens.push({ text: word, type: "keyword" });
      } else if (after.startsWith("(")) {
        tokens.push({ text: word, type: "function" });
      } else if (/^[A-Z]/.test(word)) {
        tokens.push({ text: word, type: "type" });
      } else {
        tokens.push({ text: word, type: "identifier" });
      }
    } else if (m[5]) {
      tokens.push({ text: m[5], type: "punct" });
    } else if (m[6]) {
      tokens.push({ text: m[6], type: "plain" });
    }
  }
  if (last < line.length) tokens.push({ text: line.slice(last), type: "plain" });
  return tokens;
}

function HighlightedCode({ code, lang }) {
  const lines = code.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <div key={i} style={{ minHeight: "1.6em" }}>
          {line.length === 0
            ? "\u00A0"
            : tokenizeLine(line, lang.toLowerCase()).map((t, j) => (
                <span key={j} style={{
                  color: TOKEN_COLORS[t.type] || TOKEN_COLORS.plain,
                  fontStyle: t.type === "comment" ? "italic" : "normal",
                }}>{t.text}</span>
              ))}
        </div>
      ))}
    </>
  );
}

// ─── ArtifactPanel ────────────────────────────────────────────────────────
// Claude-style compact side panel for previewing/copying/downloading a
// code block or HTML artifact.
//
// IMPORTANT (perf/shake fix): this panel does NOT measure anything with
// JS (no ResizeObserver, no width state). It sizes itself purely with
// CSS (`min(400px, 36vw)`), and uses `contain: layout paint style` so
// whatever happens inside it (iframe loading, scroll, tab switch) can
// NEVER leak out and force the chat column (or the rest of the page) to
// re-layout / re-render. That isolation is what makes the two columns
// slide independently instead of the whole screen shaking together.
//
// Props:
//   panel:    { lang: string, content: string }
//   onClose:  () => void
//   isMobile: boolean
export default function ArtifactPanel({ panel, onClose, isMobile }) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [tab, setTab] = useState((panel.lang || "").toLowerCase() === "html" ? "preview" : "code");

  const color = LANG_COLORS[panel.lang?.toLowerCase()] || "#94a3b8";
  const canPreview = (panel.lang || "").toLowerCase() === "html";

  function copy() {
    navigator.clipboard.writeText(panel.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleDownload() {
    downloadSnippet(panel.content, panel.lang);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1600);
  }

  const containerStyle = isMobile
    ? {
        position: "fixed", inset: 0, zIndex: 1000,
        background: "#0d1117",
        display: "flex", flexDirection: "column",
        contain: "layout paint style",
        animation: "artifactSlideUp 0.22s cubic-bezier(0.22,1,0.36,1)",
      }
    : {
        width: "min(400px, 36vw)", minWidth: 300, flexShrink: 0,
        height: "100%", position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column",
        background: "#0d1117",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        // isolates this panel's internal layout/paint from the chat
        // column and the page — the root cause of the "screen hilna"
        // bug was a lack of containment plus an unused ResizeObserver
        // upstream forcing whole-page re-renders on every pixel change.
        contain: "layout paint style",
        animation: "artifactSlideIn 0.2s cubic-bezier(0.22,1,0.36,1)",
      };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes artifactSlideIn { from { opacity:0; transform: translateX(12px); } to { opacity:1; transform: translateX(0); } }
        @keyframes artifactSlideUp { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: isMobile ? "12px 12px 12px 6px" : "12px 14px",
        background: "rgba(255,255,255,0.03)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 4 : 10, minWidth: 0 }}>
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

          <div style={{
            width: 26, height: 26, borderRadius: 8, flexShrink: 0,
            background: `${color}1a`, border: `1px solid ${color}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <FileCode size={13} color={color} />
          </div>

          <span style={{
            fontSize: 12, fontWeight: 700,
            color: "#e2e8f0",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {panel.lang}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {canPreview && (
            <div style={{ display: "flex", padding: 3, borderRadius: 9, background: "rgba(255,255,255,0.05)", marginRight: 2 }}>
              {[
                { key: "preview", icon: Eye },
                { key: "code", icon: Code2 },
              ].map(({ key, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "4px 9px", borderRadius: 7, border: "none",
                    background: tab === key ? "rgba(124,58,237,0.28)" : "transparent",
                    color: tab === key ? "#fff" : "#64748b",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    textTransform: "capitalize", transition: "background-color 0.12s, color 0.12s",
                  }}
                >
                  <Icon size={11} />
                  {key}
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
              color: downloaded ? "#4ade80" : "#64748b", transition: "color 0.15s, background-color 0.15s",
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
              color: copied ? "#4ade80" : "#64748b", transition: "color 0.15s, background-color 0.15s",
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

      {/* Body */}
      {canPreview && tab === "preview" ? (
        <div style={{ flex: 1, background: "#fff" }}>
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
          padding: "16px 16px",
          fontSize: 12.5, lineHeight: 1.7,
          fontFamily: "'JetBrains Mono','Fira Code',monospace",
          whiteSpace: "pre",
          WebkitOverflowScrolling: "touch",
        }}>
          <code><HighlightedCode code={panel.content} lang={panel.lang} /></code>
        </pre>
      )}
    </div>
  );
}