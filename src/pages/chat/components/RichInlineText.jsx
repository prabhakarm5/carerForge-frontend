import { Fragment } from "react";

const TOKEN_PATTERN = /(\*\*[^*]+\*\*|\x60[^\x60]+\x60|\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<]+)/g;

export default function RichInlineText({ text = "" }) {
  const parts = text.split(TOKEN_PATTERN).filter(Boolean);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index} style={{ color: "#f8fafc", fontWeight: 700 }}>{part.slice(2, -2)}</strong>;
        }

        if (part.charCodeAt(0) === 96 && part.charCodeAt(part.length - 1) === 96) {
          return (
            <code key={index} style={{
              padding: "1px 6px",
              borderRadius: 5,
              background: "rgba(139,92,246,0.15)",
              color: "#c4b5fd",
              fontSize: "0.82em",
              fontFamily: "'JetBrains Mono',monospace",
              border: "1px solid rgba(139,92,246,0.2)",
            }}>
              {part.slice(1, -1)}
            </code>
          );
        }

        const markdownLink = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
        const href = markdownLink?.[2] || (part.startsWith("http") ? part : null);
        if (href) {
          return (
            <a
              key={index}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#67e8f9", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              {markdownLink?.[1] || part}
            </a>
          );
        }

        return <Fragment key={index}>{part}</Fragment>;
      })}
    </>
  );
}