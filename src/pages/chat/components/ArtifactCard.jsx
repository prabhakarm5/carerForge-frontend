import { Code2, Download, Eye, LoaderCircle } from "lucide-react";
import "./ArtifactCard.css";

export default function ArtifactCard({ artifact, onOpenPanel, onDownload, isStreaming }) {
  const canOpen = Boolean(artifact.content);
  // The stream ending is authoritative; useful HTML fragments do not need a closing </html> tag.
  const status = isStreaming ? "building" : canOpen ? "ready" : "incomplete";

  return (
    <section className="chat-artifact-card" aria-label="Generated HTML artifact">
      <div className="chat-artifact-accent" />
      <div className="chat-artifact-main">
        <div className="chat-artifact-icon"><Code2 size={18} /></div>
        <div className="chat-artifact-copy">
          <div className="chat-artifact-meta">
            <span>Interactive HTML</span>
            <span className={`is-${status}`}>
              {status === "building" && <LoaderCircle className="animate-spin" size={11} />}
              {status === "building" ? "Building" : status === "ready" ? "Ready" : "Incomplete"}
            </span>
          </div>
          <strong>{artifact.label || "Generated web page"}</strong>
          <small>Open the live preview or inspect the complete source.</small>
        </div>
      </div>
      <div className="chat-artifact-actions">
        <button
          type="button"
          className="chat-artifact-open"
          disabled={!canOpen}
          onClick={() => canOpen && onOpenPanel?.({
            kind: "artifact",
            lang: "html",
            content: artifact.content,
            title: artifact.label || "Generated web page",
          })}
        >
          <Eye size={15} />
          <span>Open preview</span>
        </button>
        <button
          type="button"
          className="chat-artifact-download"
          disabled={!canOpen}
          onClick={() => canOpen && onDownload?.(artifact.content, artifact.lang, artifact.label)}
          title="Download HTML"
          aria-label="Download HTML"
        >
          <Download size={15} />
        </button>
      </div>
    </section>
  );
}
