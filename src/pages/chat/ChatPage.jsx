import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useOutletContext, Link } from "react-router-dom";
import {
  Send, Sparkles, Copy, Check, RotateCcw,
  Code, Lightbulb, PenLine, ArrowDown,
  Image as ImageIcon, FileText, StopCircle,
  Zap, Globe, BookOpen, AlertTriangle, X,
  Maximize2, Download, ChevronLeft, ChevronDown,
  Paperclip, Eye, EyeOff, Search,
} from "lucide-react";
import { getConversation, getModels } from "../../services/conversationService";
import { handleApiError } from "../../utils/errorHandler";
import RechargeModal from "../../components/common/recharge/RechargeModal";
import useChatStreamStore from "../../services/chatStreamStore";

// ─── Config ──────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  { icon: Lightbulb, label: "Ideas",     text: "Give me 5 profitable startup ideas for 2026" },
  { icon: Code,      label: "Code",      text: "Explain async/await in JavaScript with examples" },
  { icon: PenLine,   label: "Write",     text: "Write a professional cold email for a freelancer" },
  { icon: Globe,     label: "Explain",   text: "Explain how the internet works in simple terms" },
  { icon: BookOpen,  label: "Summarize", text: "What are the key principles of clean code?" },
  { icon: Zap,       label: "Quick",     text: "What's the difference between REST and GraphQL?" },
];

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
  markdown: "#94a3b8", md: "#94a3b8",
};

const LANG_ALIAS = {
  js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
  py: "python", sh: "bash", yml: "yaml", md: "markdown",
};

const EXT_MAP = {
  javascript: "js", typescript: "ts", python: "py", java: "java",
  html: "html", css: "css", bash: "sh", json: "json", sql: "sql", yaml: "yml",
  markdown: "md",
};

const SELECTED_MODEL_STORAGE_KEY = "cf_selected_model";

// ─── Persistent caching (instant reload, fewer API calls) ─────────────────
// IMPORTANT: uses localStorage, not sessionStorage. sessionStorage is
// per-tab, so a hard refresh in a *new* tab (or one the browser discarded
// and reopened) would always show nothing until the DB fetch finished —
// that's the "kabhi kabhi refresh ke baad db se fetch hone ke baad hi
// dikhta hai" bug. localStorage is shared across tabs/reloads, so the
// cached copy paints instantly every time.
const MODELS_CACHE_KEY = "cf_models_cache_v1";
const CONV_CACHE_PREFIX = "cf_conv_cache_v2:";
const CONV_INDEX_KEY = "cf_conv_cache_index_v2";
const MAX_CACHED_CONVERSATIONS = 30;
let modelsFetchedThisSession = false;

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function writeCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full/unavailable — ignore */ }
}
function loadCachedModels() { return readCache(MODELS_CACHE_KEY); }
function saveCachedModels(list) { writeCache(MODELS_CACHE_KEY, list); }
function loadCachedConversation(id) { return id ? readCache(CONV_CACHE_PREFIX + id) : null; }

// Keeps the cache bounded — remembers only the most recently touched
// conversations so localStorage never grows unbounded.
function touchConvIndex(id) {
  try {
    const idx = JSON.parse(localStorage.getItem(CONV_INDEX_KEY) || "[]");
    const next = [id, ...idx.filter((x) => x !== id)].slice(0, MAX_CACHED_CONVERSATIONS);
    localStorage.setItem(CONV_INDEX_KEY, JSON.stringify(next));
    idx.filter((x) => !next.includes(x)).forEach((x) => {
      try { localStorage.removeItem(CONV_CACHE_PREFIX + x); } catch { /* ignore */ }
    });
  } catch { /* ignore */ }
}
function saveCachedConversation(id, messages) {
  if (!id) return;
  writeCache(CONV_CACHE_PREFIX + id, messages);
  touchConvIndex(id);
}

// ─── Lightweight syntax highlighter (no external deps) ─────────────────────
const KEYWORDS = {
  javascript: ["const","let","var","function","return","if","else","for","while","do","class","extends","import","export","default","from","new","this","async","await","try","catch","finally","throw","typeof","instanceof","switch","case","break","continue","null","undefined","true","false","of","in","yield","static","get","set","super"],
  typescript: ["const","let","var","function","return","if","else","for","while","do","class","extends","implements","import","export","default","from","new","this","async","await","try","catch","finally","throw","typeof","instanceof","switch","case","break","continue","null","undefined","true","false","of","in","yield","static","get","set","interface","type","public","private","protected","readonly","enum","as","namespace","super"],
  python: ["def","return","if","elif","else","for","while","class","import","from","as","try","except","finally","with","lambda","None","True","False","yield","pass","break","continue","global","nonlocal","raise","is","not","in","and","or","async","await","self"],
  java: ["public","private","protected","class","interface","extends","implements","static","final","void","new","return","if","else","for","while","do","try","catch","finally","throw","throws","import","package","this","super","null","true","false","int","long","double","float","boolean","char","enum","abstract","synchronized"],
  bash: ["if","then","else","fi","for","do","done","while","echo","export","function","return","case","esac","in"],
  sql: ["select","from","where","insert","into","values","update","set","delete","create","table","join","left","right","inner","on","group","by","order","having","as","and","or","not","null","primary","key","foreign","references","drop","alter","limit"],
  yaml: [],
  html: [],
  css: [],
  json: [],
  markdown: [],
};

const TOKEN_COLORS = {
  keyword: "#ff7ab6",
  string: "#a3e635",
  comment: "#6b7280",
  number: "#fbbf24",
  type: "#67e8f9",
  function: "#60a5fa",
  identifier: "#e2e8f0",
  punct: "#9ca3af",
  plain: "#cbd5e1",
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
  const lines = useMemo(() => code.split("\n"), [code]);
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

// ─── Mobile detection hook ──────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

// ─── Parse markdown into blocks ──────────────────────────────────────────
function parseContent(raw) {
  const blocks = [];
  const lines  = raw.split("\n");
  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trimStart();

    const dataHref = lines[i].match(/<a\s+[^>]*href=["'](data:text\/html[^"']+)["'][^>]*>(.*?)<\/a>/i);
    if (dataHref) {
      try {
        const comma = dataHref[1].indexOf(",");
        const encoded = comma >= 0 ? dataHref[1].slice(comma + 1) : "";
        blocks.push({
          type: "artifact",
          lang: "html",
          content: decodeURIComponent(encoded),
          label: dataHref[2]?.replace(/<[^>]+>/g, "").trim() || "",
        });
      } catch {
        blocks.push({ type: "text", content: lines[i] });
      }
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const lang = lines[i].trim().slice(3).trim() || "code";
      const code = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ type: "code", lang, content: code.join("\n") });
      continue;
    }

    if (trimmed.includes("|") && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      const headerCells = trimmed.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trimStart().includes("|") && lines[i].trim() !== "") {
        const rowCells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
        rows.push(rowCells);
        i++;
      }
      blocks.push({ type: "table", header: headerCells, rows });
      continue;
    }

    const line = lines[i];
    if (line.startsWith("> ")) blocks.push({ type: "quote", content: line.slice(2) });
    else if (line.startsWith("### ")) blocks.push({ type: "h3", content: line.slice(4) });
    else if (line.startsWith("## ")) blocks.push({ type: "h2", content: line.slice(3) });
    else if (line.startsWith("# "))  blocks.push({ type: "h1", content: line.slice(2) });
    else if (line.startsWith("- ") || line.startsWith("* ")) blocks.push({ type: "li", content: line.slice(2) });
    else if (/^\d+\. /.test(line)) blocks.push({ type: "oli", content: line.replace(/^\d+\. /, "") });
    else blocks.push({ type: "text", content: line });
    i++;
  }
  return blocks;
}

// ─── Inline text (bold / inline-code) ────────────────────────────────────
function InlineText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**"))
          return <strong key={i} className="text-white/90 font-semibold">{p.slice(2, -2)}</strong>;
        if (p.startsWith("`") && p.endsWith("`"))
          return (
            <code key={i} style={{
              padding: "1px 6px", borderRadius: 5,
              background: "rgba(139,92,246,0.15)",
              color: "#c4b5fd", fontSize: "0.82em",
              fontFamily: "'JetBrains Mono',monospace",
              border: "1px solid rgba(139,92,246,0.2)",
            }}>
              {p.slice(1, -1)}
            </code>
          );
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function downloadAsFile(content, filename) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function downloadSnippet(content, lang) {
  const ext = EXT_MAP[(LANG_ALIAS[lang.toLowerCase()] || lang.toLowerCase())] || "txt";
  downloadAsFile(content, `snippet.${ext}`);
}

function slugify(text) {
  return (text || "response")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "response";
}

// ─── Code Block (inline, inside a chat message) ──────────────────────────
function CodeBlock({ lang, content, onOpenPanel }) {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const color = LANG_COLORS[lang.toLowerCase()] || "#94a3b8";

  function copy() {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    downloadSnippet(content, lang);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1600);
  }

  return (
    <div style={{
      borderRadius: 12, overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.07)",
      background: "#0d1117", margin: "8px 0",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "7px 14px",
        background: "rgba(255,255,255,0.035)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 5 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,95,87,0.7)", display: "block" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(255,189,46,0.7)", display: "block" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "rgba(40,201,64,0.7)", display: "block" }} />
          </div>
          <span style={{
            fontSize: 10.5, fontFamily: "monospace", fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.1em", color,
          }}>{lang}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {onOpenPanel && (
            <button
              onClick={() => onOpenPanel({ lang, content })}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 6,
                background: "rgba(139,92,246,0.12)",
                border: "1px solid rgba(139,92,246,0.22)",
                color: "#a78bfa", fontSize: 11, cursor: "pointer",
                fontFamily: "inherit", transition: "background-color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.22)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(139,92,246,0.12)"}
              title="Open in side panel"
            >
              <Maximize2 size={10} />
              <span>Open</span>
            </button>
          )}

          <button
            onClick={handleDownload}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 9px", borderRadius: 6,
              background: downloaded ? "rgba(74,222,128,0.12)" : "transparent",
              border: `1px solid ${downloaded ? "rgba(74,222,128,0.28)" : "rgba(255,255,255,0.08)"}`,
              color: downloaded ? "#4ade80" : "#64748b", fontSize: 11,
              cursor: "pointer", fontFamily: "inherit", transition: "background-color 0.15s, color 0.15s",
            }}
            onMouseEnter={e => { if (!downloaded) { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; } }}
            onMouseLeave={e => { if (!downloaded) { e.currentTarget.style.color = "#64748b"; e.currentTarget.style.background = "transparent"; } }}
            title="Download file"
          >
            {downloaded ? <Check size={11} /> : <Download size={11} />}
          </button>

          <button
            onClick={copy}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "3px 10px", borderRadius: 6,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: copied ? "#4ade80" : "#64748b", fontSize: 11,
              cursor: "pointer", fontFamily: "inherit", transition: "background-color 0.15s, color 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = copied ? "#4ade80" : "#64748b"; e.currentTarget.style.background = "transparent"; }}
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            <span>{copied ? "Copied!" : "Copy"}</span>
          </button>
        </div>
      </div>

      <pre style={{
        overflow: "auto", padding: "16px 18px",
        margin: 0, fontSize: 12.5,
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        lineHeight: 1.7,
        maxHeight: 420,
      }}>
        <code><HighlightedCode code={content} lang={lang} /></code>
      </pre>
    </div>
  );
}

function ArtifactCard({ artifact, onOpenPanel }) {
  return (
    <div style={{
      margin: "10px 0", borderRadius: 14, overflow: "hidden",
      border: "1px solid rgba(139,92,246,0.22)",
      background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(15,23,42,0.92))",
      boxShadow: "0 12px 38px rgba(0,0,0,0.35)",
    }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#c4b5fd", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            <Code size={14} /> HTML artifact
          </div>
          <p style={{ margin: "7px 0 0", color: "#e2e8f0", fontSize: 14, fontWeight: 700 }}>{artifact.label || "Generated preview"}</p>
          <p style={{ margin: "3px 0 0", color: "#64748b", fontSize: 12 }}>Open the side panel to preview or download.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <button
            onClick={() => onOpenPanel?.({ lang: artifact.lang, content: artifact.content })}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.35)", background: "rgba(139,92,246,0.18)", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            <Eye size={13} /> Preview
          </button>
          <button
            onClick={() => downloadSnippet(artifact.content, artifact.lang)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#cbd5e1", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            <Download size={13} /> Download
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Table block ─────────────────────────────────────────────────────────
function TableBlock({ header, rows }) {
  return (
    <div style={{ overflowX: "auto", margin: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "rgba(124,58,237,0.12)" }}>
            {header.map((h, i) => (
              <th key={i} style={{ textAlign: "left", padding: "8px 12px", color: "#c4b5fd", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>
                <InlineText text={h} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "8px 12px", color: "#cbd5e1", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <InlineText text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Rendered Message ────────────────────────────────────────────────────
function RenderedMessage({ content, onOpenPanel }) {
  const blocks = useMemo(() => parseContent(content), [content]);
  let listBuffer = [];
  let listType = null;

  const flushList = (key) => {
    if (!listBuffer.length) return null;
    const items = listBuffer;
    const type = listType;
    listBuffer = [];
    listType = null;

    if (type === "oli") {
      return (
        <ol key={key} style={{ margin: "6px 0", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 3 }}>
          {items.map((t, i) => (
            <li key={i} style={{ fontSize: 15, color: "#d3dbe8", lineHeight: 1.8 }}>
              <InlineText text={t} />
            </li>
          ))}
        </ol>
      );
    }
    return (
      <ul key={key} style={{ margin: "6px 0", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 3 }}>
        {items.map((t, i) => (
          <li key={i} style={{ fontSize: 14.5, color: "#cbd5e1", lineHeight: 1.8 }}>
            <InlineText text={t} />
          </li>
        ))}
      </ul>
    );
  };

  const rendered = [];
  blocks.forEach((b, i) => {
    const isListItem = b.type === "li" || b.type === "oli";
    const typeChanged = isListItem && listType && listType !== b.type;

    if ((!isListItem || typeChanged) && listBuffer.length) {
      rendered.push(flushList(`list-${i}`));
    }

    if (b.type === "artifact") {
      rendered.push(<ArtifactCard key={i} artifact={b} onOpenPanel={onOpenPanel} />);
    } else if (b.type === "code") {
      rendered.push(<CodeBlock key={i} lang={b.lang} content={b.content} onOpenPanel={onOpenPanel} />);
    } else if (b.type === "table") {
      rendered.push(<TableBlock key={i} header={b.header} rows={b.rows} />);
    } else if (b.type === "quote") {
      rendered.push(
        <div key={i} style={{
          borderLeft: "3px solid #a78bfa", paddingLeft: 12, margin: "6px 0",
          color: "#94a3b8", fontStyle: "italic", fontSize: 14,
        }}>
          <InlineText text={b.content} />
        </div>
      );
    } else if (b.type === "h1") {
      rendered.push(<h1 key={i} style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: "14px 0 6px" }}><InlineText text={b.content} /></h1>);
    } else if (b.type === "h2") {
      rendered.push(<h2 key={i} style={{ fontSize: 17, fontWeight: 700, color: "#f1f5f9", margin: "12px 0 5px" }}><InlineText text={b.content} /></h2>);
    } else if (b.type === "h3") {
      rendered.push(<h3 key={i} style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", margin: "10px 0 4px", textTransform: "uppercase", letterSpacing: "0.04em" }}><InlineText text={b.content} /></h3>);
    } else if (isListItem) {
      listType = b.type;
      listBuffer.push(b.content);
    } else if (!b.content.trim()) {
      rendered.push(<div key={i} style={{ height: 6 }} />);
    } else {
      rendered.push(
        <p key={i} style={{ fontSize: 15.3, lineHeight: 1.85, color: "#d3dbe8", margin: "3px 0", wordBreak: "break-word" }}>
          <InlineText text={b.content} />
        </p>
      );
    }
  });

  if (listBuffer.length) rendered.push(flushList("list-end"));
  return <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>{rendered}</div>;
}

// ─── Copy / action buttons (message level) ────────────────────────────────
function ActionBtn({ icon: Icon, doneIcon: DoneIcon, label, doneLabel, onClick, done }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 11, color: done ? "#4ade80" : "#475569",
        background: "none", border: "none", cursor: "pointer",
        padding: "3px 8px", borderRadius: 6, fontFamily: "inherit",
        transition: "color 0.15s",
      }}
      onMouseEnter={e => { if (!done) e.currentTarget.style.color = "#94a3b8"; }}
      onMouseLeave={e => { if (!done) e.currentTarget.style.color = "#475569"; }}
    >
      {done && DoneIcon ? <DoneIcon size={11} /> : <Icon size={11} />}
      <span>{done ? doneLabel : label}</span>
    </button>
  );
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <ActionBtn
      icon={Copy} doneIcon={Check}
      label="Copy" doneLabel="Copied"
      done={copied}
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
    />
  );
}

// ─── Thought Trail (Claude-style "thinking" / reasoning steps) ───────────
// Renders whatever step labels the backend streams via the `thought` SSE
// event (see chatStreamStore.js -> streamsById[key].thoughts). Collapsible,
// auto-scrolls to the newest step while open + still streaming.
function ThoughtTrail({ thoughts, streaming }) {
  const [open, setOpen] = useState(true);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (open && streaming && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [thoughts, open, streaming]);

  if (!thoughts || thoughts.length === 0) return null;

  return (
    <div style={{
      margin: "0 0 10px", borderRadius: 12, overflow: "hidden",
      border: "1px solid rgba(167,139,250,0.2)",
      background: "rgba(124,58,237,0.06)",
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "9px 13px", background: "transparent", border: "none", cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 700, color: "#a78bfa" }}>
          <Search size={12} style={{ animation: streaming ? "pulse 1.6s infinite" : "none" }} />
          {streaming ? "Thinking" : "Thought process"}
          <span style={{ fontSize: 10.5, fontWeight: 600, color: "#7c6aa8" }}>({thoughts.length})</span>
        </span>
        <ChevronDown size={13} color="#7c6aa8" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
      </button>
      {open && (
        <div
          ref={bodyRef}
          style={{
            maxHeight: 150, overflowY: "auto",
            padding: "0 14px 11px",
            display: "flex", flexDirection: "column", gap: 6,
            overscrollBehavior: "contain",
          }}
        >
          {thoughts.map((th, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#a78bfa", marginTop: 7, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.65 }}>{th}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Message Row ──────────────────────────────────────────────────────────
const LONG_DOC_THRESHOLD = 1400;

function MessageRow({ role, content, image, isStreaming = false, onOpenPanel }) {
  const [hovered, setHovered] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const isUser = role === "USER" || role === "user";

  const plainLength = useMemo(
    () => (content || "").replace(/```[\s\S]*?```/g, "").length,
    [content]
  );
  const isLongDoc = !isUser && !isStreaming && plainLength > LONG_DOC_THRESHOLD;

  if (isUser) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, maxWidth: "min(80%, 560px)" }}>
          {image && (
            <img src={image} alt="attached" style={{
              maxWidth: 220, maxHeight: 220, borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.12)", objectFit: "cover",
            }} />
          )}
          {content && (
            <div style={{
              padding: "13px 18px",
              borderRadius: "20px 20px 5px 20px",
              background: "linear-gradient(135deg,rgba(124,58,237,0.85),rgba(219,39,119,0.75))",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "#fff", fontSize: 15.3, lineHeight: 1.75,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              boxShadow: "0 4px 20px rgba(124,58,237,0.2)",
            }}>
              {content}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: "flex", gap: 12 }}
    >
      <div style={{
        width: 38, height: 38,
        borderRadius: 13, flexShrink: 0, marginTop: 2,
        background: "linear-gradient(135deg,#7c3aed,#db2777)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 4px 16px rgba(124,58,237,0.45)",
        transition: "transform 0.15s ease",
      }}>
        <Sparkles size={17} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0, transition: "opacity 0.12s ease-out" }}>
        <RenderedMessage content={content} onOpenPanel={onOpenPanel} />

        {isStreaming && (
          <span style={{
            display: "inline-block", width: 2, height: "1.1em",
            background: "#a78bfa", marginLeft: 3,
            verticalAlign: "text-bottom", borderRadius: 2,
            animation: "cursorBlink 0.75s ease-in-out infinite",
          }} />
        )}

        {!isStreaming && content && (
          <div style={{ marginTop: 6, marginLeft: -6, display: "flex", alignItems: "center", gap: 2, opacity: hovered ? 1 : 0, transition: "opacity 0.2s" }}>
            <CopyBtn text={content} />
            {isLongDoc && (
              <>
                <span style={{ width: 1, height: 12, background: "rgba(255,255,255,0.08)" }} />
                <ActionBtn
                  icon={Maximize2}
                  label="Open"
                  onClick={() => onOpenPanel?.({ kind: "document", lang: "markdown", content, title: (content.split("\n").find(l => l.trim()) || "Response").replace(/^#+\s*/, "").slice(0, 64) })}
                />
                <ActionBtn
                  icon={Download} doneIcon={Check}
                  label="Download" doneLabel="Saved"
                  done={downloaded}
                  onClick={() => {
                    const title = (content.split("\n").find(l => l.trim()) || "response").replace(/^#+\s*/, "");
                    downloadAsFile(content, `${slugify(title)}.md`);
                    setDownloaded(true);
                    setTimeout(() => setDownloaded(false), 1600);
                  }}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Live Status Row ───────────────────────────────────────────────────
function ThinkingRow({ label = "thinking" }) {
  const isGenerating = label === "generating";
  const displayText = isGenerating ? "Writing…" : "Thinking…";
  const Icon = isGenerating ? PenLine : Search;

  return (
    <div style={{ display: "flex", gap: 12 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 13, flexShrink: 0,
        background: "linear-gradient(135deg,#7c3aed,#db2777)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Sparkles size={17} color="#fff" style={{ animation: "pulse 1.5s infinite" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 8 }}>
        <Icon size={12} color="#a78bfa" style={{ animation: isGenerating ? "none" : "pulse 1.6s infinite" }} />
        <span style={{ fontSize: 13, color: "#94a3b8", fontWeight: 500 }}>{displayText}</span>
        <div style={{ display: "flex", gap: 5 }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "rgba(167,139,250,0.6)", display: "block",
              animation: "thinkDot 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.22}s`,
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Model Auto-Switch Toast ──────────────────────────────────────────────
function ModelSwitchToast({ message }) {
  if (!message) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: "10px 14px", borderRadius: 12,
      background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.25)",
      fontSize: 12.5, color: "#93c5fd",
      animation: "fadeUp 0.2s ease-out",
    }}>
      <Zap size={14} color="#60a5fa" style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}

// ─── Error Banner (English) ────────────────────────────────────────────────
const BANNER_CFG = {
  GROQ_BUSY:  { icon: AlertTriangle, iconColor: "#fbbf24", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", title: "🤖 The AI is a bit busy",  desc: "The service is under high load right now. Please wait a moment and try again.", cta: null },
  RATE_LIMIT: { icon: AlertTriangle, iconColor: "#fbbf24", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", title: "🐢 Slow down a little",     desc: "You're sending messages too quickly. Please wait a few seconds.",              cta: null },
  NO_TOKENS:  { icon: Zap,           iconColor: "#f87171", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",  title: "🪙 You're out of tokens",   desc: "You've used all your available tokens. Recharge to keep chatting.",            cta: "Recharge Now" },
  GENERAL:    { icon: AlertTriangle, iconColor: "#f87171", bg: "rgba(239,68,68,0.08)",  border: "rgba(239,68,68,0.2)",  title: "⚠️ Something went wrong",   desc: "Please try sending your message again.",                                        cta: null },
};

function ErrorBanner({ type, onRecharge, onDismiss }) {
  const c = BANNER_CFG[type] || BANNER_CFG.GENERAL;
  const Icon = c.icon;
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding: "12px 16px", borderRadius: 14,
      background: c.bg, border: `1px solid ${c.border}`,
      animation: "fadeUp 0.2s ease-out",
    }}>
      <Icon size={15} color={c.iconColor} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>{c.title}</p>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>{c.desc}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        {c.cta && (
          <button
            onClick={onRecharge}
            style={{
              padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: "linear-gradient(135deg,#7c3aed,#db2777)",
              color: "#fff", border: "none", cursor: "pointer",
              boxShadow: "0 2px 10px rgba(124,58,237,0.3)",
            }}
          >
            {c.cta}
          </button>
        )}
        <button
          onClick={onDismiss}
          style={{
            width: 28, height: 28, borderRadius: 8, border: "none",
            background: "transparent", color: "#475569", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Empty / Welcome State ─────────────────────────────────────────────────
function EmptyState({ onSuggest }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", minHeight: "55vh",
      padding: "0 16px 16px", textAlign: "center", userSelect: "none",
    }}>
      <div style={{ position: "relative", marginBottom: 28 }}>
        <div style={{
          width: 68, height: 68, borderRadius: 22,
          background: "linear-gradient(135deg,#7c3aed,#db2777)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 40px rgba(124,58,237,0.5)",
        }}>
          <Sparkles size={30} color="#fff" />
        </div>
        <div style={{
          position: "absolute", inset: -8, borderRadius: 28,
          background: "rgba(124,58,237,0.15)", filter: "blur(20px)", zIndex: -1,
        }} />
      </div>

      <h2 style={{ fontSize: 34, fontWeight: 800, color: "#fff", margin: "0 0 10px", letterSpacing: "-0.02em" }}>
        What can I help with? ✨
      </h2>
      <p style={{ color: "#475569", fontSize: 14, margin: "0 0 36px", maxWidth: 280, lineHeight: 1.6 }}>
        Ask me anything — code, writing, ideas, or explanations.
      </p>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
        gap: 10, width: "100%", maxWidth: 500,
      }}
        className="sm:grid-cols-3"
      >
        {SUGGESTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <button
              key={i}
              onClick={() => onSuggest(s.text)}
              style={{
                textAlign: "left", padding: "14px",
                borderRadius: 14, cursor: "pointer",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                fontFamily: "inherit", transition: "background-color 0.15s, border-color 0.15s, transform 0.15s",
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 7,
                  background: "rgba(124,58,237,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <Icon size={12} color="#a78bfa" />
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {s.label}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12, color: "#475569", lineHeight: 1.6,
                overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
              }}>
                {s.text}
              </p>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 36, fontSize: 11.5, color: "#334155" }}>
        <span>Also try:</span>
        <Link to="/image-generator" style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569", textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
          onMouseLeave={e => e.currentTarget.style.color = "#475569"}
        >
          <ImageIcon size={11} /> Image AI
        </Link>
        <Link to="/pdf-ai" style={{ display: "flex", alignItems: "center", gap: 5, color: "#475569", textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
          onMouseLeave={e => e.currentTarget.style.color = "#475569"}
        >
          <FileText size={11} /> PDF AI
        </Link>
      </div>
    </div>
  );
}

// ─── Model Selector (Claude-style — lives inside the composer) ──────────
const DEFAULT_VISIBLE = 6;

function hueFromString(str = "") {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function shortLabel(label = "", max = 16) {
  const words = label.trim().split(/\s+/);
  const short = words.slice(0, 2).join(" ");
  return short.length > max ? short.slice(0, max - 1) + "…" : short;
}

function ModelAvatar({ label, size = 26 }) {
  const hue = hueFromString(label);
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.32, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: `linear-gradient(135deg, hsl(${hue},75%,58%), hsl(${(hue + 40) % 360},75%,48%))`,
      color: "#fff", fontSize: size * 0.42, fontWeight: 800,
      boxShadow: `0 3px 10px hsla(${hue},70%,45%,0.35)`,
    }}>
      {label?.[0]?.toUpperCase() || "A"}
    </div>
  );
}

function ModelRow({ m, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(m.id)}
      style={{
        width: "100%", textAlign: "left", padding: "8px 9px",
        borderRadius: 10, border: "none", cursor: "pointer",
        background: active ? "rgba(124,58,237,0.16)" : "transparent",
        display: "flex", alignItems: "center", gap: 9,
        fontFamily: "inherit", transition: "background-color 0.12s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <ModelAvatar label={m.label} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: active ? "#c4b5fd" : "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {m.label}
          </span>
          {m.vision ? (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9.5, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.1)", padding: "1px 6px", borderRadius: 6, flexShrink: 0 }}>
              <Eye size={9} /> VISION
            </span>
          ) : (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9.5, fontWeight: 700, color: "#64748b", background: "rgba(100,116,139,0.1)", padding: "1px 6px", borderRadius: 6, flexShrink: 0 }}>
              <EyeOff size={9} /> TEXT
            </span>
          )}
          {active && <Check size={13} color="#a78bfa" style={{ flexShrink: 0 }} />}
        </div>
        {m.description && (
          <span style={{ fontSize: 10.5, color: "#64748b", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.description}</span>
        )}
      </div>
    </button>
  );
}

function ModelSelector({ models, selectedId, onSelect, disabled, compact }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef(null);
  const current = models.find(m => m.id === selectedId) || models[0];

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => { if (!open) setExpanded(false); }, [open]);

  if (!models.length) return null;

  const hasMore = models.length > DEFAULT_VISIBLE;
  const visibleModels = expanded ? models : models.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = models.length - DEFAULT_VISIBLE;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: compact ? "5px 8px 5px 5px" : "5px 10px 5px 6px",
          borderRadius: 99,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#cbd5e1", fontSize: 12, fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          transition: "border-color 0.15s, background-color 0.15s",
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!disabled) e.currentTarget.style.borderColor = "rgba(167,139,250,0.5)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
        title={current?.label}
      >
        <ModelAvatar label={current?.label} size={18} />
        <span style={{ fontWeight: 700, maxWidth: compact ? 70 : 96, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {shortLabel(current?.label, compact ? 10 : 16)}
        </span>
        <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s", flexShrink: 0 }} />
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: 0,
          width: 320,
          maxHeight: "min(420px, 65vh)",
          display: "flex", flexDirection: "column",
          background: "#12161f",
          border: "1px solid rgba(255,255,255,0.14)",
          borderRadius: 16, padding: 8, zIndex: 999,
          boxShadow: "0 20px 55px rgba(0,0,0,0.6)",
          animation: "fadeUp 0.12s ease-out",
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "4px 6px 8px", color: "#64748b", fontSize: 10.5,
            fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em",
            borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 6,
            flexShrink: 0,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Sparkles size={11} color="#a78bfa" /> Choose model</span>
            <span>{models.length} total</span>
          </div>

          <div
            className="model-scroll-list"
            style={{
              overflowY: "auto",
              paddingRight: 3,
              display: "flex",
              flexDirection: "column",
              gap: 1,
              overscrollBehavior: "contain",
              minHeight: 0,
            }}
          >
            {visibleModels.map(m => (
              <ModelRow key={m.id} m={m} active={m.id === selectedId} onSelect={(id) => { onSelect(id); setOpen(false); }} />
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  width: "100%", marginTop: 4, padding: "8px 9px",
                  borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                  background: "rgba(139,92,246,0.1)",
                  border: "1px dashed rgba(139,92,246,0.32)",
                  color: "#a78bfa", fontSize: 12, fontWeight: 700,
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.18)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(139,92,246,0.1)"}
              >
                <ChevronDown size={13} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                {expanded ? "Show less" : `More models · ${hiddenCount} more`}
              </button>
            )}
          </div>

          <p style={{ margin: "8px 2px 0", fontSize: 10, color: "#334155", textAlign: "center", flexShrink: 0 }}>
            Your choice is remembered for next time
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Artifact Panel (code / html / long-document side panel) ─────────────
function ArtifactPanel({ panel, onClose, isMobile }) {
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
    } else {
      downloadSnippet(panel.content, panel.lang);
    }
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1600);
  }

  const containerStyle = isMobile
    ? {
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000,
        background: "#0d1117",
        display: "flex", flexDirection: "column",
        contain: "strict",
        overscrollBehavior: "contain",
        animation: "slideUp 0.2s cubic-bezier(0.22,1,0.36,1)",
      }
    : {
        width: "clamp(440px, 42vw, 780px)",
        flexShrink: 0,
        height: "100%", position: "relative", zIndex: 10,
        display: "flex", flexDirection: "column",
        background: "#0d1117",
        borderLeft: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "-8px 0 40px rgba(0,0,0,0.45)",
        overflow: "hidden",
        contain: "strict",
        overscrollBehavior: "contain",
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
            color: isDocument ? "#e2e8f0" : color,
            fontFamily: isDocument ? "inherit" : "monospace",
            textTransform: isDocument ? "none" : "uppercase",
            letterSpacing: isDocument ? "normal" : "0.08em",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {isDocument ? (panel.title || "Document") : panel.lang}
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
                    padding: "4px 8px", borderRadius: 7, border: "none",
                    background: tab === item ? "rgba(124,58,237,0.28)" : "transparent",
                    color: tab === item ? "#fff" : "#64748b",
                    fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                    textTransform: "capitalize",
                  }}
                >
                  {item}
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
          <RenderedMessage content={panel.content} />
        </div>
      ) : canPreview && tab === "preview" ? (
        <div style={{ flex: 1, background: "#fff" }}>
          <iframe
            title="artifact-preview"
            srcDoc={panel.content}
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
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
            fontFamily: "'JetBrains Mono','Fira Code',monospace",
            whiteSpace: "pre",
            overscrollBehavior: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <code><HighlightedCode code={panel.content} lang={panel.lang} /></code>
        </pre>
      )}
    </div>
  );
}

// ─── Main ChatPage ─────────────────────────────────────────────────────────
export default function ChatPage() {
  const { id }        = useParams();
  const navigate       = useNavigate();
  const { setWallet } = useOutletContext() || {};
  const isMobile = useIsMobile();

  const [messages,       setMessages]       = useState([]);
  const [input,          setInput]          = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError,   setHistoryError]   = useState(false);
  const [showScrollBtn,  setShowScrollBtn]  = useState(false);
  const [errorBanner,    setErrorBanner]    = useState(null);
  const [rechargeOpen,   setRechargeOpen]   = useState(false);
  const [codePanel,      setCodePanel]      = useState(null);

  // ── Models: instant from cache, then silently revalidate once/session ──
  const [models, setModels] = useState(() => loadCachedModels() || []);
  const [selectedModelId, setSelectedModelId] = useState(
    () => localStorage.getItem(SELECTED_MODEL_STORAGE_KEY) || ""
  );
  const currentModel = models.find(m => m.id === selectedModelId) || models[0];
  const modelSupportsVision = !!currentModel?.vision;

  const [attachedImage, setAttachedImage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (modelsFetchedThisSession) return;
    modelsFetchedThisSession = true;
    getModels()
      .then((list) => {
        if (!list) return;
        setModels(list);
        saveCachedModels(list);
        setSelectedModelId((prev) => {
          if (prev && list.some(m => m.id === prev)) return prev;
          return list[0]?.id || "";
        });
      })
      .catch(() => { modelsFetchedThisSession = false; }); // allow retry next mount on failure
  }, []);

  useEffect(() => {
    if (selectedModelId) localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModelId);
  }, [selectedModelId]);

  useEffect(() => {
    if (!modelSupportsVision && attachedImage) setAttachedImage(null);
  }, [modelSupportsVision]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const [tempKey] = useState(() => "new-" + Date.now());
  const [activeKey, setActiveKey] = useState(() => id || tempKey);
  const skipActiveKeySyncRef = useRef(false);
  const streamKey = activeKey;

  useEffect(() => {
    if (skipActiveKeySyncRef.current) {
      skipActiveKeySyncRef.current = false;
      return;
    }
    setActiveKey(id || tempKey);
  }, [id, tempKey]);

  const startStream = useChatStreamStore(s => s.startStream);
  const stopStreamFn = useChatStreamStore(s => s.stopStream);
  const clearStream  = useChatStreamStore(s => s.clearStream);
  const liveStream   = useChatStreamStore(s => s.streamsById[streamKey]);

  const scrollRef    = useRef(null);
  const sentinelRef  = useRef(null);
  const textareaRef  = useRef(null);
  const skipLoadRef  = useRef(false);
  const isAtBottomRef = useRef(true);
  const committedRef = useRef(new Set());

  const isStreamingHere = !!liveStream && !liveStream.done;
  const isWaiting        = !!liveStream && liveStream.waiting && !liveStream.text;
  const isBusy            = isStreamingHere || isWaiting;
  const showEmptyState   = !loadingHistory && !historyError && messages.length === 0 && !liveStream;

  // ── Scroll handling ──────────────────────────────────────────────────
  // Only ever auto-scroll to the bottom when the user is ALREADY at (or
  // very near) the bottom. The moment the user scrolls up even slightly —
  // via mouse wheel, trackpad, or touch — we stop forcing them back down.
  // The `wheel` listener below reacts instantly (no throttling) so an
  // upward scroll intent is respected immediately, before the throttled
  // `scroll` handler even runs.
  const NEAR_BOTTOM_PX = 120;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let ticking = false;
    function compute() {
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
      isAtBottomRef.current = atBottom;
      setShowScrollBtn(!atBottom);
      ticking = false;
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(compute); }
    }
    function onWheel(e) {
      if (e.deltaY < 0) {
        isAtBottomRef.current = false;
        setShowScrollBtn(true);
      }
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: true });
    compute();
    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
    };
  }, [loadingHistory]);

  // ── History load: cache-first (instant), then revalidate in background ──
  useEffect(() => {
    if (skipLoadRef.current) { skipLoadRef.current = false; return; }
    if (!id) { setMessages([]); setHistoryError(false); return; }
    loadHistory(id);
  }, [id]);

  // Direct scrollTop write on the chat container ONLY — never
  // scrollIntoView(). scrollIntoView walks up every scrollable ancestor
  // and can end up scrolling the whole page along with the inner panel,
  // which is what read as "poora screen hilna / niche jaata rehta hai".
  // Writing scrollTop on a single element is also far cheaper (no forced
  // layout of ancestors), which matters a lot during streaming when this
  // can fire many times per second.
  const rafRef = useRef(null);
  useEffect(() => {
    if (!isAtBottomRef.current) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [liveStream?.text, liveStream?.thoughts, messages.length]);

  useEffect(() => {
    if (!liveStream || !liveStream.done) return;
    if (committedRef.current.has(streamKey)) return;
    committedRef.current.add(streamKey);

    if (liveStream.text) {
      setMessages(prev => {
        const next = [...prev, { role: "ASSISTANT", content: liveStream.text }];
        saveCachedConversation(id, next);
        return next;
      });
    }
    if (liveStream.donePayload && setWallet && liveStream.donePayload.remainingTokens != null) {
      setWallet(prev => ({ ...prev, remainingTokens: liveStream.donePayload.remainingTokens }));
    }
    if (liveStream.donePayload?.tokensExhausted) {
      setRechargeOpen(true);
    }
    const t2 = setTimeout(() => {
      clearStream(streamKey);
      setActiveKey(id || tempKey);
    }, 50);
    return () => clearTimeout(t2);
  }, [liveStream, streamKey, setWallet, clearStream, id, tempKey]);

  // An "error" event arriving AFTER real text has already streamed in
  // (e.g. a late, non-fatal hiccup during the server's final save step)
  // should NOT surface the generic "something went wrong" banner — the
  // answer is already complete and correct on screen. Token-exhaustion
  // always surfaces since it needs action from the user.
  useEffect(() => {
    if (!liveStream?.error) return;
    const code = liveStream.error.code;
    const hasText = !!liveStream.text;

    if (code === "NO_TOKENS") {
      setErrorBanner(code);
      setRechargeOpen(true);
      return;
    }
    if (hasText) return; // answer already delivered — don't flag it as an error
    if (code === "RATE_LIMIT" || code === "GROQ_BUSY") setErrorBanner(code);
    else setErrorBanner("GENERAL");
  }, [liveStream?.error, liveStream?.text]);

  // ── Safety net: stall watchdog ────────────────────────────────────────
  // FIX (root cause of "bina refresh ke response nahi dikhta"): the backend
  // saves the assistant message to the DB the moment it finishes generating
  // — that's WHY a manual refresh always shows it. But if the SSE
  // connection itself glitches for any reason before the browser receives
  // the "done" event, the frontend has no way of knowing the answer is
  // actually ready, and sits there "waiting" forever. This watchdog: if a
  // stream goes quiet (no chunk/thought/status update) for STALL_TIMEOUT_MS,
  // silently re-fetches the conversation from the server in the background.
  // If the DB already has the finished answer, it appears immediately —
  // no refresh needed.
  const STALL_TIMEOUT_MS = 25000;

  const reconcileStalledStream = useCallback(async (key) => {
    if (!id) return;
    try {
      const data = await getConversation(id);
      const msgs = data?.messages || [];
      let grew = false;
      setMessages((prev) => {
        if (msgs.length > prev.length) { grew = true; return msgs; }
        return prev;
      });
      if (grew) {
        saveCachedConversation(id, msgs);
        committedRef.current.add(key);
        clearStream(key);
        setActiveKey(id || tempKey);
      }
    } catch {
      /* server unreachable — just wait for the next stall check */
    }
  }, [id, tempKey, clearStream]);

  useEffect(() => {
    if (!liveStream || liveStream.done) return;
    const timer = setTimeout(() => {
      reconcileStalledStream(streamKey);
    }, STALL_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [liveStream, streamKey, reconcileStalledStream]);

  // ── Safety net: resync when the tab regains focus ───────────────────────
  // Claude-style behavior: if something finished while this tab was in the
  // background (or the device was asleep), catch up silently instead of
  // making the user hit refresh.
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible" || !id || isBusy) return;
      getConversation(id)
        .then((data) => {
          const msgs = data?.messages || [];
          setMessages((prev) => (msgs.length !== prev.length ? msgs : prev));
          if (msgs.length) saveCachedConversation(id, msgs);
        })
        .catch(() => {});
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [id, isBusy]);

  function scrollToBottom(smooth = true) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }

  function scrollToBottomInstant() {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }

  async function loadHistory(conversationId) {
    const cached = loadCachedConversation(conversationId);
    if (cached && cached.length) {
      setMessages(cached);
      setHistoryError(false);
      isAtBottomRef.current = true;
      setTimeout(scrollToBottomInstant, 20);
    } else {
      setLoadingHistory(true);
      setHistoryError(false);
    }

    try {
      const data = await getConversation(conversationId);
      const msgs = data?.messages || [];
      setMessages(msgs);
      saveCachedConversation(conversationId, msgs);
      if (!cached) {
        isAtBottomRef.current = true;
        setTimeout(scrollToBottomInstant, 60);
      }
    } catch (e) {
      if (!cached) { setHistoryError(true); handleApiError(e); }
    } finally {
      setLoadingHistory(false);
    }
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }

  // ── Send ──────────────────────────────────────────────────────────────
  const handleSend = useCallback((textOverride) => {
    const text = (textOverride ?? input).trim();
    if ((!text && !attachedImage) || isBusy) return;

    setErrorBanner(null);
    setMessages(prev => [...prev, { role: "USER", content: text, image: attachedImage || undefined }]);
    setInput("");
    const imageToSend = attachedImage;
    setAttachedImage(null);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    isAtBottomRef.current = true;
    setTimeout(scrollToBottom, 30);

    const key = id || tempKey;
    setActiveKey(key);

    startStream({
      tempKey: key,
      conversationId: id || null,
      message: text,
      model: selectedModelId || undefined,
      image: modelSupportsVision ? imageToSend : undefined,
      onMeta: (meta) => {
        if (meta.isNew && meta.conversationId) {
          skipLoadRef.current = true;
          skipActiveKeySyncRef.current = true;
          setActiveKey(meta.conversationId);
          navigate(`/chat/${meta.conversationId}`, { replace: true });
        }
      },
      onError: () => {},
    });
  }, [id, input, isBusy, tempKey, startStream, navigate, attachedImage, selectedModelId, modelSupportsVision]);

  function handleStop() {
    stopStreamFn(streamKey);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ── Layout ────────────────────────────────────────────────────────────
  const CONTENT_MAX_WIDTH = "min(880px, 95vw)";

  return (
    <div style={{
      display: "flex", height: "calc(100dvh - 52px)",
      background: "#050810", overflow: "hidden",
      margin: "-24px", position: "relative",
      overscrollBehavior: "none",
    }}>
      <style>{`
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes thinkDot {
          0%,80%,100%{transform:scale(0.6);opacity:0.3}
          40%{transform:scale(1);opacity:1}
        }
        @keyframes msgIn { from{opacity:0;transform:translateY(10px) scale(0.985)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .chat-scroll-area {
          overflow-anchor: none;
          scroll-behavior: auto;
          overscroll-behavior: contain;
          contain: layout paint;
          -webkit-overflow-scrolling: touch;
        }
        .chat-scroll-area * { will-change: auto; }
        .msg-block { animation: msgIn 0.28s cubic-bezier(0.16,1,0.3,1); }
        .model-scroll-list::-webkit-scrollbar { width: 7px; }
        .model-scroll-list::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); border-radius: 999px; }
        .model-scroll-list::-webkit-scrollbar-thumb { background: rgba(167,139,250,0.38); border-radius: 999px; }
        .model-scroll-list::-webkit-scrollbar-thumb:hover { background: rgba(167,139,250,0.62); }
        .artifact-scroll { overscroll-behavior: contain; }
        .artifact-scroll::-webkit-scrollbar { width: 8px; }
        .artifact-scroll::-webkit-scrollbar-track { background: transparent; }
        .artifact-scroll::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.25); border-radius: 999px; }
      `}</style>

      {/* ── CHAT COLUMN ────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        minWidth: 0, position: "relative", height: "100%",
        overflow: "hidden",
      }}>

        <div ref={scrollRef} className="chat-scroll-area" style={{ flex: "1 1 auto", overflowY: "auto", minHeight: 0 }}>
          <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: "0 auto", padding: isMobile ? "18px 12px 20px" : "32px 20px 24px" }}>

            {loadingHistory && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                {[["75%","right"],["60%","left"],["65%","right"],["50%","left"]].map(([w, side], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: side === "right" ? "flex-end" : "flex-start", gap: 12 }}>
                    {side === "left" && <div style={{ width: 34, height: 34, borderRadius: 11, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />}
                    <div style={{ height: 44, borderRadius: 12, background: "rgba(255,255,255,0.04)", width: w, animation: "pulse 1.5s infinite" }} />
                  </div>
                ))}
              </div>
            )}

            {!loadingHistory && historyError && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center" }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                  <RotateCcw size={20} color="#f87171" />
                </div>
                <p style={{ color: "#64748b", fontSize: 14, marginBottom: 16 }}>Couldn't load this conversation</p>
                <button
                  onClick={() => loadHistory(id)}
                  style={{ padding: "8px 18px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}
                >
                  Try again
                </button>
              </div>
            )}

            {!loadingHistory && !historyError && showEmptyState && (
              <EmptyState onSuggest={t2 => handleSend(t2)} />
            )}

            {!loadingHistory && !historyError && (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {messages.map((msg, i) => (
                  <div key={i} className="msg-block">
                    <MessageRow
                      role={msg.role}
                      content={msg.content}
                      image={msg.image}
                      onOpenPanel={setCodePanel}
                    />
                  </div>
                ))}

                {liveStream?.thoughts?.length > 0 && !committedRef.current.has(streamKey) && (
                  <div className="msg-block" style={{ marginLeft: 46 }}>
                    <ThoughtTrail thoughts={liveStream.thoughts} streaming={!liveStream.done} />
                  </div>
                )}

                {liveStream && liveStream.text && !committedRef.current.has(streamKey) && (
                  <div className="msg-block">
                    <MessageRow
                      role="ASSISTANT"
                      content={liveStream.text}
                      isStreaming={!liveStream.done}
                      onOpenPanel={setCodePanel}
                    />
                  </div>
                )}

                {liveStream?.modelSwitchNotice && (
                  <div className="msg-block">
                    <ModelSwitchToast message={liveStream.modelSwitchNotice} />
                  </div>
                )}

                {isWaiting && (
                  <div className="msg-block">
                    <ThinkingRow label={liveStream?.statusLabel} />
                  </div>
                )}

                {errorBanner && (
                  <ErrorBanner
                    type={errorBanner}
                    onRecharge={() => setRechargeOpen(true)}
                    onDismiss={() => setErrorBanner(null)}
                  />
                )}
              </div>
            )}

            <div ref={sentinelRef} style={{ height: 1 }} />
          </div>
        </div>

        {showScrollBtn && !showEmptyState && (
          <div style={{
            position: "absolute", bottom: 84, left: "50%", transform: "translateX(-50%)",
            zIndex: 20, animation: "fadeUp 0.15s ease-out",
          }}>
            <button
              onClick={() => { isAtBottomRef.current = true; scrollToBottom(); }}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                padding: "7px 14px", borderRadius: 99,
                background: "rgba(15,18,30,0.97)",
                border: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
                fontSize: 12, color: "#94a3b8", cursor: "pointer",
                fontFamily: "inherit", backdropFilter: "blur(12px)",
                transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#fff"}
              onMouseLeave={e => e.currentTarget.style.color = "#94a3b8"}
            >
              <ArrowDown size={13} />
              <span style={{ fontWeight: 500 }}>Latest</span>
            </button>
          </div>
        )}

        {/* ── COMPOSER ──────────────────────────────────────────────────── */}
        <div style={{
          flexShrink: 0,
          borderTop: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(5,8,16,0.97)",
          backdropFilter: "blur(20px)",
          padding: isMobile ? "10px 10px 14px" : "14px 20px 16px",
        }}>
          <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: "0 auto" }}>

            {attachedImage && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ position: "relative" }}>
                  <img src={attachedImage} alt="preview" style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(255,255,255,0.12)" }} />
                  <button
                    onClick={() => setAttachedImage(null)}
                    style={{
                      position: "absolute", top: -6, right: -6,
                      width: 18, height: 18, borderRadius: "50%",
                      background: "#1e293b", border: "1px solid rgba(255,255,255,0.15)",
                      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer", padding: 0,
                    }}
                  >
                    <X size={11} />
                  </button>
                </div>
                <span style={{ fontSize: 11, color: "#64748b" }}>Image attached — {currentModel?.label || "the model"} will read it</span>
              </div>
            )}

            <div style={{
              display: "flex", alignItems: "flex-end", gap: 9,
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.09)",
              borderRadius: 22, padding: isMobile ? "9px 9px" : "11px 12px",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease",
            }}
              onFocusCapture={e => {
                e.currentTarget.style.borderColor = "rgba(124,58,237,0.5)";
                e.currentTarget.style.boxShadow   = "0 0 0 3px rgba(124,58,237,0.1)";
              }}
              onBlurCapture={e => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow   = "none";
              }}
            >
              <ModelSelector
                models={models}
                selectedId={selectedModelId}
                onSelect={setSelectedModelId}
                disabled={isBusy}
                compact={isMobile}
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePickImage}
                style={{ display: "none" }}
              />
              <button
                onClick={() => modelSupportsVision && fileInputRef.current?.click()}
                disabled={!modelSupportsVision || isBusy}
                title={modelSupportsVision ? "Attach an image" : "Selected model doesn't support images — pick a Vision model"}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, borderRadius: 10, flexShrink: 0,
                  background: "transparent",
                  border: "none",
                  color: modelSupportsVision ? "#94a3b8" : "#334155",
                  cursor: modelSupportsVision ? "pointer" : "not-allowed",
                  fontFamily: "inherit",
                }}
              >
                <Paperclip size={15} />
              </button>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => { setInput(e.target.value); autoResize(); }}
                onKeyDown={handleKeyDown}
                placeholder="Message CareerForge AI…"
                rows={1}
                style={{
                  flex: 1, background: "transparent", outline: "none", border: "none",
                  fontSize: 15.3, color: "#fff", resize: "none", padding: "7px 3px",
                  maxHeight: 180, fontFamily: "inherit", lineHeight: 1.75, minWidth: 0,
                }}
                className="placeholder:text-slate-600"
              />

              {isBusy ? (
                <button
                  onClick={handleStop}
                  style={{
                    width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(255,255,255,0.07)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    color: "#cbd5e1", cursor: "pointer",
                    transition: "background-color 0.15s ease",
                  }}
                  title="Stop generating"
                >
                  <StopCircle size={17} />
                </button>
              ) : (
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() && !attachedImage}
                  style={{
                    width: 40, height: 40, borderRadius: 13, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: (input.trim() || attachedImage)
                      ? "linear-gradient(135deg,#7c3aed,#db2777)"
                      : "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    color: (input.trim() || attachedImage) ? "#fff" : "#334155",
                    cursor: (input.trim() || attachedImage) ? "pointer" : "not-allowed",
                    boxShadow: (input.trim() || attachedImage) ? "0 6px 20px rgba(124,58,237,0.35)" : "none",
                    transition: "background-color 0.2s ease, box-shadow 0.2s ease, transform 0.1s ease",
                  }}
                  title="Send (Enter)"
                >
                  <Send size={15} style={{ transform: "translateX(1px) translateY(-1px)" }} />
                </button>
              )}
            </div>

            {!isMobile && (
              <p style={{ textAlign: "center", fontSize: 11, color: "#1e293b", marginTop: 8, userSelect: "none" }}>
                {modelSupportsVision ? "Text + Image supported" : "Text only · switch to a Vision model to attach images"} ·{" "}
                <Link to="/image-generator" style={{ color: "#334155", textDecoration: "underline" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
                  onMouseLeave={e => e.currentTarget.style.color = "#334155"}
                >Image AI</Link>
                {" "}· PDFs in{" "}
                <Link to="/pdf-ai" style={{ color: "#334155", textDecoration: "underline" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#a78bfa"}
                  onMouseLeave={e => e.currentTarget.style.color = "#334155"}
                >PDF AI</Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── ARTIFACT / CODE / DOCUMENT PANEL ─────────────────────────────── */}
      {codePanel && (
        <ArtifactPanel
          panel={codePanel}
          onClose={() => setCodePanel(null)}
          isMobile={isMobile}
        />
      )}

      <RechargeModal
        open={rechargeOpen}
        reason="tokens"
        onClose={() => setRechargeOpen(false)}
      />
    </div>
  );
}