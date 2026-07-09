import { ImageIcon, Sparkles } from "lucide-react";

export default function EmptyImageState() {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#101624] p-8 text-center shadow-2xl shadow-black/20">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/[0.05] text-fuchsia-300">
        <Sparkles size={34} />
      </div>
      <h2 className="mt-7 text-2xl font-black text-white">Preview will appear here</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">Prompt generate karo ya history se image select karo. Preview, prompt, tokens, favorite, download sab yahin milega.</p>
      <ImageIcon size={58} className="mt-8 text-slate-700" />
    </div>
  );
}
