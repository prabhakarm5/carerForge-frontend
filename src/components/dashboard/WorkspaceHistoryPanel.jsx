import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Image as ImageIcon, LoaderCircle, Mail, RotateCcw, Search, Trash2, Video, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { deleteImage, getImageHistory } from "../../services/imageService";
import { deleteResumeProject, getResumeProjects } from "../../services/resumeService";
import { deleteCoverLetter, getCoverLetters } from "../../services/coverLetterService";
import { deleteInterview, getInterviews } from "../../services/interviewService";
import { WORKSPACE_HISTORY_EVENT, notifyWorkspaceHistoryChanged } from "../../services/workspaceEvents";

const CONFIG = {
  interview: {
    label: "interviews",
    itemName: "interview",
    deleted: "Interview deleted",
    empty: "No practice sessions yet",
    Icon: Video,
    load: getInterviews,
    remove: deleteInterview,
    title: (item) => `${item.role || "Interview"}${item.company ? ` at ${item.company}` : ""}`,
    meta: (item) => item.status === "COMPLETED" ? `${item.overallScore ?? 0}/100` : `${item.answeredQuestions ?? 0}/${item.totalQuestions ?? 0} answered`,
    queryKey: "session",
    route: "/interview",
  },
  resume: {
    label: "resume analyses",
    itemName: "resume analysis",
    deleted: "Resume analysis deleted",
    empty: "No resume analyses yet",
    Icon: FileText,
    load: getResumeProjects,
    remove: deleteResumeProject,
    title: (item) => item.fileName || "Resume analysis",
    meta: (item) => `${item.atsScore ?? 0}/100 ATS`,
    queryKey: "project",
    route: "/resume",
  },
  coverLetter: {
    label: "cover letters",
    empty: "No cover letters yet",
    itemName: "cover letter",
    deleted: "Cover letter deleted",
    Icon: Mail,
    load: getCoverLetters,
    remove: deleteCoverLetter,
    title: (item) => `${item.role || "Role"} at ${item.company || "Company"}`,
    meta: (item) => item.styleLabel || "Professional",
    queryKey: "letter",
    route: "/cover-letter",
  },
  image: {
    label: "images",
    itemName: "image",
    deleted: "Image deleted",
    empty: "No generated images yet",
    Icon: ImageIcon,
    load: getImageHistory,
    remove: deleteImage,
    title: (item) => item.prompt || "Generated image",
    meta: (item) => item.favorite ? "Favorite" : "Generated",
    queryKey: "image",
    route: "/image-generator",
  },
};

export default function WorkspaceHistoryPanel({ kind }) {
  const config = CONFIG[kind];
  const location = useLocation();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (quiet = false) => {
    if (!config) return;
    if (!quiet) setLoading(true);
    try {
      const data = await config.load();
      setItems(Array.isArray(data) ? data : []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [config]);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    function refresh(event) {
      if (!event.detail?.kind || event.detail.kind === kind) load(true);
    }
    window.addEventListener(WORKSPACE_HISTORY_EVENT, refresh);
    return () => window.removeEventListener(WORKSPACE_HISTORY_EVENT, refresh);
  }, [kind, load]);

  const selectedId = new URLSearchParams(location.search).get(config?.queryKey);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => config.title(item).toLowerCase().includes(needle));
  }, [config, items, query]);

  function open(item) {
    navigate(`${config.route}?${config.queryKey}=${encodeURIComponent(item.id)}`);
  }

  async function remove(event, item) {
    event.stopPropagation();
    if (!window.confirm(`Delete this ${config.itemName || kind}?`)) return;
    setBusyId(item.id);
    try {
      await config.remove(item.id);
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (selectedId === String(item.id)) navigate(config.route, { replace: true });
      notifyWorkspaceHistoryChanged(kind);
      toast.success(config.deleted || (kind === "resume" ? "Resume analysis deleted" : "Image deleted"));
    } catch {
      toast.error("Delete failed. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!config) return null;
  const { Icon } = config;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-2 pb-1 pt-2">
        <div className="flex items-center gap-2 rounded-[10px] border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 focus-within:border-white/[0.14] focus-within:bg-white/[0.06]">
          <Search size={12} className="shrink-0 text-white/25" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${config.label}...`} className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-white/75 outline-none placeholder:text-white/20" />
          {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={11} className="text-white/30" /></button>}
        </div>
      </div>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-2 pt-1">
        {loading && Array.from({ length: 7 }).map((_, index) => <div key={index} className="mx-0.5 mb-1 h-11 animate-pulse rounded-lg bg-white/[0.035]" />)}
        {!loading && error && (
          <div className="py-7 text-center text-xs text-white/30">
            <p>Could not load {config.label}</p>
            <button type="button" onClick={() => load()} className="mx-auto mt-2 inline-flex items-center gap-1 text-white/45"><RotateCcw size={11} /> Retry</button>
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="py-9 text-center text-xs text-white/25"><Icon size={22} className="mx-auto mb-2 text-white/10" /><p>{query ? "No results found" : config.empty}</p></div>
        )}
        {!loading && !error && filtered.map((item) => {
          const active = selectedId === String(item.id);
          return (
            <button key={item.id} type="button" onClick={() => open(item)} className={`group mb-0.5 flex w-full items-center gap-2 rounded-lg border px-2 py-2 text-left transition ${active ? "border-fuchsia-400/20 bg-fuchsia-400/[0.10]" : "border-transparent hover:bg-white/[0.045]"}`}>
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${kind === "resume" ? "bg-orange-400/10 text-orange-300" : kind === "coverLetter" ? "bg-cyan-400/10 text-cyan-300" : "bg-fuchsia-400/10 text-fuchsia-300"}`}><Icon size={13} /></span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-[12px] font-medium text-white/70">{config.title(item)}</strong>
                <small className="block truncate text-[10px] text-white/25">{config.meta(item)}</small>
              </span>
              <span onClick={(event) => remove(event, item)} role="button" tabIndex={0} title="Delete" className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-white/20 opacity-0 transition hover:bg-red-400/10 hover:text-red-300 group-hover:opacity-100 focus:opacity-100">
                {busyId === item.id ? <LoaderCircle size={12} className="animate-spin" /> : <Trash2 size={12} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
