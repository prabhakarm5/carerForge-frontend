import { Loader2, Sparkles } from "lucide-react";

export default function ImageSkeleton() {
  return (
    <div className="flex min-h-[520px] flex-col items-center justify-center rounded-2xl border border-white/10 bg-[#101624] p-8 text-center shadow-2xl shadow-black/20">
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-fuchsia-500/25 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl border border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-300">
          <Loader2 className="animate-spin" size={34} />
        </div>
      </div>
      <h2 className="mt-7 text-2xl font-black text-white">Creating your image</h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">AI drawing chal raha hai. Preview ready hote hi yahin dikhega.</p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-400"><Sparkles size={13} /> Backend is processing</div>
    </div>
  );
}
