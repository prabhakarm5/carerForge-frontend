import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { Clock3, Heart, Image as ImageIcon, LoaderCircle, RefreshCcw, Search, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import { deleteImage, getImageHistory, toggleFavorite } from "../../services/imageService";

function getImageUrl(image) {
  return image?.storageUrl || image?.imageUrl || image?.url || image?.downloadUrl || "";
}

function relativeDate(value) {
  if (!value) return "Recent";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Recent";
  const diff = Math.max(0, Date.now() - time);
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

const ImageHistorySidebar = forwardRef(function ImageHistorySidebar({ onSelect, onDeleted, onFavorite, selectedId }, ref) {
  const [history, setHistory] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [broken, setBroken] = useState(() => new Set());

  const loadHistory = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const data = await getImageHistory();
      setHistory(Array.isArray(data) ? data : []);
      setError(false);
    } catch {
      setError(true);
      if (!quiet) toast.error("Unable to load image history");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadHistory(), 0);
    return () => window.clearTimeout(timer);
  }, [loadHistory]);
  useImperativeHandle(ref, () => ({ refresh: () => loadHistory(true) }), [loadHistory]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return history;
    return history.filter((item) => `${item.prompt || ""} ${item.provider || ""}`.toLowerCase().includes(q));
  }, [history, keyword]);

  async function handleDelete(event, image) {
    event.stopPropagation();
    if (!image?.id) return toast.error("Image id is missing. Refresh history first.");
    if (!window.confirm("Delete this image permanently?")) return;
    const previous = history;
    setBusyId(image.id);
    setHistory((items) => items.filter((item) => item.id !== image.id));
    try {
      await deleteImage(image.id);
      toast.success("Image deleted");
      onDeleted?.(image);
    } catch (requestError) {
      setHistory(previous);
      toast.error(requestError?.response?.data?.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleFavorite(event, image) {
    event.stopPropagation();
    if (!image?.id || busyId) return;
    setBusyId(image.id);
    try {
      const updated = await toggleFavorite(image.id);
      setHistory((items) => items.map((item) => item.id === image.id ? updated : item));
      onFavorite?.(updated);
    } catch (requestError) {
      toast.error(requestError?.response?.data?.message || "Favorite update failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <aside className="flex h-full min-h-[430px] flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0c111d] shadow-2xl shadow-black/20">
      <div className="shrink-0 border-b border-white/[0.07] p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-black text-white">Your generations</h2>
            <p className="mt-0.5 text-[10px] text-slate-500">{history.length} images saved</p>
          </div>
          <button type="button" onClick={() => loadHistory()} disabled={loading} className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white" title="Refresh history">
            <RefreshCcw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-[#060913] px-2.5 focus-within:border-fuchsia-400/40">
          <Search size={13} className="text-slate-600" />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Search history" className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-700" />
          {keyword && <button type="button" onClick={() => setKeyword("")} className="text-slate-600 hover:text-white"><X size={12} /></button>}
        </div>
      </div>

      <div className="image-history-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-2.5">
        {loading && Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-lg bg-white/[0.035]" />)}

        {!loading && error && (
          <div className="grid min-h-[260px] place-items-center text-center text-slate-500">
            <div><p className="text-xs font-bold">History unavailable</p><button type="button" onClick={() => loadHistory()} className="mt-2 text-xs text-fuchsia-300">Try again</button></div>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="flex min-h-[260px] flex-col items-center justify-center text-center text-slate-600">
            <ImageIcon size={34} className="mb-3 text-slate-800" />
            <p className="text-xs font-bold">{keyword ? "No matching images" : "No images yet"}</p>
            <p className="mt-1 text-[10px]">Your generated images will appear here.</p>
          </div>
        )}

        {!loading && !error && filtered.map((image) => {
          const url = getImageUrl(image);
          const active = String(image.id) === String(selectedId);
          const isBusy = busyId === image.id;
          return (
            <article key={image.id} className={`group relative overflow-hidden rounded-lg border transition ${active ? "border-fuchsia-400/60 bg-fuchsia-500/[0.08]" : "border-white/[0.08] bg-white/[0.025] hover:border-white/20"}`}>
              <button type="button" onClick={() => onSelect?.(image)} className="block w-full text-left">
                <div className="relative aspect-[4/3] overflow-hidden bg-black/60">
                  {url && !broken.has(image.id) ? (
                    <img src={url} alt={image.prompt || "Generated image"} loading="lazy" onError={() => setBroken((current) => new Set(current).add(image.id))} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]" />
                  ) : <div className="grid h-full place-items-center text-slate-800"><ImageIcon size={30} /></div>}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/85 to-transparent" />
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/55 px-1.5 py-1 text-[9px] font-bold text-white/70 backdrop-blur">{image.provider?.includes("HUGGING") ? "HF" : "AI"}</span>
                </div>
                <div className="p-2.5">
                  <p className="line-clamp-2 text-[11px] font-medium leading-4 text-slate-300">{image.prompt || "Untitled generation"}</p>
                  <div className="mt-2 flex items-center justify-between text-[9px] text-slate-600"><span className="inline-flex items-center gap-1"><Clock3 size={10} />{relativeDate(image.createdAt)}</span><span>{image.tokensUsed ?? 0} credits</span></div>
                </div>
              </button>

              <div className="absolute right-2 top-2 flex gap-1 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                <button type="button" onClick={(event) => handleFavorite(event, image)} disabled={isBusy} className={`grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-black/65 backdrop-blur ${image.favorite ? "text-pink-400" : "text-slate-300 hover:text-pink-300"}`} title="Favorite"><Heart size={12} className={image.favorite ? "fill-current" : ""} /></button>
                <button type="button" onClick={(event) => handleDelete(event, image)} disabled={isBusy} className="grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-black/65 text-slate-300 backdrop-blur hover:text-red-300" title="Delete">{isBusy ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={12} />}</button>
              </div>
            </article>
          );
        })}
      </div>
      <style>{`.image-history-scroll::-webkit-scrollbar{width:4px}.image-history-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.12);border-radius:999px}`}</style>
    </aside>
  );
});

export default ImageHistorySidebar;