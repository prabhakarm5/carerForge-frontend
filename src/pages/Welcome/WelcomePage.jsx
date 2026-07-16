import { useNavigate } from "react-router-dom";
import {
  ArrowRight, BriefcaseBusiness, FileText, Image, MessageSquare, Sparkles, Video,
} from "lucide-react";
import useAuthStore from "../../store/authStore";

const WORKSPACES = [
  { title: "Career Chat", detail: "Ask, plan and build", path: "/chat", icon: MessageSquare, iconClass: "bg-emerald-950/70 text-emerald-300" },
  { title: "Resume Studio", detail: "Analyze or create", path: "/resume", icon: FileText, iconClass: "bg-orange-950/70 text-orange-300" },
  { title: "Interview Room", detail: "Practice with Maya", path: "/interview", icon: Video, iconClass: "bg-cyan-950/70 text-cyan-300" },
  { title: "Live Jobs", detail: "Search current roles", path: "/jobs", icon: BriefcaseBusiness, iconClass: "bg-yellow-950/70 text-yellow-200" },
  { title: "Image Studio", detail: "Create visual assets", path: "/image-generator", icon: Image, iconClass: "bg-pink-950/70 text-pink-300" },
];

export default function WelcomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";

  return (
    <main className="min-h-full overflow-auto bg-[#070b14] px-3 py-6 text-slate-50 sm:px-[5vw] sm:py-[clamp(28px,6vh,72px)]">
      <header className="mx-auto mb-5 w-full max-w-[940px] sm:mb-7">
        <span className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-cyan-300">
          <Sparkles size={14} /> CareerForge AI
        </span>
        <h1 className="mt-2.5 text-[30px] font-black leading-none sm:text-[clamp(34px,5vw,54px)]">Welcome, {firstName}</h1>
        <p className="mt-2 text-[13px] text-slate-400">Where would you like to begin?</p>
      </header>

      <section className="mx-auto grid w-full max-w-[940px] grid-cols-1 gap-2.5 sm:grid-cols-2" aria-label="Choose a workspace">
        {WORKSPACES.map(({ title, detail, path, icon: Icon, iconClass }, index) => (
          <button
            className={`grid min-h-[76px] min-w-0 grid-cols-[42px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-slate-700/80 bg-[#0b1320] p-3 text-left text-slate-100 transition hover:-translate-y-px hover:border-slate-500 hover:bg-[#101b2a] sm:min-h-[88px] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:p-3.5 ${index === 0 ? "sm:col-span-2" : ""}`}
            type="button"
            key={path}
            onClick={() => navigate(path)}
          >
            <span className={`grid h-10 w-10 place-items-center rounded-lg sm:h-[46px] sm:w-[46px] ${iconClass}`}><Icon size={22} /></span>
            <span className="min-w-0">
              <strong className="block truncate text-sm">{title}</strong>
              <small className="mt-1 block truncate text-[10px] text-slate-400">{detail}</small>
            </span>
            <ArrowRight size={17} className="text-slate-500" />
          </button>
        ))}
      </section>

      <button className="mx-auto mt-5 flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200" type="button" onClick={() => navigate("/dashboard")}>
        Open dashboard <ArrowRight size={14} />
      </button>
    </main>
  );
}