import { useState } from "react";
import { Loader2, Send, Sparkles, Wand2 } from "lucide-react";
import toast from "react-hot-toast";
import ImageUploader from "./ImageUploader";
import { generateImage } from "../../services/imageService";
import { VoiceInputButton } from "../voice/VoiceControls";

const quickPrompts = [
  "A premium SaaS dashboard hero image, dark mode, glass UI, 3D depth",
  "Professional LinkedIn banner for an AI resume builder brand",
  "Modern app icon concept for CareerForge AI, polished gradient",
];

export default function PromptCard({ onGenerated, onLoadingChange }) {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error("Prompt likho bhai, phir image banega.");
      return;
    }
    try {
      setLoading(true);
      onLoadingChange?.(true);
      const response = await generateImage(prompt.trim(), image);
      toast.success("Image generated successfully");
      onGenerated?.(response);
    } catch (error) {
      toast.error(error.response?.data?.message || "Image generation failed");
    } finally {
      setLoading(false);
      onLoadingChange?.(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#101624] shadow-2xl shadow-black/20">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-300"><Wand2 size={20} /></span>
          <div>
            <h2 className="text-lg font-black text-white">Create image</h2>
            <p className="text-xs text-slate-500">Generate new images or edit an upload</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5">
        <ImageUploader image={image} setImage={setImage} />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wide text-slate-400">Prompt</label>
            <span className="text-[11px] font-semibold text-yellow-300">200 tokens</span>
          </div>
          <div className="relative">
          <textarea
            rows={7}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={image ? "Describe exactly how to edit this image..." : "Describe the image you want to generate..."}
            className="w-full resize-none rounded-2xl border border-white/10 bg-[#070b16] p-4 pr-12 text-sm leading-6 text-white outline-none placeholder:text-slate-600 focus:border-fuchsia-400/70"
          />
          <VoiceInputButton value={prompt} onChange={setPrompt} disabled={loading} className="absolute bottom-3 right-3 grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.06] text-slate-300 hover:text-fuchsia-300" title="Speak image prompt" />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Quick ideas</p>
          {quickPrompts.map((item) => (
            <button key={item} type="button" onClick={() => setPrompt(item)} className="block w-full rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-left text-xs leading-5 text-slate-300 hover:border-fuchsia-400/40 hover:bg-fuchsia-500/[0.06]">
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 p-5">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-fuchsia-950/30 transition hover:from-fuchsia-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <><Loader2 className="animate-spin" size={18} /> Generating...</> : <><Send size={17} /> Generate image <Sparkles size={15} /></>}
        </button>
      </div>
    </div>
  );
}
