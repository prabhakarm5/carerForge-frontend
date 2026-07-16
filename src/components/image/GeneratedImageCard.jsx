import { useState } from "react";
import { Check, Copy, Download, Expand, Heart, Image as ImageIcon, LoaderCircle, RefreshCcw, Share2, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { deleteImage, downloadImage, regenerateImage, toggleFavorite } from "../../services/imageService";

function getImageUrl(image) {
  return image?.storageUrl || image?.imageUrl || image?.url || image?.downloadUrl || "";
}

function getErrorMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function ActionButton({ icon: Icon, label, onClick, danger = false, active = false, loading = false, disabled = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || loading} className={`flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${danger ? "border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/15" : active ? "border-pink-400/30 bg-pink-500/15 text-pink-200" : "border-white/10 bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white"}`} title={label}>
      {loading ? <LoaderCircle size={13} className="animate-spin" /> : <Icon size={13} className={active ? "fill-current" : ""} />}
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function GeneratedImageCard({ image, onDeleted, onFavorite, onRegenerated }) {
  const [busyAction, setBusyAction] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!image) return null;

  const imageUrl = getImageUrl(image);
  const hasSavedId = Boolean(image.id);
  const modelLabel = image.modelId?.replace(/^huggingface:/, "") || "Default image model";
  const providerLabel = image.provider?.includes("HUGGING") ? "Hugging Face / Fal" : image.provider || "CareerForge AI";

  async function runAction(name, task) {
    if (busyAction) return;
    try {
      setBusyAction(name);
      await task();
    } catch (error) {
      toast.error(getErrorMessage(error, `${name} failed`));
    } finally {
      setBusyAction("");
    }
  }

  function handleDelete() {
    if (!hasSavedId) return toast.error("This image is not saved yet. Refresh history first.");
    if (!window.confirm("Delete this image permanently?")) return;
    runAction("Delete", async () => {
      await deleteImage(image.id);
      toast.success("Image deleted");
      onDeleted?.(image);
    });
  }

  function handleFavorite() {
    if (!hasSavedId) return toast.error("This image is not saved yet.");
    runAction("Favorite", async () => {
      const updated = await toggleFavorite(image.id);
      onFavorite?.(updated);
    });
  }

  function handleRegenerate() {
    if (!hasSavedId) return toast.error("This image is not saved yet.");
    runAction("Regenerate", async () => {
      const result = await regenerateImage(image.id);
      toast.success("New variation saved");
      onRegenerated?.(result);
    });
  }

  function handleDownload() {
    if (!imageUrl) return toast.error("Image URL is unavailable.");
    runAction("Download", async () => {
      const result = hasSavedId ? await downloadImage(image.id) : null;
      const link = document.createElement("a");
      link.href = result?.downloadUrl || imageUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = `careerforge-image-${image.id || Date.now()}.png`;
      link.click();
    });
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(image.prompt || imageUrl || "");
    setCopied(true);
    toast.success("Prompt copied");
    window.setTimeout(() => setCopied(false), 1400);
  }

  async function handleShare() {
    try {
      if (navigator.share && imageUrl) {
        await navigator.share({ title: "CareerForge AI Image", text: image.prompt, url: imageUrl });
      } else {
        await navigator.clipboard.writeText(imageUrl);
        toast.success("Image link copied");
      }
    } catch (error) {
      if (error?.name !== "AbortError") toast.error("Could not share image");
    }
  }

  return (
    <>
      <article className="flex h-full min-h-[430px] min-w-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0c111d] shadow-2xl shadow-black/20">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-3">
          <div className="min-w-0"><h2 className="text-sm font-black text-white">Generated result</h2><p className="mt-0.5 truncate text-[9px] text-slate-500">{providerLabel} / {modelLabel}</p></div>
          <button type="button" onClick={() => setFullscreen(true)} disabled={!imageUrl} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white disabled:opacity-40" title="Open fullscreen"><Expand size={14} /></button>
        </div>

        <div className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-hidden bg-[#03050b] p-2 sm:p-4">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(217,70,239,0.08),transparent_42%)]" />
          {imageUrl ? <img src={imageUrl} alt={image.prompt || "Generated image"} className="relative max-h-[62dvh] w-full rounded-lg object-contain" /> : <ImageIcon size={64} className="relative text-slate-800" />}
        </div>

        <div className="shrink-0 space-y-3 border-t border-white/[0.07] p-3 sm:p-4">
          <div className="rounded-lg border border-white/[0.08] bg-[#060913] p-3">
            <div className="flex items-start justify-between gap-3"><p className="line-clamp-3 text-[11px] leading-5 text-slate-300">{image.prompt || "No prompt saved"}</p><button type="button" onClick={handleCopy} className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/10 text-slate-500 hover:text-white" title="Copy prompt">{copied ? <Check size={12} className="text-emerald-300" /> : <Copy size={12} />}</button></div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[9px] text-slate-600"><span>{image.tokensUsed ?? 0} credits</span><span>{image.status || "COMPLETED"}</span>{image.createdAt && <span>{new Date(image.createdAt).toLocaleString()}</span>}</div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            <ActionButton icon={Heart} label="Favorite" active={Boolean(image.favorite)} onClick={handleFavorite} loading={busyAction === "Favorite"} disabled={!hasSavedId || Boolean(busyAction)} />
            <ActionButton icon={Download} label="Save" onClick={handleDownload} loading={busyAction === "Download"} disabled={!imageUrl || Boolean(busyAction)} />
            <ActionButton icon={RefreshCcw} label="Retry" onClick={handleRegenerate} loading={busyAction === "Regenerate"} disabled={!hasSavedId || Boolean(busyAction)} />
            <ActionButton icon={Copy} label="Copy" onClick={handleCopy} disabled={Boolean(busyAction)} />
            <ActionButton icon={Share2} label="Share" onClick={handleShare} disabled={!imageUrl || Boolean(busyAction)} />
            <ActionButton icon={Trash2} label="Delete" onClick={handleDelete} danger loading={busyAction === "Delete"} disabled={!hasSavedId || Boolean(busyAction)} />
          </div>
        </div>
      </article>

      {fullscreen && <div className="fixed inset-0 z-[1600] grid place-items-center bg-black/95 p-2 sm:p-6" role="dialog" aria-modal="true" aria-label="Generated image fullscreen preview"><button type="button" onClick={() => setFullscreen(false)} className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-lg border border-white/15 bg-black/60 text-white" title="Close fullscreen"><X size={18} /></button><img src={imageUrl} alt={image.prompt || "Generated image fullscreen"} className="max-h-full max-w-full object-contain" /></div>}
    </>
  );
}