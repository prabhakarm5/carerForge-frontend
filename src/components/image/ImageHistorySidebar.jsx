import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Clock3, Heart, Image as ImageIcon, RefreshCcw, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { deleteImage, getImageHistory } from "../../services/imageService";

function getImageUrl(image) {
  return image?.storageUrl || image?.imageUrl || image?.url || image?.downloadUrl || "";
}

const ImageHistorySidebar = forwardRef(function ImageHistorySidebar({ onSelect, selectedId }, ref) {
  const [history, setHistory] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return history;
    return history.filter((item) => item.prompt?.toLowerCase().includes(q));
  }, [history, keyword]);

  useEffect(() => { loadHistory(); }, []);
  useImperativeHandle(ref, () => ({ refresh: loadHistory }));

  async function loadHistory() {
    try {
      setLoading(true);
      const data = await getImageHistory();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Unable to load image history");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(e, id) {
    e.stopPropagation();
    if (!window.confirm("Delete this image?")) return;
    const prev = history;
    setHistory((items) => items.filter((item) => item.id !== id));
    try {
      await deleteImage(id);
      toast.success("Image deleted");
    } catch {
      setHistory(prev);
      toast.error("Delete failed");
    }
  }

  return (
    <aside className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#101624] shadow-2xl shadow-black/20">
      <div className="border-b border-white/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-white">History</h2>
            <p className="mt-1 text-xs text-slate-500">{history.length} generated images</p>
          </div>
          <button type="button" onClick={loadHistory} className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white" title="Refresh history">
            <RefreshCcw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-[#070b16] px-3 py-2">
          <Search size={16} className="text-slate-500" />
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Search images..." className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600" />
        </div>
      </div>

      <div className="image-history-scroll min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        {loading && Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/[0.04]" />)}

        {!loading && filtered.length === 0 && (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center text-slate-500">
            <ImageIcon size={44} className="mb-3 text-slate-700" />
            <p className="text-sm font-semibold">No images yet</p>
            <p className="mt-1 text-xs">Generate first image to build history.</p>
          </div>
        )}

        {!loading && filtered.map((image) => {
          const url = getImageUrl(image);
          const active = image.id === selectedId;
          return (
            <button key={image.id || url} type="button" onClick={() => onSelect?.(image)} className={`group w-full overflow-hidden rounded-2xl border text-left transition ${active ? "border-fuchsia-400/70 bg-fuchsia-500/[0.08]" : "border-white/10 bg-white/[0.035] hover:border-fuchsia-400/40"}`}>
              <div className="relative h-32 bg-black">
                {url ? <img src={url} alt="Generated" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full items-center justify-center text-slate-700"><ImageIcon size={34} /></div>}
                {image.favorite && <span className="absolute left-2 top-2 rounded-full bg-black/65 p-1.5 text-red-400 backdrop-blur"><Heart size={13} className="fill-red-500" /></span>}
                <button type="button" onClick={(e) => handleDelete(e, image.id)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-slate-300 opacity-0 backdrop-blur transition hover:text-red-300 group-hover:opacity-100" title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 text-xs leading-5 text-slate-300">{image.prompt || "Untitled image"}</p>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-600"><Clock3 size={12} /> {image.createdAt ? new Date(image.createdAt).toLocaleDateString() : "Recent"}</div>
              </div>
            </button>
          );
        })}
      </div>
      <style>{`.image-history-scroll::-webkit-scrollbar{width:4px}.image-history-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:999px}`}</style>
    </aside>
  );
});

export default ImageHistorySidebar;
