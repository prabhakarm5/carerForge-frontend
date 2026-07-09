import { Check, FileCheck2, ScanSearch, ShieldCheck, Sparkles } from "lucide-react";
import BrandLogo from "../../shared/BrandLogo";

const features = [
  [FileCheck2, "ATS-ready resumes", "Clean structure that hiring systems can read.", "#ff8a65"],
  [ScanSearch, "Role-by-role matching", "Tailor skills and achievements for each application.", "#a78bfa"],
  [ShieldCheck, "Private by design", "Your career data remains under your control.", "#38bdf8"],
];

export default function AuthLeftPanel() {
  return (
    <aside className="relative hidden min-h-0 overflow-hidden bg-gradient-to-br from-[#2b1055] via-[#6b21a8] to-[#c026d3] lg:flex lg:flex-col lg:justify-between lg:p-10">

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-20 h-96 w-96 rounded-full bg-[#ff6b4a]/30 blur-[90px]" />
        <div className="absolute top-1/3 -right-16 h-80 w-80 rounded-full bg-[#38bdf8]/25 blur-[80px]" />
        <div className="absolute -bottom-28 left-1/4 h-96 w-96 rounded-full bg-[#facc15]/15 blur-[90px]" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage: "radial-gradient(circle at 25% 30%, black, transparent 70%)",
          }}
        />
      </div>

      <BrandLogo className="relative z-10 text-white" />

      <div className="relative z-10 max-w-md">
        <div className="rounded-[28px] border border-white/15 bg-white/10 p-7 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.5)] transition-transform duration-300 ease-out hover:-translate-y-1">

          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3.5 py-1.5">
            <Sparkles size={13} className="text-[#ffb199]" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-white">Your career operating system</p>
          </div>

          <h2 className="mt-5 text-4xl font-black leading-[1.1] text-white xl:text-[42px]">
            Turn your experience into your{" "}
            <span className="bg-gradient-to-r from-[#ff9a6b] via-[#ffd36b] to-[#a78bfa] bg-clip-text text-transparent">
              next opportunity.
            </span>
          </h2>
          <p className="mt-5 max-w-sm text-sm leading-7 text-white/70">
            Build stronger applications, prepare for interviews, and keep every opportunity moving.
          </p>

          <div className="mt-8 space-y-3">
            {features.map(([Icon, title, text, color]) => (
              <div
                key={title}
                className="flex gap-3.5 rounded-2xl border border-white/15 bg-white/[0.06] p-4 shadow-[0_8px_22px_-10px_rgba(0,0,0,0.4)] transition-colors duration-150 hover:bg-white/[0.1]"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, ${color}, ${color}bb)`,
                    boxShadow: `0 6px 18px ${color}55`,
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

      <p className="relative z-10 flex items-center gap-2 text-xs text-white/60">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/25">
          <Check size={12} className="text-emerald-300" />
        </span>
        Trusted by 12,000+ ambitious job seekers
      </p>
    </aside>
  );
}