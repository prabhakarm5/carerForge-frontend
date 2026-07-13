import { useEffect, useState } from "react";
import { Image as ImageIcon, Plus, Sparkles } from "lucide-react";
import { useSearchParams } from "react-router-dom";

import PromptCard from "../components/image/PromptCard";
import GeneratedImageCard from "../components/image/GeneratedImageCard";
import ImageSkeleton from "../components/image/ImageSkeleton";
import EmptyImageState from "../components/image/EmptyImageState";
import { getImageHistory } from "../services/imageService";
import { notifyWorkspaceHistoryChanged, publishWorkspaceContext } from "../services/workspaceEvents";

export default function ImageGeneratorPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedImageId = searchParams.get("image");
  const startNewRequested = searchParams.get("new") === "1";
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (startNewRequested) return;
    if (!selectedImageId) return;
    let cancelled = false;
    getImageHistory()
      .then((items) => {
        if (cancelled) return;
        const selected = (Array.isArray(items) ? items : []).find((item) => String(item.id) === selectedImageId);
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

  function handleGenerated(image) {
    setGeneratedImage(image);
    notifyWorkspaceHistoryChanged("image");
    if (image?.id) setSearchParams({ image: image.id }, { replace: true });
  }

  function handleDeleted() {
    setGeneratedImage(null);
    notifyWorkspaceHistoryChanged("image");
    setSearchParams({}, { replace: true });
  }

  function handleFavorite() {
    notifyWorkspaceHistoryChanged("image");
  }

  function startNew() {
    setGeneratedImage(null);
    setSearchParams({ new: "1" });
  }

  return (
    <div className="min-h-full bg-[#050713] text-white">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-4">
        <header className="flex flex-col gap-3 border-b border-white/[0.07] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-500 shadow-lg shadow-fuchsia-950/30"><ImageIcon size={19} /></span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase text-fuchsia-300"><Sparkles size={12} /> Image workspace</div>
              <h1 className="truncate text-xl font-black sm:text-2xl">Create and refine images</h1>
              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">Generate, edit and manage outputs from one focused workspace.</p>
            </div>
          </div>
          <button type="button" onClick={startNew} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 text-xs font-bold text-fuchsia-200 transition hover:bg-fuchsia-500/20">
            <Plus size={14} /> New image
          </button>
        </header>

        <main className="grid min-h-[calc(100dvh-142px)] min-w-0 gap-4 lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]">
          <PromptCard onGenerated={handleGenerated} onLoadingChange={setLoading} />
          <div className="min-h-[420px] min-w-0 overflow-hidden">
            {loading ? <ImageSkeleton /> : generatedImage ? (
              <GeneratedImageCard image={generatedImage} onDeleted={handleDeleted} onFavorite={handleFavorite} onRegenerated={handleGenerated} />
            ) : <EmptyImageState />}
          </div>
        </main>
      </div>
    </div>
  );
}