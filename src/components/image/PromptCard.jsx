import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, ChevronDown, ImagePlus, LoaderCircle, Send, Sparkles, Type, Wand2, Zap } from "lucide-react";
import toast from "react-hot-toast";
import ImageUploader from "./ImageUploader";
import { generateImage, getImageModels } from "../../services/imageService";
import { VoiceInputButton } from "../voice/VoiceControls";

const quickPrompts = [
  ["Product", "Premium product photography, dramatic studio lighting, realistic materials, commercial composition"],
  ["Portrait", "Editorial portrait with natural window light, realistic skin texture, 85mm photography"],
  ["City", "Futuristic Indian city at blue hour, cinematic depth, detailed architecture"],
  ["3D icon", "Minimal 3D app icon, translucent materials, clean background, premium lighting"],
];

export default function PromptCard({ onGenerated, onLoadingChange }) {
  const [mode, setMode] = useState("create");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [modelsOpen, setModelsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    getImageModels()
      .then((items) => {
        if (!active) return;
        const list = Array.isArray(items) ? items : [];
        setModels(list);
        setSelectedModel(list.find((item) => item.defaultModel)?.id || list[0]?.id || "");
      })
      .catch(() => toast.error("Image models could not be loaded"))
      .finally(() => active && setModelsLoading(false));
    return () => { active = false; };
  }, []);

  const selected = useMemo(
    () => models.find((model) => model.id === selectedModel),
    [models, selectedModel],
  );

  const visibleModels = useMemo(
    () => mode === "edit" ? models.filter((model) => model.supportsImageInput) : models,
    [mode, models],
  );

  function changeMode(nextMode) {
    setModelsOpen(false);
    if (nextMode === "edit") {
      const editModel = models.find((model) => model.supportsImageInput);
      if (!editModel) return toast.error("No image editing model is configured yet.");
      if (!selected?.supportsImageInput) setSelectedModel(editModel.id);
    } else if (selected?.requiresImageInput) {
      const createModel = models.find((model) => !model.requiresImageInput);
      if (createModel) setSelectedModel(createModel.id);
      setImage(null);
    }
    setMode(nextMode);
  }

  function selectModel(model) {
    setSelectedModel(model.id);
    setModelsOpen(false);
    if (model.requiresImageInput) setMode("edit");
  }

  async function handleGenerate() {
    if (!prompt.trim()) return toast.error("Describe the image you want to create.");
    if (!selectedModel) return toast.error("Choose an image model first.");
    if (mode === "edit" && !image) return toast.error("Upload a reference image to edit.");
    if (image && !selected?.supportsImageInput) return toast.error("This model does not support image editing.");

    try {
      setLoading(true);
      onLoadingChange?.(true);
      const response = await generateImage(prompt.trim(), mode === "edit" ? image : null, selectedModel);
      toast.success(mode === "edit" ? "Edited image saved to history" : "Image saved to history");
      onGenerated?.(response);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Image generation failed");
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-white/10 bg-[#0c111d] shadow-2xl shadow-black/20">
      <div className="shrink-0 border-b border-white/[0.07] p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg border border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300"><Wand2 size={17} /></span>
          <div><h2 className="text-sm font-black text-white">Image studio</h2><p className="mt-0.5 text-[10px] text-slate-500">Generate new visuals or transform an upload</p></div>
        </div>
        <div className="mt-4 grid grid-cols-2 rounded-lg border border-white/10 bg-[#060913] p-1">
          <button type="button" onClick={() => changeMode("create")} className={`flex h-9 items-center justify-center gap-2 rounded-md text-[11px] font-bold transition ${mode === "create" ? "bg-fuchsia-500/15 text-fuchsia-200" : "text-slate-500 hover:text-white"}`}><Type size={13} /> Create</button>
          <button type="button" onClick={() => changeMode("edit")} className={`flex h-9 items-center justify-center gap-2 rounded-md text-[11px] font-bold transition ${mode === "edit" ? "bg-cyan-500/15 text-cyan-200" : "text-slate-500 hover:text-white"}`}><ImagePlus size={13} /> Edit image</button>
        </div>
      </div>

      <div className="image-prompt-scroll min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="relative">
          <div className="mb-2 flex items-center justify-between"><label className="text-[10px] font-extrabold uppercase text-slate-500">Model</label><span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-300"><BadgeCheck size={10} /> Key secured</span></div>
          <button type="button" onClick={() => setModelsOpen((open) => !open)} disabled={modelsLoading || loading} className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-white/10 bg-[#060913] px-3 text-left transition hover:border-fuchsia-400/30 disabled:opacity-60">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-cyan-500/15 text-fuchsia-300"><Zap size={14} /></span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-white">{modelsLoading ? "Loading models..." : selected?.label || "Choose model"}</strong><small className="block truncate text-[9px] text-slate-500">{selected?.provider || "Provider"} / {selected?.accessLabel || "Configured"}</small></span>
            {modelsLoading ? <LoaderCircle size={14} className="animate-spin text-slate-500" /> : <ChevronDown size={14} className={`text-slate-500 transition ${modelsOpen ? "rotate-180" : ""}`} />}
          </button>

          {modelsOpen && (
            <div className="absolute left-0 right-0 top-[76px] z-30 max-h-72 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-[#101624] p-1.5 shadow-2xl shadow-black/70">
              {visibleModels.map((model) => (
                <button key={model.id} type="button" onClick={() => selectModel(model)} className={`flex w-full items-start gap-2.5 rounded-lg border p-2.5 text-left transition ${model.id === selectedModel ? "border-fuchsia-400/30 bg-fuchsia-500/10" : "border-transparent hover:bg-white/[0.05]"}`}>
                  <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${model.provider === "HUGGING_FACE" ? "bg-amber-400/10 text-amber-300" : "bg-cyan-400/10 text-cyan-300"}`}><Sparkles size={12} /></span>
                  <span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="truncate text-[11px] text-white">{model.label || model.id}</strong><em className="shrink-0 rounded bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-bold not-italic text-emerald-300">{model.accessLabel || model.provider}</em></span><small className="mt-1 line-clamp-2 block text-[9px] leading-4 text-slate-500">{model.description}</small>{model.supportsImageInput && <span className="mt-1 inline-flex text-[8px] font-bold text-cyan-300">Image editing</span>}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {mode === "edit" && <ImageUploader image={image} setImage={setImage} disabled={loading} />}

        <div>
          <div className="mb-2 flex items-center justify-between"><label className="text-[10px] font-extrabold uppercase text-slate-500">{mode === "edit" ? "Edit instructions" : "Prompt"}</label><span className="text-[9px] text-slate-600">{prompt.length}/2000</span></div>
          <div className="relative">
            <textarea rows={mode === "edit" ? 5 : 7} maxLength={2000} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder={mode === "edit" ? "Keep the person, change the background to a modern office..." : "A cinematic portrait, soft rim lighting, realistic detail..."} className="w-full resize-none rounded-lg border border-white/10 bg-[#060913] p-3.5 pr-11 text-xs leading-5 text-white outline-none placeholder:text-slate-700 focus:border-fuchsia-400/45" />
            <VoiceInputButton value={prompt} onChange={setPrompt} disabled={loading} className="absolute bottom-3 right-3 grid h-7 w-7 place-items-center rounded-md border border-white/10 bg-white/[0.05] text-slate-400 hover:text-fuchsia-300" title="Speak prompt" />
          </div>
        </div>

        {mode === "create" && <div><p className="mb-2 text-[10px] font-extrabold uppercase text-slate-600">Prompt ideas</p><div className="flex flex-wrap gap-1.5">{quickPrompts.map(([label, value]) => <button key={label} type="button" onClick={() => setPrompt(value)} className="rounded-md border border-white/[0.07] bg-white/[0.025] px-2 py-1.5 text-[9px] text-slate-400 hover:border-fuchsia-400/25 hover:text-slate-200">{label}</button>)}</div></div>}
      </div>

      <div className="shrink-0 border-t border-white/[0.07] p-4">
        <button type="button" onClick={handleGenerate} disabled={loading || !selectedModel} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-600 text-xs font-black text-white shadow-lg shadow-fuchsia-950/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? <><LoaderCircle className="animate-spin" size={16} /> {mode === "edit" ? "Editing and saving..." : "Creating and saving..."}</> : <><Send size={15} /> {mode === "edit" ? "Transform image" : "Generate image"} <Sparkles size={13} /></>}
        </button>
      </div>
      <style>{`.image-prompt-scroll::-webkit-scrollbar{width:4px}.image-prompt-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:999px}`}</style>
    </section>
  );
}