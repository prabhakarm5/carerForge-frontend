import { Check, FileCheck2, ScanSearch, ShieldCheck, Sparkles, Flame, ArrowUpRight, Layers3 } from "lucide-react";

const features = [
  [FileCheck2, "ATS-ready resumes", "Clean structure that hiring systems can read.", "#22d3ee", "#2563eb"],
  [ScanSearch, "Role-by-role matching", "Tailor skills and achievements for each application.", "#f97316", "#ef4444"],
  [ShieldCheck, "Private by design", "Your career data remains under your control.", "#a3e635", "#16a34a"],
];

export default function AuthLeftPanel() {
  return (
    <aside className="relative hidden min-h-0 overflow-hidden bg-[#0a0713] lg:flex lg:flex-col lg:justify-between lg:p-10">
      <div className="pointer-events-none absolute inset-0 [contain:paint]">
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(245,158,11,0.16),rgba(217,70,239,0.13)_45%,rgba(124,58,237,0.18)_78%,rgba(10,7,19,1))]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(255,255,255,.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.18)_1px,transparent_1px)] [background-size:42px_42px]" />
      </div>

      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-amber-400 via-fuchsia-500 to-violet-600 shadow-[0_12px_28px_-10px_rgba(34,211,238,0.8)]">
            <Flame size={17} className="text-white" strokeWidth={2.5} />
          </span>
          <span className="text-white font-black text-[14px] tracking-tight">CareerForge AI</span>
        </div>
        <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-bold text-white/70">Secure login</span>
      </div>

      <div className="relative z-10 max-w-md">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5">
          <Sparkles size={13} className="text-amber-200" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-white/85">Your career operating system</p>
        </div>

        <h2 className="mt-5 text-[34px] font-black leading-[1.08] text-white xl:text-[42px]">
          Where your career gets forged.
        </h2>
        <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
          Sign in with password, Google, or GitHub and continue right where your workspace stopped.
        </p>

        <div className="mt-8 grid gap-3">
          {features.map(([Icon, title, text, c1, c2]) => (
            <div
              key={title}
              className="flex gap-3.5 rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition-colors duration-150 hover:bg-white/[0.1]"
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
              >
                <Icon size={19} className="text-white" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-white/60">{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between rounded-2xl border border-amber-200/15 bg-amber-200/[0.08] px-4 py-3 text-amber-50">
          <div className="flex items-center gap-3">
            <Layers3 size={18} />
            <span className="text-sm font-bold">Fast session restore</span>
          </div>
          <ArrowUpRight size={18} />
        </div>
      </div>

      <p className="relative z-10 flex items-center gap-2 text-xs text-white/65">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/25">
          <Check size={12} className="text-emerald-300" />
        </span>
        Refresh token stays httpOnly. Access token stays in app memory.
      </p>
    </aside>
  );
}