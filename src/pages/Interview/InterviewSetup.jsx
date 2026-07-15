import {
  BadgeCheck, BriefcaseBusiness, Building2, ChevronDown, Gauge, Headphones,
  Loader2, LockKeyhole, Mic2, Send, Video,
} from "lucide-react";

const TYPES = [
  ["MIXED", "Mixed"], ["TECHNICAL", "Technical"], ["BEHAVIORAL", "Behavioral"],
  ["HR", "HR"], ["SYSTEM_DESIGN", "System design"],
];
const DIFFICULTIES = [["BEGINNER", "Beginner"], ["INTERMEDIATE", "Intermediate"], ["ADVANCED", "Advanced"]];

export default function InterviewSetup({ form, setForm, resumes, models, submitting, onSubmit, onWritten }) {
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  return <form className="interview-setup" onSubmit={onSubmit}>
    <header className="interview-setup-head">
      <div><span>Interview studio</span><h1>Set up a realistic mock interview</h1></div>
      <p>Live voice, camera rehearsal, adaptive follow-ups and immediate feedback in one focused room.</p>
    </header>

    <div className="interview-setup-layout">
      <section className="interview-setup-visual" aria-label="AI interviewer preview">
        <img src="/images/ai-interviewer.png" alt="CareerForge AI interviewer" />
        <span className="interview-preview-live"><i /> AI interviewer ready</span>
        <div className="interview-preview-name"><strong>CareerForge Interviewer</strong><small>Clear bilingual live voice</small></div>
      </section>

      <section className="interview-setup-form">
        <div className="interview-form-title"><div><Headphones size={18} /><span><strong>Room details</strong><small>Used to personalize every question</small></span></div><span><LockKeyhole size={13} /> Secure live room</span></div>

        <div className="interview-grid">
          <label><span><BriefcaseBusiness size={13} /> Target role</span><input required value={form.role} onChange={(e) => set("role", e.target.value)} placeholder="Java Backend Developer" maxLength={140} /></label>
          <label><span><Building2 size={13} /> Company</span><input value={form.company} onChange={(e) => set("company", e.target.value)} placeholder="Optional" maxLength={140} /></label>
          <label><span>Interview type</span><select value={form.type} onChange={(e) => set("type", e.target.value)}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Difficulty</span><select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)}>{DIFFICULTIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label><span>Speaking language</span><select value={form.language} onChange={(e) => set("language", e.target.value)}><option value="AUTO">Automatic Hindi / English</option><option value="HINDI">Hindi / Hinglish</option><option value="ENGLISH">English only</option></select></label>
          <label><span>Interviewer style</span><select value={form.interviewerStyle} onChange={(e) => set("interviewerStyle", e.target.value)}><option value="BALANCED">Balanced</option><option value="SUPPORTIVE">Supportive</option><option value="STRICT">Strict</option></select></label>
          <label className="interview-wide"><span>Job description</span><textarea required value={form.jobDescription} onChange={(e) => set("jobDescription", e.target.value)} placeholder="Paste the role responsibilities and requirements. The interviewer will use them for technical, behavioral and surprise questions." rows={6} maxLength={20000} /></label>
        </div>

        <details className="interview-written-options">
          <summary><span><ChevronDown size={14} /> Written practice options</span><small>Resume, model and question count</small></summary>
          <div className="interview-grid">
            <label><span>Resume context</span><select value={form.resumeProjectId} onChange={(e) => set("resumeProjectId", e.target.value)}><option value="">No resume</option>{resumes.map((item) => <option key={item.id} value={item.id}>{item.fileName || "Resume"}</option>)}</select></label>
            <label><span>Questions</span><select value={form.questionCount} onChange={(e) => set("questionCount", e.target.value)}>{[3, 4, 5, 6, 7, 8, 9, 10].map((count) => <option key={count}>{count}</option>)}</select></label>
            <label className="interview-wide"><span>Gemini model</span><select value={form.model} onChange={(e) => set("model", e.target.value)}>{models.map((item) => <option key={item.id} value={item.id}>{item.label || item.id}</option>)}</select></label>
          </div>
        </details>

        <div className="interview-readiness"><span><Mic2 size={14} /> Mic check inside room</span><span><Video size={14} /> Camera optional</span><span><Gauge size={14} /> Direct low-latency audio</span><span><BadgeCheck size={14} /> Token request failures auto-refunded</span></div>
        <div className="interview-entry-actions">
          <button className="interview-primary" type="submit"><Video size={17} /> Enter live interview</button>
          <button className="interview-written" type="button" onClick={onWritten} disabled={submitting}>{submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Written practice</button>
        </div>
      </section>
    </div>
  </form>;
}
