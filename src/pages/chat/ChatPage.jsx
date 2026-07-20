import { memo, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useParams, useNavigate, useOutletContext, Link } from "react-router-dom";
import {
  Sparkles, Copy, Check, RotateCcw,
  Code, Lightbulb, PenLine, ArrowDown,
  Image as ImageIcon, FileText,
  Zap, Globe, BookOpen, AlertTriangle, X,
  Maximize2, Download, ChevronDown,
  Eye, EyeOff, LockKeyhole, ThumbsUp, ThumbsDown, Volume2,
} from "lucide-react";
import { getConversation, getConversationStatus, getModels } from "../../services/conversationService";
import { handleApiError } from "../../utils/errorHandler";
import RechargeModal from "../../components/common/recharge/RechargeModal";
import useChatStreamStore from "../../services/Chatstreamstore";
import ChatComposer from "./components/ChatComposer";
import RichInlineText from "./components/RichInlineText";
import ArtifactPanel from "./components/ArtifactPanel";
import ArtifactCard from "./components/ArtifactCard";
import { normalizeMessageMarkup, parseContent } from "./components/artifactParser";
import { notifyConversationsChanged } from "../../components/dashboard/Sidebar";
import { publishWorkspaceContext } from "../../services/workspaceEvents";
import { getWallet } from "../../services/walletService";
import { speakText } from "../../components/voice/VoiceControls";

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
  // Whole split+tokenize+JSX-build pass wrapped in ONE useMemo, so it only
  // reruns when code/lang actually change — not on every incidental
  // re-render of the parent message.
  const rendered = useMemo(() => {
    const lines = code.split("\n");
    return lines.map((line, i) => (
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
    ));
  }, [code, lang]);

  return <>{rendered}</>;
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
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

// ─── Throttle a fast-changing value (streaming text) ───────────────────
// While an answer streams, `content` grows on every SSE chunk — sometimes
// many times a second. Re-running the full markdown block-parser on the
// ENTIRE accumulated string on every single chunk is O(total length so far)
// per chunk, so over one long response the total work is O(n²). That is
// the real reason the UI hangs / scroll feels stuck while a reply is being
// generated — the main thread is busy re-parsing, it's not a CSS/scroll bug.
// This caps how often the expensive parse can re-fire (delayMs) while still
// flushing the true, final value immediately once delayMs is 0 (i.e. once
// streaming is done).
function useThrottledValue(value, delayMs) {
  const [throttled, setThrottled] = useState(value);
  const lastRef = useRef(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    clearTimeout(timeoutRef.current);
    const elapsed = Date.now() - lastRef.current;
    const wait = delayMs ? Math.max(0, delayMs - elapsed) : 0;
    timeoutRef.current = window.setTimeout(() => {
      lastRef.current = Date.now();
      setThrottled(value);
    }, wait);
    return () => clearTimeout(timeoutRef.current);
  }, [value, delayMs]);

  return throttled;
}

// ─── Inline text (bold / inline-code) ────────────────────────────────────
function InlineText({ text }) {
  return <RichInlineText text={text} />;
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

function downloadSnippet(content, lang, title = "snippet") {
  const ext = EXT_MAP[(LANG_ALIAS[lang.toLowerCase()] || lang.toLowerCase())] || "txt";
  downloadAsFile(content, `${slugify(title)}.${ext}`);
}

function slugify(text) {
  return (text || "response")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40) || "response";
}

// ─── Code Block (inline, inside a chat message) ──────────────────────────
function CodeBlock({ lang, content, onOpenPanel, isStreaming = false }) {
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
        margin: 0, fontSize: 12.5, color: "#d8dee9", background: "#0d1117",
        fontFamily: "'JetBrains Mono','Fira Code',monospace",
        lineHeight: 1.7,
        maxHeight: 420,
      }}>
        <code>{isStreaming ? content : <HighlightedCode code={content} lang={lang} />}</code>
      </pre>
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
function RenderedMessage({ content, onOpenPanel, isStreaming = false }) {
  // Streaming text stays intentionally lightweight. Parsing the whole growing answer
  // on each chunk caused long answers to freeze the chat before the final rich render.
  if (isStreaming) {
    return <div className="assistant-streaming-text">{content}</div>;
  }
  // Re-parse at most ~8x/sec while streaming; flush the exact final text
  // the instant streaming ends (delayMs becomes 0 → immediate).
  const normalizedContent = useMemo(() => normalizeMessageMarkup(content), [content]);
  const throttledContent = useThrottledValue(normalizedContent, isStreaming ? 140 : 0);
  const blocks = useMemo(() => parseContent(throttledContent, { deferDataUriDecode: isStreaming }), [isStreaming, throttledContent]);
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
      rendered.push(
        <ArtifactCard
          key={i}
          artifact={b}
          onOpenPanel={onOpenPanel}
          onDownload={downloadSnippet}
          isStreaming={isStreaming}
        />
      );
    } else if (b.type === "code") {
      rendered.push(<CodeBlock key={i} lang={b.lang} content={b.content} onOpenPanel={onOpenPanel} isStreaming={isStreaming} />);
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
  return <div className="assistant-rendered" style={{ display: "flex", flexDirection: "column", gap: 1 }}>{rendered}</div>;
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

// ─── Message Row ──────────────────────────────────────────────────────────
const LONG_DOC_THRESHOLD = 1400;
const ATTACHMENT_PATTERN = /^\[\[ATTACHMENT:([^\]]+)\]\]\n([\s\S]*?)\n\[\[\/ATTACHMENT\]\]\n?([\s\S]*)$/;

function parseTextAttachment(content = "") {
  const match = content.match(ATTACHMENT_PATTERN);
  if (!match) return null;
  return { name: match[1], fileContent: match[2], note: match[3]?.trim() || "" };
}

const MessageRow = memo(function MessageRow({ role, content, image, isStreaming = false, onOpenPanel, onRetry, retryIndex }) {
  const [downloaded, setDownloaded] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const isUser = role === "USER" || role === "user";
  const textAttachment = isUser ? parseTextAttachment(content) : null;
  const visibleUserText = textAttachment ? textAttachment.note : content;

  const plainLength = useMemo(
    () => (content || "").replace(/~~~[\s\S]*?~~~/g, "").length,
    [content]
  );
  const hasArtifact = useMemo(() => {
    if (isUser || isStreaming) return false;
    return parseContent(normalizeMessageMarkup(content)).some((block) => block.type === "artifact");
  }, [content, isStreaming, isUser]);
  const isLongDoc = !isUser && !isStreaming && !hasArtifact && plainLength > LONG_DOC_THRESHOLD;

  if (isUser) {
    return (
      <div className="user-message-row" style={{ display: "flex", justifyContent: "flex-end" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, maxWidth: "min(88%, 680px)" }}>
          {image && (
            <img src={image} alt="attached" style={{
              maxWidth: 220, maxHeight: 220, borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.12)", objectFit: "cover",
            }} />
          )}

          {textAttachment && (
            <div style={{
              minWidth: 210, maxWidth: "100%", padding: "10px 12px",
              display: "flex", alignItems: "center", gap: 10,
              borderRadius: 12, background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)", color: "#e2e8f0",
            }}>
              <span style={{ width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", background: "rgba(56,189,248,0.14)", color: "#67e8f9", flexShrink: 0 }}>
                <FileText size={16} />
              </span>
              <span style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
                <strong style={{ fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{textAttachment.name}</strong>
                <small style={{ color: "#7c8aa0", fontSize: 10.5 }}>{textAttachment.fileContent.length.toLocaleString()} characters</small>
              </span>
            </div>
          )}

          {visibleUserText && (
            <div className="user-message-bubble" style={{
              padding: "10px 14px",
              borderRadius: "16px 16px 4px 16px",
              background: "linear-gradient(135deg,rgba(124,58,237,0.85),rgba(219,39,119,0.75))",
              border: "1px solid rgba(124,58,237,0.3)",
              color: "#fff", fontSize: 15, lineHeight: 1.65,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
              boxShadow: "0 4px 20px rgba(124,58,237,0.2)",
            }}>
              {visibleUserText}
            </div>
          )}

          <div style={{ opacity: 0.72 }}>
            <CopyBtn text={content} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assistant-message-row" style={{ display: "flex", gap: 10 }}>
      <div className="assistant-message-avatar" style={{
        width: 32, height: 32, borderRadius: 9, flexShrink: 0, marginTop: 2,
        background: "linear-gradient(135deg,#7c3aed,#db2777)",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: "0 3px 12px rgba(124,58,237,0.35)",
      }}>
        <Sparkles size={15} color="#fff" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <RenderedMessage content={content} onOpenPanel={onOpenPanel} isStreaming={isStreaming} />

        {isStreaming && (
          <span style={{
            display: "inline-block", width: 2, height: "1.05em",
            background: "#a78bfa", marginLeft: 3,
            verticalAlign: "text-bottom", borderRadius: 2,
            animation: "cursorBlink 0.75s ease-in-out infinite",
          }} />
        )}

        {!isStreaming && content && (
          <div className="message-actions" style={{ marginTop: 5, marginLeft: -6, display: "flex", alignItems: "center", gap: 1, opacity: 0.7 }}>
            <CopyBtn text={content} />
            <ActionBtn icon={Volume2} label="Read aloud" onClick={() => speakText(content)} />
            <ActionBtn icon={ThumbsUp} doneIcon={ThumbsUp} label="Like" doneLabel="Liked" done={feedback === "up"} onClick={() => setFeedback(feedback === "up" ? null : "up")} />
            <ActionBtn icon={ThumbsDown} doneIcon={ThumbsDown} label="Dislike" doneLabel="Disliked" done={feedback === "down"} onClick={() => setFeedback(feedback === "down" ? null : "down")} />
            {onRetry && <ActionBtn icon={RotateCcw} label="Retry" onClick={() => onRetry(retryIndex)} />}
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
                    downloadAsFile(content, slugify(title) + ".md");
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
});
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
  MODEL_LOCKED: { icon: LockKeyhole, iconColor: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)", title: "Recharge required", desc: "This premium model unlocks after a recharge and locks again when credits run out.", cta: "View plans" },
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
    <div className="chat-empty-state" style={{
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
        className="chat-suggestion-grid sm:grid-cols-3"
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

function ModelRow({ m, active, onSelect, onLocked }) {
  return (
    <button
      onClick={() => m.locked ? onLocked(m) : onSelect(m.id)}
      style={{
        width: "100%", textAlign: "left", padding: "8px 9px",
        borderRadius: 10, border: "none", cursor: m.locked ? "not-allowed" : "pointer",
        background: active ? "rgba(124,58,237,0.16)" : "transparent",
        display: "flex", alignItems: "center", gap: 9,
        fontFamily: "inherit", transition: "background-color 0.12s", opacity: m.locked ? 0.58 : 1,
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
          {m.locked && (
            <span title={m.lockedReason || "Recharge required"} style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9.5, fontWeight: 700, color: "#fbbf24", background: "rgba(251,191,36,0.1)", padding: "1px 6px", borderRadius: 6, flexShrink: 0 }}>
              <LockKeyhole size={9} /> LOCKED
            </span>
          )}          {active && <Check size={13} color="#a78bfa" style={{ flexShrink: 0 }} />}
        </div>
        {m.description && (
          <span style={{ fontSize: 10.5, color: "#64748b", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{m.description}</span>
        )}
      </div>
    </button>
  );
}

function ModelSelector({ models, selectedId, onSelect, onLocked, disabled }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const ref = useRef(null);
  const current = models.find(m => m.id === selectedId) || models[0];

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);


  if (!models.length) return null;

  const hasMore = models.length > DEFAULT_VISIBLE;
  const visibleModels = expanded ? models : models.slice(0, DEFAULT_VISIBLE);
  const hiddenCount = models.length - DEFAULT_VISIBLE;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
            setExpanded(false);
          } else {
            setOpen(true);
          }
        }}
        disabled={disabled}
        style={{
          display: "flex", alignItems: "center", gap: 6,
          width: 30, height: 30, padding: 5, justifyContent: "center",
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
      </button>

      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: 0,
          width: "min(320px, calc(100vw - 20px))",
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
              <ModelRow key={m.id} m={m} active={m.id === selectedId} onLocked={(model) => { onLocked(model); setOpen(false); setExpanded(false); }} onSelect={(id) => { onSelect(id); setOpen(false); setExpanded(false); }} />
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
  const [conversationTitle, setConversationTitle] = useState("");
  // ── Models: instant from cache, then silently revalidate once/session ──
  const [models, setModels] = useState(() => loadCachedModels() || []);
  const [selectedModelId, setSelectedModelId] = useState(
    () => localStorage.getItem(SELECTED_MODEL_STORAGE_KEY) || ""
  );
  const currentModel = models.find(m => m.id === selectedModelId) || models[0];
  const modelSupportsVision = !!currentModel?.vision;

  const [attachedImage, setAttachedImage] = useState(null);
  const [attachedText, setAttachedText] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (modelsFetchedThisSession && models.length) return;
    modelsFetchedThisSession = true;
    getModels()
      .then((list) => {
        if (!list) return;
        setModels(list);
        saveCachedModels(list);
        setSelectedModelId((prev) => {
          if (prev && list.some(m => m.id === prev && !m.locked)) return prev;
          return list.find((model) => !model.locked)?.id || list[0]?.id || "";
        });
      })
      .catch(() => { modelsFetchedThisSession = false; }); // allow retry next mount on failure
  }, [models.length]);

  useEffect(() => {
    if (selectedModelId) localStorage.setItem(SELECTED_MODEL_STORAGE_KEY, selectedModelId);
  }, [selectedModelId]);

  const handleModelSelect = useCallback((modelId) => {
    setSelectedModelId(modelId);
    if (!models.find((model) => model.id === modelId)?.vision) {
      setAttachedImage(null);
    }
  }, [models]);

  function handlePickImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachedImage(reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const refreshModelAccess = useCallback(async () => {
    try {
      const list = await getModels(true);
      setModels(list || []);
      saveCachedModels(list || []);
      setSelectedModelId((current) => list?.some((model) => model.id === current && !model.locked)
        ? current
        : list?.find((model) => !model.locked)?.id || "");
    } catch {
      // Wallet refresh still succeeds if the catalog is temporarily unavailable.
    }
  }, []);

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
  const followOutputRef = useRef(true);
  const committedRef = useRef(new Set());
  const latestQuestionRef = useRef(null);
  const pendingQuestionScrollRef = useRef(false);

  const isStreamingHere = !!liveStream && !liveStream.done;
  const isWaiting        = !!liveStream && liveStream.waiting && !liveStream.text;
  const isBusy            = isStreamingHere || isWaiting;
  const showEmptyState   = !loadingHistory && !historyError && messages.length === 0 && !liveStream;
  const lastMessage = messages[messages.length - 1];
  const liveStreamCommitted = !!liveStream?.done
    && !!liveStream.text
    && (lastMessage?.role === "ASSISTANT" || lastMessage?.role === "assistant")
    && lastMessage.content === liveStream.text;

  const NEAR_BOTTOM_PX = 120;
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let ticking = false;
    function compute() {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      const atBottom = distance < NEAR_BOTTOM_PX;
      isAtBottomRef.current = atBottom;
      if (distance <= 8) followOutputRef.current = true;
      else if (!atBottom) followOutputRef.current = false;
      setShowScrollBtn(!atBottom);
      ticking = false;
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(compute); }
    }
    function onWheel(e) {
      if (e.deltaY < 0) {
        isAtBottomRef.current = false;
        followOutputRef.current = false;
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

  // The dashboard shell follows visualViewport height. Do not force the
  // transcript to the bottom when the mobile keyboard opens; that used to
  // move the user's reading position and could push the topbar off-screen.
  useEffect(() => {
    publishWorkspaceContext({ kind: "chat", title: liveStream?.latestTitle || conversationTitle || (id ? "Conversation" : "New chat"), id: id || null });
  }, [conversationTitle, id, liveStream?.latestTitle]);

  const loadHistory = useCallback(async (conversationId) => {
    const cached = loadCachedConversation(conversationId);
    if (cached && cached.length) {
      setMessages(cached);
      setHistoryError(false);
      isAtBottomRef.current = true;
      window.setTimeout(() => {
        const element = scrollRef.current;
        if (element) element.scrollTop = element.scrollHeight;
      }, 20);
    } else {
      setLoadingHistory(true);
      setHistoryError(false);
    }

    try {
      const data = await getConversation(conversationId);
      const msgs = data?.messages || [];
      setConversationTitle(data?.title || "Conversation");
      setMessages(msgs);
      saveCachedConversation(conversationId, msgs);
      if (!cached) {
        isAtBottomRef.current = true;
        window.setTimeout(() => {
          const element = scrollRef.current;
          if (element) element.scrollTop = element.scrollHeight;
        }, 60);
      }
    } catch (error) {
      if (!cached) {
        setHistoryError(true);
        handleApiError(error);
      }
    } finally {
      setLoadingHistory(false);
    }
  }, []);
  useEffect(() => {
    if (skipLoadRef.current) { skipLoadRef.current = false; return; }
    const frame = requestAnimationFrame(() => {
      if (!id) {
        setMessages([]);
        setConversationTitle("");
        setHistoryError(false);
        return;
      }
      loadHistory(id);
    });
    return () => cancelAnimationFrame(frame);
  }, [id, loadHistory]);

  useEffect(() => {
    if (!pendingQuestionScrollRef.current || !latestQuestionRef.current || !scrollRef.current) return;
    const frame = requestAnimationFrame(() => {
      const container = scrollRef.current;
      const question = latestQuestionRef.current;
      if (!container || !question) return;
      const top = question.getBoundingClientRect().top
        - container.getBoundingClientRect().top
        + container.scrollTop
        - 12;
      container.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      pendingQuestionScrollRef.current = false;
    });
    return () => cancelAnimationFrame(frame);
  }, [messages.length, isWaiting]);
  useEffect(() => {
    if (!liveStream?.text || !followOutputRef.current) return;
    const frame = requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el && followOutputRef.current) el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(frame);
  }, [liveStream?.text]);

  useEffect(() => {
    if (!liveStream || !liveStream.done) return;
    if (committedRef.current.has(liveStream.streamId)) return;
    committedRef.current.add(liveStream.streamId);

    let reconcileTimer = null;
    let clearTimer = null;
    const frame = requestAnimationFrame(() => {
      const conversationId = liveStream.donePayload?.conversationId || id;
      if (liveStream.text) {
        setMessages((previous) => {
          const last = previous[previous.length - 1];
          const alreadyCommitted = last
            && (last.role === "ASSISTANT" || last.role === "assistant")
            && last.content === liveStream.text;
          const next = alreadyCommitted
            ? previous
            : [...previous, { role: "ASSISTANT", content: liveStream.text }];
          saveCachedConversation(conversationId, next);
          return next;
        });
      }

      if (liveStream.donePayload && setWallet && liveStream.donePayload.remainingTokens != null) {
        const remainingTokens = Number(liveStream.donePayload.remainingTokens);
        setWallet((previous) => ({ ...previous, remainingTokens }));
        if (remainingTokens <= 0) {
          setModels((current) => {
            const next = current.map((model) => model.premium
              ? { ...model, locked: true, lockedReason: "Add credits to use this model" }
              : model);
            saveCachedModels(next);
            return next;
          });
        }
      }
      if (liveStream.donePayload?.tokensExhausted) setRechargeOpen(true);

      reconcileTimer = window.setTimeout(async () => {
        if (!conversationId) return;
        try {
          const data = await getConversation(conversationId, true);
          const serverMessages = Array.isArray(data?.messages) ? data.messages : [];
          if (!serverMessages.length) return;
          setMessages((current) => {
            const lastAssistant = (items) => [...items].reverse().find((message) => message.role === "ASSISTANT" || message.role === "assistant");
            const serverAnswer = lastAssistant(serverMessages)?.content || "";
            const localAnswer = lastAssistant(current)?.content || "";
            const serverIsMoreComplete = serverMessages.length > current.length || serverAnswer.length > localAnswer.length;
            if (!serverIsMoreComplete) return current;
            saveCachedConversation(conversationId, serverMessages);
            return serverMessages;
          });
        } catch {
          // The streamed text remains visible even if reconciliation is temporarily unavailable.
        }
      }, 300);

      clearTimer = window.setTimeout(() => {
        clearStream(streamKey);
        setActiveKey(conversationId || tempKey);
      }, 700);
    });

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(reconcileTimer);
      window.clearTimeout(clearTimer);
    };
  }, [liveStream, streamKey, setWallet, clearStream, id, tempKey]);

  useEffect(() => {
    if (!liveStream?.error) return;
    const frame = requestAnimationFrame(() => {
      const code = liveStream.error.code;
      const hasText = !!liveStream.text;

      if (code === "NO_TOKENS" || code === "MODEL_LOCKED") {
        setErrorBanner(code);
        setRechargeOpen(true);
        return;
      }
      if (hasText) return;
      if (code === "RATE_LIMIT" || code === "GROQ_BUSY") setErrorBanner(code);
      else setErrorBanner("GENERAL");
    });
    return () => cancelAnimationFrame(frame);
  }, [liveStream?.error, liveStream?.text]);
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

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function checkConversation() {
      if (document.visibilityState !== "visible" || isBusy) return;
      try {
        const result = await getConversationStatus(id);
        if (!cancelled && result?.exists === false) {
          localStorage.removeItem(CONV_CACHE_PREFIX + id);
          notifyConversationsChanged();
          navigate("/chat", { replace: true });
        }
      } catch (error) {
        if (!cancelled && error?.response?.status === 404) {
          localStorage.removeItem(CONV_CACHE_PREFIX + id);
          notifyConversationsChanged();
          navigate("/chat", { replace: true });
        }
      }
    }

    const timer = setInterval(checkConversation, 30000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [id, isBusy, navigate]);
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


  const handleSend = useCallback((textOverride) => {
    if (currentModel?.locked) {
      setErrorBanner("MODEL_LOCKED");
      setRechargeOpen(true);
      return;
    }
    const text = (textOverride ?? input).trim();
    const textFile = textOverride == null ? attachedText : null;
    if ((!text && !attachedImage && !textFile) || isBusy) return;

    const messageToSend = textFile
      ? "[[ATTACHMENT:" + textFile.name + "]]\n" + textFile.content + "\n[[/ATTACHMENT]]\n" + text
      : text;

    setErrorBanner(null);
    pendingQuestionScrollRef.current = true;
    followOutputRef.current = true;
    isAtBottomRef.current = true;
    setMessages(prev => [...prev, {
      role: "USER",
      content: messageToSend,
      image: attachedImage || undefined,
    }]);
    setInput("");
    const imageToSend = attachedImage;
    setAttachedImage(null);
    setAttachedText(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.overflowY = "hidden";
    }

    const key = id || tempKey;
    setActiveKey(key);

    startStream({
      tempKey: key,
      conversationId: id || null,
      message: messageToSend,
      model: selectedModelId || undefined,
      image: modelSupportsVision ? imageToSend : undefined,
      onMeta: (meta) => {
        if (meta.isNew && meta.conversationId) {
          skipLoadRef.current = true;
          skipActiveKeySyncRef.current = true;
          setActiveKey(meta.conversationId);
          navigate("/chat/" + meta.conversationId, { replace: true });
          notifyConversationsChanged();
        }
      },
      onError: () => {},
    });
  }, [id, input, isBusy, tempKey, startStream, navigate, attachedImage, attachedText, selectedModelId, modelSupportsVision, currentModel?.locked]);
  const handleRetry = useCallback((messageIndex) => {
    if (isBusy) return;
    for (let previous = messageIndex - 1; previous >= 0; previous -= 1) {
      const candidate = messages[previous];
      if (candidate.role === "USER" || candidate.role === "user") {
        handleSend(candidate.content);
        return;
      }
    }
  }, [isBusy, messages, handleSend]);

  function handleStop() {
    stopStreamFn(streamKey);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const CONTENT_MAX_WIDTH = isMobile ? "100%" : "min(880px, 95vw)";

  return (
    <div style={{
      display: "flex", height: "100%", minHeight: 0,
      background: "#050810", overflow: "hidden",
      margin: 0, position: "relative",
      overscrollBehavior: "none",
    }}>
      <style>{`
        @keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideInRight { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes msgIn { from{opacity:0;transform:translateY(10px) scale(0.985)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes thinkingDot { 0%,70%,100%{opacity:.25;transform:translateY(0)} 35%{opacity:1;transform:translateY(-2px)} }
        .assistant-streaming-text { white-space: pre-wrap; overflow-wrap: anywhere; color: #d3dbe8; font-size: 15px; line-height: 1.8; }
        .assistant-thinking { display:flex;align-items:center;gap:4px;width:max-content;margin-left:42px;padding:7px 10px;border:1px solid rgba(255,255,255,.07);border-radius:10px;background:rgba(255,255,255,.035);color:#94a3b8;font-size:12px; }
        .assistant-thinking i { width:4px;height:4px;border-radius:50%;background:#a78bfa;animation:thinkingDot 1.1s infinite; }
        .assistant-thinking i:nth-of-type(2){animation-delay:.14s}.assistant-thinking i:nth-of-type(3){animation-delay:.28s}
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
        .chat-composer-shell { width: 100%; min-width: 0; }
        .chat-composer-attachments { display: flex; flex-wrap: wrap; gap: 7px; margin: 0 2px 7px; }
        .chat-text-attachment { min-width: 205px; max-width: 100%; height: 44px; display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 10px; background: rgba(14,165,233,.09); border: 1px solid rgba(56,189,248,.2); color: #dce8f5; }
        .chat-text-file-icon { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 8px; background: rgba(56,189,248,.14); color: #67e8f9; flex: 0 0 auto; }
        .chat-text-file-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; }
        .chat-text-file-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; }
        .chat-text-file-copy small { color: #718096; font-size: 9.5px; }
        .chat-composer-remove-text { width: 24px; height: 24px; padding: 0; display: grid; place-items: center; border: 0; border-radius: 7px; background: transparent; color: #718096; cursor: pointer; }
        .chat-composer-attachment { display: flex; align-items: center; gap: 10px; margin: 0 4px 8px; color: #8290a7; font-size: 11px; }
        .chat-composer-thumb-wrap { position: relative; flex: 0 0 auto; }
        .chat-composer-thumb { width: 46px; height: 46px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255,255,255,.14); }
        .chat-composer-remove { position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; padding: 0; border-radius: 50%; display: grid; place-items: center; color: #fff; background: #202838; border: 1px solid rgba(255,255,255,.16); cursor: pointer; }
        .chat-composer-box { width: 100%; min-width: 0; padding: 7px 9px 6px; border: 1px solid rgba(255,255,255,.11); border-radius: 16px; background: linear-gradient(145deg,rgba(24,30,43,.98),rgba(12,16,26,.98)); box-shadow: 0 12px 32px rgba(0,0,0,.28), inset 0 1px rgba(255,255,255,.035); transition: border-color .18s, box-shadow .18s; }
        .chat-composer-box:focus-within { border-color: rgba(168,85,247,.52); box-shadow: 0 12px 36px rgba(0,0,0,.34), 0 0 0 3px rgba(168,85,247,.08); }
        .chat-composer-input { display: block; width: 100%; min-width: 0; min-height: 32px; max-height: 112px; overflow-y: hidden; resize: none; padding: 4px 5px 7px; border: 0; outline: 0; background: transparent; color: #f8fafc; font: 400 15px/1.55 inherit; scrollbar-width: thin; scrollbar-color: rgba(148,163,184,.3) transparent; }
        .chat-composer-input::placeholder { color: #64748b; }
        .chat-composer-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-height: 34px; }
        .chat-composer-tools { display: flex; align-items: center; gap: 5px; min-width: 0; }
        .chat-composer-icon, .chat-composer-send { width: 34px; height: 34px; flex: 0 0 34px; display: grid; place-items: center; padding: 0; border-radius: 9px; cursor: pointer; color: #a9b5c8; border: 1px solid transparent; background: transparent; transition: transform .15s, background .15s, color .15s; }
        .chat-composer-icon:hover:not(:disabled) { color: #fff; background: rgba(255,255,255,.07); }
        .chat-composer-icon:disabled { color: #3d4758; cursor: not-allowed; }
        .chat-composer-send { color: #fff; border-color: rgba(255,255,255,.12); background: linear-gradient(135deg,#7c3aed,#ec4899); box-shadow: 0 6px 18px rgba(168,85,247,.3); }
        .chat-composer-send:hover:not(:disabled) { transform: translateY(-1px); }
        .chat-composer-send:disabled { color: #465166; border-color: rgba(255,255,255,.05); background: rgba(255,255,255,.04); box-shadow: none; cursor: not-allowed; }
        .chat-composer-stop { color: #fda4af; background: rgba(244,63,94,.12); border-color: rgba(244,63,94,.22); box-shadow: none; }
        @media (max-width: 767px) {
          .chat-composer-box { padding: 5px 6px; border-radius: 12px; }
          .chat-composer-input { min-height: 27px; max-height: 68px; padding: 2px 3px 4px; font-size: 14px; line-height: 1.42; }
          .chat-composer-toolbar { min-height: 29px; }
          .chat-composer-icon, .chat-composer-send { width: 29px; height: 29px; flex-basis: 29px; border-radius: 8px; }
          .assistant-streaming-text { font-size: 13.5px; line-height: 1.62; }
          .assistant-rendered p, .assistant-rendered li { font-size: 13.5px !important; line-height: 1.62 !important; }
          .assistant-rendered h1 { font-size: 17px !important; margin: 10px 0 4px !important; }
          .assistant-rendered h2 { font-size: 15.5px !important; margin: 9px 0 4px !important; }
          .assistant-rendered h3 { font-size: 12.5px !important; margin: 8px 0 3px !important; }
          .user-message-bubble { padding: 8px 11px !important; font-size: 13px !important; line-height: 1.5 !important; border-radius: 14px 14px 4px 14px !important; }
          .assistant-message-row { gap: 7px !important; }
          .assistant-message-avatar { width: 26px !important; height: 26px !important; border-radius: 8px !important; margin-top: 1px !important; }
          .assistant-message-avatar svg { width: 12px; height: 12px; }
          .message-actions { margin-top: 2px !important; margin-left: -3px !important; gap: 0 !important; }
          .message-actions button { width: 27px; height: 27px; padding: 0 !important; justify-content: center; }
          .message-actions button span { display: none; }
          .chat-empty-state { min-height: 48vh !important; padding: 6px 2px 10px !important; }
          .chat-empty-state > div:first-child { transform: scale(.7); margin-bottom: 8px !important; }
          .chat-empty-state > h2 { font-size: 21px !important; margin-bottom: 5px !important; letter-spacing: 0 !important; }
          .chat-empty-state > p { font-size: 11.5px !important; margin-bottom: 18px !important; }
          .chat-suggestion-grid { gap: 6px !important; }
          .chat-suggestion-grid button { padding: 9px !important; border-radius: 10px !important; }
        }
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
          <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: "0 auto", padding: isMobile ? "8px 8px 10px" : "28px 20px 24px" }}>

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
              <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 14 : 32 }}>
                {messages.map((msg, i) => (
                  <div key={i} ref={i === messages.length - 1 && (msg.role === "USER" || msg.role === "user") ? latestQuestionRef : undefined} className="msg-block">
                    <MessageRow
                      role={msg.role}
                      content={msg.content}
                      image={msg.image}
                      onOpenPanel={setCodePanel}
                      onRetry={msg.role !== "USER" && msg.role !== "user" ? handleRetry : undefined}
                      retryIndex={i}
                    />
                  </div>
                ))}
                {isWaiting && (
                  <div className="assistant-thinking" role="status" aria-live="polite">
                    <span>Thinking</span><i /><i /><i />
                  </div>
                )}
                {liveStream && liveStream.text && !liveStreamCommitted && (
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
            position: "absolute", bottom: isMobile ? 66 : 84, left: "50%", transform: "translateX(-50%)",
            zIndex: 20, animation: "fadeUp 0.15s ease-out",
          }}>
            <button
              onClick={() => { isAtBottomRef.current = true; followOutputRef.current = true; scrollToBottom(); }}
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
          padding: isMobile ? "4px 6px calc(5px + env(safe-area-inset-bottom))" : "12px 20px 14px",
        }}>
          <div style={{ maxWidth: CONTENT_MAX_WIDTH, margin: "0 auto" }}>

            <ChatComposer
              isMobile={isMobile}
              input={input}
              setInput={setInput}
              textareaRef={textareaRef}
              onKeyDown={handleKeyDown}
              onSend={() => handleSend()}
              onStop={handleStop}
              isBusy={isBusy}
              attachedImage={attachedImage}
              setAttachedImage={setAttachedImage}
              attachedText={attachedText}
              setAttachedText={setAttachedText}
              fileInputRef={fileInputRef}
              onPickImage={handlePickImage}
              modelSupportsVision={modelSupportsVision}
              currentModel={currentModel}
              modelSelector={
                <ModelSelector
                  models={models}
                  selectedId={selectedModelId}
                  onSelect={handleModelSelect}
                  onLocked={() => { setErrorBanner("MODEL_LOCKED"); setRechargeOpen(true); }}
                  disabled={isBusy}
                  compact={isMobile}
                />
              }
            />
          </div>
        </div>
      </div>

            {/* ── ARTIFACT / CODE / DOCUMENT PANEL ─────────────────────────────── */}
      {codePanel && (
        <ArtifactPanel
          panel={codePanel}
          onClose={() => setCodePanel(null)}
          isMobile={isMobile}
          renderDocument={(content) => <RenderedMessage content={content} />}
        />
      )}

      <RechargeModal
        open={rechargeOpen}
        reason="tokens"
        onClose={() => setRechargeOpen(false)}
        onActivated={() => Promise.all([getWallet().then(setWallet), refreshModelAccess()]).catch(() => {})}
      />
    </div>
  );
}