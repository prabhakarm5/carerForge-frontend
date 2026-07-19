import {
  BadgeCheck, BriefcaseBusiness, Building2, ChevronDown, FileText, Gauge,
  GraduationCap, Headphones, Loader2, LockKeyhole, Mic2, Send, UploadCloud, Video,
} from "lucide-react";

const INTERVIEWER_PREVIEW_VIDEO = import.meta.env.VITE_INTERVIEWER_IDLE_VIDEO_URL || "";

const TYPES = [["MIXED", "Mixed"], ["TECHNICAL", "Technical / domain"], ["BEHAVIORAL", "Behavioral"], ["HR", "HR / motivation"], ["SYSTEM_DESIGN", "Case study / system design"]];
const DIFFICULTIES = [["BEGINNER", "Beginner"], ["INTERMEDIATE", "Intermediate"], ["ADVANCED", "Advanced"]];
const GOALS = [["JOB_INTERVIEW", "Job interview"], ["CAMPUS_PLACEMENT", "Campus placement"], ["COLLEGE_ADMISSION", "College admission"], ["CAREER_SWITCH", "Career switch"], ["GENERAL_PRACTICE", "General confidence practice"]];
const LEVELS = [["STUDENT", "Student / fresher"], ["EARLY_CAREER", "0-3 years"], ["MID_CAREER", "3-8 years"], ["SENIOR", "8+ years / leadership"]];

const fieldClass = "min-h-10 w-full rounded-lg border border-slate-700 bg-[#0b131f] px-3 py-2.5 text-xs font-medium text-slate-200 outline-none transition hover:bg-[#0e1826] focus:border-cyan-400 sm:min-h-[42px]";
const labelClass = "flex flex-col gap-1.5 text-[9px] font-extrabold uppercase text-slate-400";
const labelTitleClass = "flex items-center gap-1.5";

export default function InterviewSetup({ form, setForm, resumes, models, submitting, uploadingResume, uploadingJobDescription, jobDescriptionUpload, onSubmit, onWritten, onResumeUpload, onJobDescriptionUpload }) {
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return <form className="mx-auto min-h-full w-full max-w-[1220px] px-3 pb-7 pt-3 text-slate-50 sm:px-5 sm:pb-10 sm:pt-5 lg:px-6" onSubmit={onSubmit}>
    <header className="border-b border-slate-800 pb-3 sm:flex sm:items-end sm:justify-between sm:gap-6 sm:pb-5">
      <div className="min-w-0"><span className="text-[9px] font-extrabold uppercase text-cyan-300">Interview studio</span><h1 className="mt-1 text-[22px] font-black leading-tight sm:text-[clamp(24px,3vw,34px)]">Practice the interview you will actually face</h1></div>
      <p className="mt-2 max-w-[500px] text-[10px] leading-5 text-slate-400 sm:mt-0 sm:text-[11px]">Company-aware, resume-grounded questions for students, career switchers, technical and non-technical roles.</p>
    </header>

    <div className="pt-3 min-[701px]:grid min-[701px]:grid-cols-[minmax(230px,.68fr)_minmax(430px,1.32fr)] min-[701px]:gap-5 lg:grid-cols-[minmax(280px,.76fr)_minmax(520px,1.24fr)] lg:gap-7 lg:pt-6">
      <section className="relative mb-4 aspect-[16/8] min-h-[150px] overflow-hidden rounded-lg border border-slate-700 bg-[#080d15] min-[701px]:sticky min-[701px]:top-3 min-[701px]:mb-0 min-[701px]:aspect-[4/5] min-[701px]:self-start" aria-label="Human interviewer preview">
        {INTERVIEWER_PREVIEW_VIDEO ? <video className="h-full w-full object-cover object-[center_42%] min-[701px]:object-center" src={INTERVIEWER_PREVIEW_VIDEO} poster="/images/ai-interviewer.png" autoPlay loop muted playsInline preload="metadata" aria-label="Professional CareerForge interviewer" /> : <img className="h-full w-full object-cover object-[center_42%] min-[701px]:object-center" src="/images/ai-interviewer.png" alt="Professional CareerForge interviewer" />}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-[#03070ce8] to-transparent" />
        <span className="absolute left-3 top-3 z-[2] flex items-center gap-1.5 rounded-md border border-emerald-400/30 bg-emerald-950/80 px-2 py-1.5 text-[8px] text-emerald-200"><i className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Interviewer ready</span>
        <div className="absolute inset-x-3 bottom-2.5 z-[2] sm:bottom-3.5"><strong className="block text-[13px]">Maya, Career Interviewer</strong><small className="mt-1 block text-[9px] text-slate-400">Clear bilingual voice and adaptive follow-ups</small></div>
      </section>

      <section className="min-w-0 pb-14 min-[701px]:pb-0">
        <div className="mb-3 flex min-h-10 items-start justify-between gap-3 sm:mb-4 sm:min-h-[46px]">
          <div className="flex items-center gap-2.5"><Headphones size={18} className="text-cyan-300" /><span><strong className="block text-[13px]">Personalize your room</strong><small className="mt-1 block text-[9px] text-slate-500">Only relevant details are used for questions</small></span></div>
          <span className="hidden items-center gap-1.5 text-[8px] text-slate-400 sm:flex"><LockKeyhole size={13} /> Private session</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
          <label className={labelClass}><span className={labelTitleClass}><GraduationCap size={13} /> Practice goal</span><select className={fieldClass} value={form.interviewGoal} onChange={(e) => set("interviewGoal", e.target.value)}>{GOALS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className={labelClass}><span className={labelTitleClass}>Candidate level</span><select className={fieldClass} value={form.candidateLevel} onChange={(e) => set("candidateLevel", e.target.value)}>{LEVELS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className={labelClass}><span className={labelTitleClass}><BriefcaseBusiness size={13} /> Target role or course</span><input className={fieldClass} required value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Sales Executive, MBA admission, Nurse..." maxLength={140} /></label>
          <label className={labelClass}><span className={labelTitleClass}><Building2 size={13} /> Company or college</span><input className={fieldClass} value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Optional, e.g. Deloitte or IIM" maxLength={140} /></label>
          <label className={labelClass}><span className={labelTitleClass}>Interview type</span><select className={fieldClass} value={form.type} onChange={(e) => set("type", e.target.value)}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className={labelClass}><span className={labelTitleClass}>Difficulty</span><select className={fieldClass} value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>{DIFFICULTIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className={labelClass}><span className={labelTitleClass}>Speaking language</span><select className={fieldClass} value={form.language} onChange={(e) => set("language", e.target.value)}><option value="AUTO">Automatic Hindi / English</option><option value="HINDI">Hindi / Hinglish</option><option value="ENGLISH">English only</option></select></label>
          <label className={labelClass}><span className={labelTitleClass}>Interviewer style</span><select className={fieldClass} value={form.interviewerStyle} onChange={(e) => set("interviewerStyle", e.target.value)}><option value="STRICT">Strict and realistic</option><option value="BALANCED">Balanced</option><option value="SUPPORTIVE">Supportive</option></select></label>
          <div className="sm:col-span-2">
            <label className={labelClass}><span className={labelTitleClass}>Job description, course brief, or preparation notes (optional)</span><textarea className={`${fieldClass} min-h-28 max-h-56 resize-y leading-5 sm:min-h-32`} value={form.jobDescription} onChange={(e) => set("jobDescription", e.target.value)} placeholder="Paste responsibilities or upload a PDF/image below." rows={5} maxLength={20000} /></label>
            <div className="mt-2 flex min-w-0 items-center gap-2 rounded-lg border border-dashed border-cyan-900 bg-cyan-950/20 p-2.5">
              <label className="flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-cyan-800 bg-cyan-950/60 px-3 text-[9px] font-bold text-cyan-200 hover:border-cyan-500">
                {uploadingJobDescription ? <Loader2 size={14} className="animate-spin" /> : <UploadCloud size={14} />}
                <span>{uploadingJobDescription ? "Processing..." : "Upload PDF / image"}</span>
                <input className="sr-only" type="file" accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpg,.jpeg,.webp" disabled={uploadingJobDescription || uploadingResume || submitting} onChange={(event) => onJobDescriptionUpload(event.target.files?.[0], event)} />
              </label>
              <span className="min-w-0 flex-1 text-[8px] leading-4 text-slate-500">Scanned PDFs and images are read securely. Maximum 5 MB.</span>
            </div>
            {jobDescriptionUpload && (
              <div className="mt-2 rounded-lg border border-slate-700 bg-[#09111c] p-2.5" role="status" aria-live="polite">
                <div className="flex min-w-0 items-center gap-2"><FileText size={14} className="shrink-0 text-cyan-300" /><strong className="min-w-0 flex-1 truncate text-[9px] text-slate-200">{jobDescriptionUpload.fileName}</strong><span className="text-[8px] tabular-nums text-cyan-300">{jobDescriptionUpload.progress}%</span></div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800"><i className="block h-full rounded-full bg-cyan-400 transition-[width] duration-300" style={{ width: `${jobDescriptionUpload.progress}%` }} /></div>
                <small className="mt-1.5 block text-[8px] text-slate-500">{jobDescriptionUpload.stage}</small>
              </div>
            )}
          </div>
        </div>

        <section className="mt-3 grid items-center gap-3 rounded-lg border border-slate-700 bg-[#09111c] p-2.5 min-[701px]:grid-cols-[minmax(190px,.72fr)_minmax(300px,1.28fr)] min-[701px]:p-3">
          <div className="flex min-w-0 items-center gap-2.5"><FileText size={17} className="shrink-0 text-amber-300" /><span><strong className="block text-[11px]">Resume context</strong><small className="mt-1 block text-[8px] leading-4 text-slate-500">Questions can challenge your skills, projects, impact and gaps.</small></span></div>
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_40px] gap-2 min-[701px]:grid-cols-[minmax(0,1fr)_auto]">
            <select className="h-[38px] min-w-0 rounded-md border border-slate-700 bg-[#0d1724] px-2.5 text-[10px] text-slate-200 outline-none" value={form.resumeProjectId} onChange={(e) => setForm((current) => ({ ...current, resumeProjectId: e.target.value, resumeContext: "", resumeFileName: "" }))} aria-label="Select analyzed resume"><option value="">{form.resumeFileName ? `Attached: ${form.resumeFileName}` : "Continue without a resume"}</option>{resumes.map((item) => <option key={item.id} value={item.id}>{item.fileName || "Analyzed resume"}</option>)}</select>
            <label className="flex h-[38px] cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-amber-800/70 bg-amber-950/50 px-2.5 text-amber-200 hover:border-amber-500 hover:bg-amber-950 min-[701px]:px-3">
              {uploadingResume ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}<span className="hidden text-[9px] min-[701px]:inline">{uploadingResume ? "Reading..." : "Upload resume"}</span>
              <input className="sr-only" type="file" accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp,text/plain" disabled={uploadingResume || submitting} onChange={(event) => onResumeUpload(event.target.files?.[0], event)} />
            </label>
          </div>
        </section>

        <details className="group mt-3 border-y border-slate-800">
          <summary className="flex min-h-[46px] cursor-pointer list-none items-center justify-between gap-3 text-slate-400 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-1.5 text-[10px] font-bold"><ChevronDown size={14} className="transition group-open:rotate-180" /> Session options</span><small className="hidden text-[8px] text-slate-600 sm:block">Model and written question count</small></summary>
          <div className="grid grid-cols-1 gap-2.5 pb-3 sm:grid-cols-2 sm:gap-3"><label className={labelClass}><span>Written questions</span><select className={fieldClass} value={form.questionCount} onChange={(e) => set("questionCount", e.target.value)}>{[3,4,5,6,7,8,9,10].map((count) => <option key={count}>{count}</option>)}</select></label><label className={labelClass}><span>Gemini model</span><select className={fieldClass} value={form.model} onChange={(e) => set("model", e.target.value)}>{models.map((item) => <option key={item.id} value={item.id}>{item.label || item.id}</option>)}</select></label></div>
        </details>

        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">{[[Mic2,"Mic check in room"],[Video,"Camera optional"],[Gauge,"Direct live audio"],[BadgeCheck,"Strict evidence-based score"]].map(([Icon,text]) => <span className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-[#0a111c] px-2 py-1.5 text-[7px] text-slate-400 sm:text-[8px]" key={text}><Icon size={14} className="text-cyan-300" />{text}</span>)}</div>
        <div className="sticky bottom-0 z-[5] -mx-3 -mb-7 mt-3 flex gap-2 border-t border-slate-800 bg-[#070b14f7] px-3 py-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] min-[701px]:static min-[701px]:mx-0 min-[701px]:mb-0 min-[701px]:border-0 min-[701px]:bg-transparent min-[701px]:p-0">
          <button className="flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 text-[11px] font-black text-[#041318] transition hover:-translate-y-px hover:brightness-110 disabled:opacity-50" type="submit" disabled={submitting || uploadingResume || uploadingJobDescription}><Video size={17} /> Enter live interview</button>
          <button className="flex min-h-[42px] w-12 items-center justify-center gap-2 rounded-lg border border-slate-700 bg-[#0b1220] px-3 text-[0] font-extrabold text-slate-300 transition hover:-translate-y-px hover:bg-slate-800 disabled:opacity-50 sm:w-auto sm:text-xs" type="button" onClick={onWritten} disabled={submitting || uploadingResume || uploadingJobDescription}>{submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}<span className="hidden sm:inline">Written practice</span></button>
        </div>
      </section>
    </div>
  </form>;
}