import { FileText, Paperclip, Send, StopCircle, X } from "lucide-react";

const LONG_PASTE_THRESHOLD = 1800;

export default function ChatComposer({
  isMobile,
  input,
  setInput,
  textareaRef,
  onKeyDown,
  onSend,
  onStop,
  isBusy,
  attachedImage,
  setAttachedImage,
  attachedText,
  setAttachedText,
  fileInputRef,
  onPickImage,
  modelSupportsVision,
  currentModel,
  modelSelector,
}) {
  const canSend = Boolean(input.trim() || attachedImage || attachedText);

  function resizeTextarea(element) {
    if (!element) return;
    const maxHeight = isMobile ? 78 : 112;
    element.style.height = "auto";
    element.style.height = Math.min(element.scrollHeight, maxHeight) + "px";
    element.style.overflowY = element.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  function handlePaste(event) {
    const pasted = event.clipboardData?.getData("text/plain") || "";
    if (pasted.length < LONG_PASTE_THRESHOLD) return;

    event.preventDefault();
    const looksLikeMarkdown = /^#{1,6}\s/m.test(pasted) || pasted.includes("~~~") || pasted.includes("|---");
    setAttachedText({
      name: looksLikeMarkdown ? "README.md" : "pasted-message.txt",
      content: pasted,
    });
  }

  return (
    <div className="chat-composer-shell">
      {(attachedImage || attachedText) && (
        <div className="chat-composer-attachments">
          {attachedImage && (
            <div className="chat-composer-attachment">
              <div className="chat-composer-thumb-wrap">
                <img className="chat-composer-thumb" src={attachedImage} alt="Attached" />
                <button type="button" className="chat-composer-remove" onClick={() => setAttachedImage(null)} title="Remove image">
                  <X size={11} />
                </button>
              </div>
              <span>{currentModel?.label || "Selected model"} will read this image</span>
            </div>
          )}

          {attachedText && (
            <div className="chat-text-attachment">
              <span className="chat-text-file-icon"><FileText size={15} /></span>
              <span className="chat-text-file-copy">
                <strong>{attachedText.name}</strong>
                <small>{attachedText.content.length.toLocaleString()} characters</small>
              </span>
              <button type="button" className="chat-composer-remove-text" onClick={() => setAttachedText(null)} title="Remove text file">
                <X size={12} />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="chat-composer-box">
        <textarea
          ref={textareaRef}
          value={input}
          onPaste={handlePaste}
          onChange={(event) => {
            setInput(event.target.value);
            resizeTextarea(event.target);
          }}
          onKeyDown={onKeyDown}
          placeholder={attachedText ? "Add a note about this file" : "Message CareerForge AI"}
          rows={1}
          className="chat-composer-input"
        />

        <div className="chat-composer-toolbar">
          <div className="chat-composer-tools">
            {modelSelector}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickImage} hidden />
            <button
              type="button"
              className="chat-composer-icon"
              onClick={() => modelSupportsVision && fileInputRef.current?.click()}
              disabled={!modelSupportsVision || isBusy}
              title={modelSupportsVision ? "Attach image" : "Choose a vision model to attach images"}
            >
              <Paperclip size={15} />
            </button>
          </div>

          {isBusy ? (
            <button type="button" className="chat-composer-send chat-composer-stop" onClick={onStop} title="Stop generating">
              <StopCircle size={16} />
            </button>
          ) : (
            <button type="button" className="chat-composer-send" onClick={onSend} disabled={!canSend} title="Send">
              <Send size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
