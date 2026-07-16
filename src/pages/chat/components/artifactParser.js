const FENCE = String.fromCharCode(96).repeat(3);
const RAW_HTML_START = /^\s*(?:<!doctype\s+html\b|<html(?:\s|>))/i;
const RAW_HTML_END = /<\/html\s*>/i;
const HEADING = /^\s*(#{1,6})\s+(.+)$/;
const PREVIEW_LINK_HEADING = /(?:one[ -]?click\s+)?preview\s+links?|open\s+in\s+(?:codepen|stackblitz|jsfiddle)/i;
const DATA_URI_HEADING = /\bdata\s+uri\b/i;

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

function decodeHtmlDataUri(value = "") {
  const source = String(value).trim().replace(/^['"]|['"]$/g, "");
  const comma = source.indexOf(",");
  if (!/^data:text\/html\b/i.test(source) || comma < 0) return "";

  const metadata = source.slice(0, comma);
  const payload = source.slice(comma + 1);
  try {
    const decoded = /;base64(?:;|$)/i.test(metadata)
      ? atob(payload.replace(/\s+/g, ""))
      : decodeURIComponent(payload);
    return decoded.replace(/\\(?=<\/?[A-Za-z!])/g, "").trim();
  } catch {
    return payload.replace(/\\(?=<\/?[A-Za-z!])/g, "").trim();
  }
}

function normalizeExternalAnchors(line) {
  return line.replace(
    /<a\s+[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, label) => `[${String(label).replace(/<[^>]+>/g, "").trim() || "Open link"}](${href})`,
  );
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
      : normalizeExternalAnchors(line.replace(/<br\s*\/?>/gi, "\n"));
    if (insideRawHtml && RAW_HTML_END.test(line)) insideRawHtml = false;
    return normalized;
  }).join("\n");
}

function pushTextBlock(blocks, line) {
  if (/^\s*(?:-{3,}|_{3,}|\*{3,})\s*$/.test(line)) return;
  const heading = line.match(HEADING);
  if (heading) {
    const level = Math.min(3, heading[1].length);
    blocks.push({ type: `h${level}`, content: heading[2].trim() });
  } else if (line.startsWith("> ")) blocks.push({ type: "quote", content: line.slice(2) });
  else if (line.startsWith("- ") || line.startsWith("* ")) blocks.push({ type: "li", content: line.slice(2) });
  else if (/^\d+\. /.test(line)) blocks.push({ type: "oli", content: line.replace(/^\d+\. /, "") });
  else blocks.push({ type: "text", content: line });
}

function artifactFromDataUri(dataUri, deferDecode) {
  if (deferDecode) {
    return {
      type: "artifact",
      lang: "html",
      content: "",
      label: "Generated web page",
      complete: false,
    };
  }

  const content = decodeHtmlDataUri(dataUri);
  if (!looksLikeHtmlDocument(content)) return null;
  return {
    type: "artifact",
    lang: "html",
    content,
    label: artifactTitle(content),
    complete: RAW_HTML_END.test(content),
  };
}

export function parseContent(raw = "", options = {}) {
  const blocks = [];
  const lines = String(raw).split("\n");
  const deferDataUriDecode = Boolean(options.deferDataUriDecode);
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trimStart();
    const heading = lines[i].match(HEADING);

    if (heading && PREVIEW_LINK_HEADING.test(heading[2])) {
      i += 1;
      while (i < lines.length && !HEADING.test(lines[i])) i += 1;
      continue;
    }

    if (heading && DATA_URI_HEADING.test(heading[2])) {
      i += 1;
      continue;
    }

    const dataHref = lines[i].match(/<a\s+[^>]*href=["'](data:text\/html[^"']+)["'][^>]*>(.*?)<\/a>/i);
    if (dataHref) {
      const artifact = artifactFromDataUri(dataHref[1], deferDataUriDecode);
      if (artifact) blocks.push(artifact);
      i += 1;
      continue;
    }

    if (/^data:text\/html\b/i.test(trimmed)) {
      const artifact = artifactFromDataUri(trimmed, deferDataUriDecode);
      if (artifact) blocks.push(artifact);
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
      const dataUriArtifact = /^data:text\/html\b/i.test(content.trim())
        ? artifactFromDataUri(content.trim(), deferDataUriDecode)
        : null;
      if (dataUriArtifact) {
        blocks.push(dataUriArtifact);
        continue;
      }

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