import { Download, ExternalLink, Heart, Image as ImageIcon, Copy, RefreshCcw, Share2, Trash2, ZoomIn } from "lucide-react";
import toast from "react-hot-toast";
import { deleteImage, downloadImage, regenerateImage, toggleFavorite } from "../../services/imageService";
function getImageUrl(image) {
  return image?.storageUrl || image?.imageUrl || image?.url || image?.downloadUrl || "";
}

function ActionButton({ icon: Icon, label, onClick, danger = false, active = false }) {
  return (
    <button type="button" onClick={onClick} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${danger ? "border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/15" : active ? "border-pink-400/30 bg-pink-500/15 text-pink-200" : "border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/[0.08] hover:text-white"}`} title={label}>
      <Icon size={15} className={active ? "fill-current" : ""} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export default function GeneratedImageCard({ image, onDeleted, onFavorite, onRegenerated }) {
  if (!image) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#101624] p-8 text-center">
        <ImageIcon size={64} className="text-slate-700" />
        <h2 className="mt-5 text-2xl font-black text-white">No image selected</h2>
        <p className="mt-2 text-sm text-slate-500">Generate or select from history.</p>
      </div>
    );
  }

  const imageUrl = getImageUrl(image);

  async function handleDelete() {
    if (!window.confirm("Delete this image?")) return;
    try {
      await deleteImage(image.id);
      toast.success("Image deleted");
      onDeleted?.();
    } catch { toast.error("Delete failed"); }
  }

  async function handleFavorite() {
    try {
      const updated = await toggleFavorite(image.id);
      toast.success("Favorite updated");
      onFavorite?.(updated);
    } catch { toast.error("Favorite failed"); }
  }

  async function handleRegenerate() {
    try {
      const result = await regenerateImage(image.id);
      toast.success("Image regenerated");
      onRegenerated?.(result);
    } catch { toast.error("Regenerate failed"); }
  }

  async function handleDownload() {
    try {
      const result = await downloadImage(image.id);
      window.open(result?.downloadUrl || imageUrl, "_blank");
    } catch {
      if (imageUrl) window.open(imageUrl, "_blank");
      else toast.error("Download failed");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(image.prompt || imageUrl || "");
    toast.success("Copied");
  }

  async function handleShare() {
    if (navigator.share && imageUrl) await navigator.share({ title: "CareerForge AI Image", url: imageUrl });
    else handleCopy();
  }

  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#101624] shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
        <div>
          <h2 className="text-base font-black text-white">Image preview</h2>
          <p className="mt-1 text-xs text-slate-500">Preview, download, regenerate, favorite</p>
        </div>
        <button type="button" onClick={() => imageUrl && window.open(imageUrl, "_blank")} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white" title="Open full image">
          <ZoomIn size={16} />
        </button>
      </div>

      <div className="flex min-h-[360px] flex-1 items-center justify-center bg-black/60 p-4">
        {imageUrl ? <img src={imageUrl} alt={image.prompt || "Generated image"} className="max-h-[58vh] w-full rounded-xl object-contain" /> : <ImageIcon size={70} className="text-slate-700" />}
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-2xl border border-white/10 bg-[#070b16] p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Prompt</p>
          <p className="mt-2 text-sm leading-6 text-slate-200">{image.prompt || "No prompt saved"}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ActionButton icon={Heart} label="Favorite" onClick={handleFavorite} active={!!image.favorite} />
          <ActionButton icon={Download} label="Download" onClick={handleDownload} />
          <ActionButton icon={RefreshCcw} label="Regenerate" onClick={handleRegenerate} />
          <ActionButton icon={Copy} label="Copy" onClick={handleCopy} />
          <ActionButton icon={Share2} label="Share" onClick={handleShare} />
          <ActionButton icon={Trash2} label="Delete" onClick={handleDelete} danger />
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm">
          <div><p className="text-xs text-slate-500">Tokens</p><p className="mt-1 font-bold text-yellow-300">{image.tokensUsed ?? "--"}</p></div>
          <div><p className="text-xs text-slate-500">Provider</p><p className="mt-1 flex items-center gap-1 font-bold text-white">CareerForge AI <ExternalLink size={12} className="text-slate-600" /></p></div>
        </div>
      </div>
    </div>
  );
}
