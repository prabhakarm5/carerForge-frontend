const FENCE = String.fromCharCode(96).repeat(3);
const RAW_HTML_START = /^\s*(?:<!doctype\s+html\b|<html(?:\s|>))/i;
const RAW_HTML_END = /<\/html\s*>/i;

export function looksLikeHtmlDocument(value = "") {
  const source = String(value).trimStart();
  return /^<!doctype\s+html\b/i.test(source)
    || (/^<html(?:\s|>)/i.test(source) && /<(?:head|body|style|script)(?:\s|>)/i.test(source));
}

export function artifactTitle(source = "") {
  const title = String(source).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/\s+/g, " ")
    .trim();
  return title || "Generated web page";
}

export function normalizeMessageMarkup(raw) {
  let insideCodeFence = false;
  let insideRawHtml = false;

  return String(raw || "").split("\n").map((line) => {
    const trimmed = line.trimStart();
    if (trimmed.startsWith(FENCE)) {
      insideCodeFence = !insideCodeFence;
      return line;
    }

    if (!insideCodeFence && RAW_HTML_START.test(line)) insideRawHtml = true;
    const normalized = insideCodeFence || insideRawHtml
      ? line
      : line.replace(/<br\s*\/?>/gi, "\n");
    if (insideRawHtml && RAW_HTML_END.test(line)) insideRawHtml = false;
    return normalized;
  }).join("\n");
}

function pushTextBlock(blocks, line) {
  if (line.startsWith("> ")) blocks.push({ type: "quote", content: line.slice(2) });
  else if (line.startsWith("### ")) blocks.push({ type: "h3", content: line.slice(4) });
  else if (line.startsWith("## ")) blocks.push({ type: "h2", content: line.slice(3) });
  else if (line.startsWith("# ")) blocks.push({ type: "h1", content: line.slice(2) });
  else if (line.startsWith("- ") || line.startsWith("* ")) blocks.push({ type: "li", content: line.slice(2) });
  else if (/^\d+\. /.test(line)) blocks.push({ type: "oli", content: line.replace(/^\d+\. /, "") });
  else blocks.push({ type: "text", content: line });
}

export function parseContent(raw = "") {
  const blocks = [];
  const lines = String(raw).split("\n");
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trimStart();
    const dataHref = lines[i].match(/<a\s+[^>]*href=["'](data:text\/html[^"']+)["'][^>]*>(.*?)<\/a>/i);

    if (dataHref) {
      try {
        const comma = dataHref[1].indexOf(",");
        const encoded = comma >= 0 ? dataHref[1].slice(comma + 1) : "";
        const content = decodeURIComponent(encoded);
        blocks.push({
          type: "artifact",
          lang: "html",
          content,
          label: dataHref[2]?.replace(/<[^>]+>/g, "").trim() || artifactTitle(content),
          complete: true,
        });
      } catch {
        pushTextBlock(blocks, lines[i]);
      }
      i += 1;
      continue;
    }

    if (trimmed.startsWith(FENCE)) {
      const lang = lines[i].trim().slice(FENCE.length).trim() || "code";
      const code = [];
      let closed = false;
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith(FENCE)) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) {
        closed = true;
        i += 1;
      }
      const content = code.join("\n");
      const normalizedLang = lang.toLowerCase();
      if ((normalizedLang === "html" || normalizedLang === "htm" || normalizedLang === "code")
          && looksLikeHtmlDocument(content)) {
        blocks.push({
          type: "artifact",
          lang: "html",
          content,
          label: artifactTitle(content),
          complete: closed && RAW_HTML_END.test(content),
        });
      } else {
        blocks.push({ type: "code", lang, content });
      }
      continue;
    }

    if (RAW_HTML_START.test(lines[i])) {
      const html = [];
      let complete = false;
      while (i < lines.length) {
        html.push(lines[i]);
        if (RAW_HTML_END.test(lines[i])) {
          complete = true;
          i += 1;
          break;
        }
        i += 1;
      }
      const content = html.join("\n");
      blocks.push({
        type: "artifact",
        lang: "html",
        content,
        label: artifactTitle(content),
        complete,
      });
      continue;
    }

    if (trimmed.includes("|") && i + 1 < lines.length
        && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].includes("-")) {
      const header = trimmed.replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim());
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trimStart().includes("|") && lines[i].trim() !== "") {
        rows.push(lines[i].trim().replace(/^\||\|$/g, "").split("|").map((cell) => cell.trim()));
        i += 1;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    pushTextBlock(blocks, lines[i]);
    i += 1;
  }

  return blocks;
}
