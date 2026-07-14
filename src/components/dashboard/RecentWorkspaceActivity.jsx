import { useEffect, useMemo, useState } from "react";
import { FileText, Image as ImageIcon, Mail, MessageSquare, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getRecentChats } from "../../services/conversationService";
import { getImageHistory } from "../../services/imageService";
import { getResumeProjects } from "../../services/resumeService";
import { getCoverLetters } from "../../services/coverLetterService";

const TYPES = {
  chat: { label: "Chats", Icon: MessageSquare, color: "text-cyan-300", bg: "bg-cyan-400/10" },
  resume: { label: "Resumes", Icon: FileText, color: "text-orange-300", bg: "bg-orange-400/10" },
  image: { label: "Images", Icon: ImageIcon, color: "text-fuchsia-300", bg: "bg-fuchsia-400/10" },
  coverLetter: { label: "Letters", Icon: Mail, color: "text-cyan-300", bg: "bg-cyan-400/10" },
};

function normalize(type, items) {
  return (Array.isArray(items) ? items : []).map((item) => ({
    ...item,
    type,
    title: type === "chat" ? (item.title || "Untitled chat")
      : type === "resume" ? (item.fileName || "Resume analysis")
      : type === "coverLetter" ? `${item.role || "Role"} at ${item.company || "Company"}`
      : (item.prompt || "Generated image"),
    date: item.updatedAt || item.createdAt,
  }));
}

export default function RecentWorkspaceActivity() {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState("all");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    const results = await Promise.allSettled([getRecentChats(), getResumeProjects(), getImageHistory(), getCoverLetters()]);
    const next = [
      ...normalize("chat", results[0].status === "fulfilled" ? results[0].value : []),
      ...normalize("resume", results[1].status === "fulfilled" ? results[1].value : []),
      ...normalize("image", results[2].status === "fulfilled" ? results[2].value : []),
      ...normalize("coverLetter", results[3].status === "fulfilled" ? results[3].value : []),
    ].sort((left, right) => new Date(right.date || 0) - new Date(left.date || 0));
    setItems(next);
    setError(results.every((result) => result.status === "rejected"));
    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const visible = useMemo(() => items
    .filter((item) => activeType === "all" || item.type === activeType)
    .slice(0, 8), [activeType, items]);

  function open(item) {
    if (item.type === "chat") navigate(`/chat/${item.id}`);
    if (item.type === "resume") navigate(`/resume?project=${encodeURIComponent(item.id)}`);
    if (item.type === "image") navigate(`/image-generator?image=${encodeURIComponent(item.id)}`);
    if (item.type === "coverLetter") navigate(`/cover-letter?letter=${encodeURIComponent(item.id)}`);
  }

  return (
    <section className="min-w-0 border border-white/[0.08] bg-[#0b1220] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-base font-bold text-white sm:text-lg">Recent work</h2><p className="mt-0.5 text-[11px] text-slate-500">Chat, resume, cover letter and image history</p></div>
        <div className="flex items-center gap-1 rounded-md border border-white/[0.07] bg-white/[0.025] p-1">
          {[{ id: "all", label: "All" }, ...Object.entries(TYPES).map(([id, value]) => ({ id, label: value.label }))].map((tab) => (
            <button key={tab.id} type="button" onClick={() => setActiveType(tab.id)} className={`h-7 rounded px-2.5 text-[10px] font-bold transition ${activeType === tab.id ? "bg-cyan-400 text-slate-950" : "text-slate-500 hover:text-slate-200"}`}>{tab.label}</button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-2 sm:grid-cols-2">
        {loading && Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-md bg-white/[0.035]" />)}
        {!loading && error && <div className="col-span-full py-10 text-center text-xs text-slate-500"><p>Could not load workspace history</p><button type="button" onClick={load} className="mt-2 inline-flex items-center gap-1 text-cyan-300"><RotateCcw size={12} /> Retry</button></div>}
        {!loading && !error && visible.length === 0 && <div className="col-span-full py-10 text-center text-xs text-slate-600">No {activeType === "all" ? "workspace" : TYPES[activeType]?.label.toLowerCase()} history yet</div>}
        {!loading && !error && visible.map((item) => {
          const config = TYPES[item.type];
          const Icon = config.Icon;
          return (
            <button key={`${item.type}-${item.id}`} type="button" onClick={() => open(item)} className="flex min-w-0 items-center gap-3 rounded-md border border-white/[0.06] bg-white/[0.025] p-2.5 text-left transition hover:border-white/[0.14] hover:bg-white/[0.05]">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${config.bg} ${config.color}`}><Icon size={15} /></span>
              <span className="min-w-0 flex-1"><strong className="block truncate text-xs font-semibold text-slate-200">{item.title}</strong><small className="mt-1 block text-[10px] text-slate-600">{config.label.slice(0, -1)}{item.date ? ` | ${new Date(item.date).toLocaleDateString()}` : ""}</small></span>
            </button>
          );
        })}
      </div>
    </section>
  );
}