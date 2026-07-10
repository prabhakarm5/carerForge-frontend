import { Check, FileCheck2, ScanSearch, ShieldCheck, Sparkles, Flame, ArrowUpRight, Layers3 } from "lucide-react";

const features = [
  [FileCheck2, "ATS-ready resumes", "Clean structure that hiring systems can read.", "#22d3ee", "#2563eb"],
  [ScanSearch, "Role-by-role matching", "Tailor skills and achievements for each application.", "#f97316", "#ef4444"],
  [ShieldCheck, "Private by design", "Your career data remains under your control.", "#a3e635", "#16a34a"],
];

export default function AuthLeftPanel() {
  return (
    <aside
      className="relative hidden min-h-0 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-9 xl:p-10 2xl:p-12"
      style={{ background: "#07060e" }}
    >
      {/* Background layers — pure CSS, static, no JS mousemove tilt (removed for perf) */}
      <div className="pointer-events-none absolute inset-0 [contain:paint]">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(145deg, rgba(251,191,36,0.17), rgba(217,70,239,0.14) 45%, rgba(124,58,237,0.19) 78%, #07060e)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
          }}
        />
        <div
          className="absolute -top-24 -left-16 w-[380px] h-[380px] rounded-full blur-[110px]"
          style={{ background: "radial-gradient(circle, rgba(245,158,11,0.2), transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -right-16 w-[420px] h-[420px] rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.22), transparent 70%)" }}
        />
      </div>

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-10 w-10 place-items-center rounded-xl shadow-[0_12px_28px_-10px_rgba(34,211,238,0.75)]"
            style={{ background: "linear-gradient(135deg, #fbbf24, #d946ef 55%, #7c3aed)" }}
          >
            <Flame size={17} color="#ffffff" strokeWidth={2.5} />
          </span>
          <span className="font-black text-[14px] tracking-tight" style={{ color: "#ffffff" }}>
            CareerForge AI
          </span>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-bold"
          style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
        >
          Secure login
        </span>
      </div>

      {/* Middle content */}
      <div className="relative z-10 max-w-md">
        <div
          className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5"
          style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
        >
          <Sparkles size={13} color="#fde68a" />
          <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.85)" }}>
            Your career operating system
          </p>
        </div>

        <h2 className="mt-5 text-[30px] xl:text-[34px] 2xl:text-[42px] font-black leading-[1.08]" style={{ color: "#ffffff" }}>
          Where your career gets forged.
        </h2>
        <p className="mt-5 max-w-sm text-sm leading-7" style={{ color: "rgba(255,255,255,0.7)" }}>
          Sign in with password, Google, or GitHub and continue right where your workspace stopped.
        </p>

        <div className="mt-8 grid gap-3">
          {features.map(([Icon, title, text, c1, c2]) => (
            <div
              key={title}
              className="flex gap-3.5 rounded-2xl p-4 transition-colors duration-150 hover:opacity-90"
              style={{ border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.06)" }}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
              >
                <Icon size={19} color="#ffffff" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: "#ffffff" }}>{title}</p>
                <p className="mt-1 text-xs leading-5" style={{ color: "rgba(255,255,255,0.6)" }}>{text}</p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-7 flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ border: "1px solid rgba(253,230,138,0.15)", background: "rgba(253,230,138,0.08)", color: "#fffbeb" }}
        >
          <div className="flex items-center gap-3">
            <Layers3 size={18} />
            <span className="text-sm font-bold">Fast session restore</span>
          </div>
          <ArrowUpRight size={18} />
        </div>
      </div>

      {/* Footer note */}
      <p className="relative z-10 flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
        <span
          className="flex h-5 w-5 items-center justify-center rounded-full"
          style={{ background: "rgba(52,211,153,0.25)" }}
        >
          <Check size={12} color="#6ee7b7" />
        </span>
        Refresh token stays httpOnly. Access token stays in app memory.
      </p>
    </aside>
  );
}