import { Check, FileCheck2, ScanSearch, ShieldCheck, Sparkles, Flame } from "lucide-react";

const features = [
  [FileCheck2, "ATS-ready resumes", "Clean structure that hiring systems can read.", "#fbbf24", "#f59e0b"],
  [ScanSearch, "Role-by-role matching", "Tailor skills and achievements for each application.", "#e879f9", "#c026d3"],
  [ShieldCheck, "Private by design", "Your career data remains under your control.", "#a78bfa", "#7c3aed"],
];

export default function AuthLeftPanel() {
  return (
    <aside className="relative hidden min-h-0 overflow-hidden bg-[#0a0713] lg:flex lg:flex-col lg:justify-between lg:p-10">

      {/* Ambient glow — only 2 layers, smaller blur radius, GPU-hinted.
          No animation on large blurred elements (that was the main lag
          source: animating a 90px-blur circle forces a full repaint
          on every frame). One tiny accent pulses instead — cheap because
          it's small and only opacity changes, no blur recalculation. */}
      <div className="pointer-events-none absolute inset-0 [contain:paint]">
        <div
          className="absolute -top-24 -left-20 h-96 w-96 rounded-full bg-gradient-to-br from-amber-400/25 via-fuchsia-500/20 to-violet-600/25 blur-[70px] [will-change:transform] [transform:translateZ(0)]"
        />
        <div
          className="absolute -bottom-28 -right-16 h-80 w-80 rounded-full bg-violet-600/20 blur-[70px] [will-change:transform] [transform:translateZ(0)]"
        />
        <div className="absolute top-1/3 right-10 h-2 w-2 rounded-full bg-amber-300/80 animate-pulse [will-change:opacity]" />
      </div>

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-fuchsia-500 to-violet-600 shadow-[0_8px_20px_-4px_rgba(217,70,239,0.5)]">
          <Flame size={16} className="text-white" strokeWidth={2.5} />
        </span>
        <span className="text-white font-black text-[14px] tracking-tight">CareerForge AI</span>
      </div>

      {/* Hero + feature cards */}
      <div className="relative z-10 max-w-md">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.05] p-7 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.6)] backdrop-blur-xl [contain:layout_paint]">

          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5">
            <Sparkles size={13} className="text-amber-300" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-white">Your career operating system</p>
          </div>

          <h2 className="mt-5 text-4xl font-black leading-[1.1] text-white xl:text-[42px]">
            Turn your experience into your{" "}
            <span className="bg-gradient-to-r from-amber-300 via-fuchsia-300 to-violet-300 bg-clip-text text-transparent">
              next opportunity.
            </span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
            Build stronger applications, prepare for interviews, and keep every opportunity moving.
          </p>

          <div className="mt-8 space-y-3">
            {features.map(([Icon, title, text, c1, c2]) => (
              <div
                key={title}
                className="flex gap-3.5 rounded-2xl border border-white/10 bg-white/[0.05] p-4 shadow-[0_8px_22px_-10px_rgba(0,0,0,0.4)] transition-colors duration-150 hover:bg-white/[0.09] hover:border-white/20"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${c1}, ${c2})`,
                    boxShadow: `0 6px 18px ${c1}55`,
                  }}
                >
                  <Icon size={19} className="text-white" />
                </span>
                <div>
                  <p className="text-sm font-bold text-white">{title}</p>
                  <p className="mt-1 text-xs leading-5 text-white/60">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trust badge */}
      <p className="relative z-10 flex items-center gap-2 text-xs text-white/60">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/25">
          <Check size={12} className="text-emerald-300" />
        </span>
        Trusted by 12,000+ ambitious job seekers
      </p>
    </aside>
  );
}