import { useRef, useState } from "react";
import { Image as ImageIcon, Sparkles } from "lucide-react";
import PromptCard from "../components/image/PromptCard";
import GeneratedImageCard from "../components/image/GeneratedImageCard";
import ImageHistorySidebar from "../components/image/ImageHistorySidebar";
import ImageSkeleton from "../components/image/ImageSkeleton";
import EmptyImageState from "../components/image/EmptyImageState";

export default function ImageGeneratorPage() {
  const [generatedImage, setGeneratedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const historyRef = useRef(null);

  function handleGenerated(image) {
    setGeneratedImage(image);
    historyRef.current?.refresh();
  }

  function handleDeleted() {
    setGeneratedImage(null);
    historyRef.current?.refresh();
  }

  function handleFavorite() {
    historyRef.current?.refresh();
  }

  return (
    <div className="min-h-full bg-[#050713] text-white">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-5">
        <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.20),transparent_38%),linear-gradient(135deg,rgba(17,24,39,0.96),rgba(8,13,28,0.96))] p-5 shadow-2xl shadow-black/30 md:p-6">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "38px 38px" }} />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-lg shadow-fuchsia-950/40">
                <ImageIcon size={22} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-fuchsia-300">CareerForge Image AI</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">Generate, edit, preview, and reuse images.</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Prompt se image banao, uploaded image ko edit karo, history se purane outputs select karo, aur preview/download actions yahin se manage karo.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300">
              <Sparkles size={14} className="text-fuchsia-300" /> Backend history synced
            </div>
          </div>
        </section>

        <section className="grid min-h-[calc(100vh-190px)] gap-5 xl:grid-cols-[300px_minmax(360px,0.82fr)_minmax(420px,1.18fr)]">
          <ImageHistorySidebar ref={historyRef} selectedId={generatedImage?.id} onSelect={setGeneratedImage} />
          <PromptCard onGenerated={handleGenerated} onLoadingChange={setLoading} />
          {loading ? <ImageSkeleton /> : generatedImage ? (
            <GeneratedImageCard image={generatedImage} onDeleted={handleDeleted} onFavorite={handleFavorite} onRegenerated={handleGenerated} />
          ) : <EmptyImageState />}
        </section>
      </div>
    </div>
  );
}
