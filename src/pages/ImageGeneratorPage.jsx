import { useEffect, useRef, useState } from "react";
import { History, Image as ImageIcon, PanelLeftClose, Plus, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import PromptCard from "../components/image/PromptCard";
import GeneratedImageCard from "../components/image/GeneratedImageCard";
import ImageHistorySidebar from "../components/image/ImageHistorySidebar";
import ImageSkeleton from "../components/image/ImageSkeleton";
import EmptyImageState from "../components/image/EmptyImageState";
import { getImageHistory } from "../services/imageService";
import { notifyWorkspaceHistoryChanged, publishWorkspaceContext } from "../services/workspaceEvents";

export default function ImageGeneratorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedImageId = searchParams.get("image");
  const startNewRequested = searchParams.get("new") === "1";
  const historyRef = useRef(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    if (startNewRequested || !selectedImageId) return;
    let cancelled = false;
    getImageHistory()
      .then((items) => {
        if (cancelled) return;
        const selected = (Array.isArray(items) ? items : [])
          .find((item) => String(item.id) === String(selectedImageId));
        setGeneratedImage(selected || null);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedImageId, startNewRequested]);

  useEffect(() => {
    publishWorkspaceContext(generatedImage
      ? { kind: "image", title: generatedImage.prompt || "Generated image", id: generatedImage.id }
      : { kind: "image" });
  }, [generatedImage]);

  function syncHistory() {
    historyRef.current?.refresh?.();
    notifyWorkspaceHistoryChanged("image");
  }

  function handleGenerated(image) {
    setGeneratedImage(image);
    syncHistory();
    if (image?.id) setSearchParams({ image: image.id }, { replace: true });
  }

  function handleSelect(image) {
    setGeneratedImage(image);
    setHistoryOpen(false);
    setSearchParams({ image: image.id }, { replace: true });
  }

  function handleDeleted(deletedImage) {
    if (!deletedImage || String(deletedImage.id) === String(generatedImage?.id)) {
      setGeneratedImage(null);
      setSearchParams({}, { replace: true });
    }
    syncHistory();
  }

  function handleFavorite(updated) {
    if (updated?.id && String(updated.id) === String(generatedImage?.id)) {
      setGeneratedImage(updated);
    }
    syncHistory();
  }

  function startNew() {
    setGeneratedImage(null);
    setSearchParams({ new: "1" }, { replace: true });
  }

  return (
    <div className="min-h-full bg-[#050713] text-white">
      <div className="mx-auto flex w-full max-w-[1540px] flex-col gap-3">
        <header className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-500 shadow-lg shadow-fuchsia-950/30"><ImageIcon size={17} /></span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-fuchsia-300"><Sparkles size={11} /> Image studio</div>
              <h1 className="truncate text-lg font-black sm:text-xl">Create, compare and manage</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setHistoryOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-slate-300 xl:hidden">
              <History size={14} /><span className="hidden sm:inline">History</span>
            </button>
            <button type="button" onClick={startNew} className="inline-flex h-9 items-center gap-2 rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 text-xs font-bold text-fuchsia-100 transition hover:bg-fuchsia-500/20">
              <Plus size={14} /> New
            </button>
          </div>
        </header>

        {historyOpen && <button type="button" aria-label="Close history" onClick={() => setHistoryOpen(false)} className="fixed inset-0 z-[1190] bg-black/70 backdrop-blur-sm xl:hidden" />}

        <main className="grid min-h-[calc(100dvh-118px)] min-w-0 gap-3 xl:grid-cols-[280px_350px_minmax(0,1fr)]">
          <div className={`${historyOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-[1200] w-[min(88vw,320px)] p-3 transition-transform duration-200 xl:static xl:z-auto xl:w-auto xl:translate-x-0 xl:p-0`}>
            <div className="relative h-full min-h-0">
              <button type="button" onClick={() => setHistoryOpen(false)} className="absolute right-3 top-3 z-20 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-[#111827] text-slate-400 xl:hidden" aria-label="Close history"><PanelLeftClose size={15} /></button>
              <ImageHistorySidebar ref={historyRef} selectedId={generatedImage?.id || selectedImageId} onSelect={handleSelect} onDeleted={handleDeleted} onFavorite={handleFavorite} />
            </div>
          </div>

          <PromptCard onGenerated={handleGenerated} onLoadingChange={setLoading} />

          <section className="min-h-[430px] min-w-0 overflow-hidden">
            {loading ? <ImageSkeleton /> : generatedImage ? (
              <GeneratedImageCard image={generatedImage} onDeleted={handleDeleted} onFavorite={handleFavorite} onRegenerated={handleGenerated} />
            ) : <EmptyImageState />}
          </section>
        </main>
      </div>
    </div>
  );
}