import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, CameraOff, CheckCircle2, ChevronRight, Loader2, Mic2, RotateCcw, Send, Sparkles, Target, Video } from "lucide-react";
import toast from "react-hot-toast";

import { answerInterview, getInterview, startInterview } from "../../services/interviewService";
import { getResumeModels, getResumeProjects } from "../../services/resumeService";
import { notifyWorkspaceHistoryChanged, publishWorkspaceContext } from "../../services/workspaceEvents";
import { SpeakButton, VoiceInputButton, speakText, stopSpeaking } from "../../components/voice/VoiceControls";
import RechargeModal from "../../components/common/recharge/RechargeModal";
import LiveInterviewRoom from "./LiveInterviewRoom";
import "./InterviewPage.css";

const TYPES = [
  ["MIXED", "Mixed"], ["TECHNICAL", "Technical"], ["BEHAVIORAL", "Behavioral"],
  ["HR", "HR"], ["SYSTEM_DESIGN", "System design"],
];
const DIFFICULTIES = [["BEGINNER", "Beginner"], ["INTERMEDIATE", "Intermediate"], ["ADVANCED", "Advanced"]];

function apiMessage(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

export default function InterviewPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get("session");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [session, setSession] = useState(null);
  const [liveRoom, setLiveRoom] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [models, setModels] = useState([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(Boolean(selectedId));
  const [submitting, setSubmitting] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [form, setForm] = useState({ role: "", company: "", jobDescription: "", resumeProjectId: "", type: "MIXED", difficulty: "INTERMEDIATE", questionCount: 5, model: "", language: "AUTO", interviewerStyle: "BALANCED" });

  useEffect(() => {
    Promise.allSettled([getResumeProjects(), getResumeModels()]).then(([resumeResult, modelResult]) => {
      if (resumeResult.status === "fulfilled") setResumes(resumeResult.value || []);
      if (modelResult.status === "fulfilled") {
        const list = modelResult.value || [];
        setModels(list);
        setForm((current) => ({ ...current, model: current.model || list.find((item) => item.defaultModel)?.id || list[0]?.id || "" }));
      }
    });
  }, []);

  useEffect(() => {
    stopSpeaking();
    if (!selectedId) {
      const timer = window.setTimeout(() => {
        setSession(null);
        setLoading(false);
        publishWorkspaceContext({ kind: "interview", title: "New practice" });
      }, 0);
      return () => window.clearTimeout(timer);
    }
    getInterview(selectedId).then((data) => {
      setSession(data);
      publishWorkspaceContext({ kind: "interview", id: data.id, title: data.role });
    }).catch((error) => {
      toast.error(apiMessage(error, "Interview could not be loaded."));
      navigate("/interview", { replace: true });
    }).finally(() => setLoading(false));
  }, [navigate, selectedId]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    stopSpeaking();
  }, []);

  async function toggleCamera() {
    if (cameraOn) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      setCameraOn(false);
      return;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = media;
      if (videoRef.current) videoRef.current.srcObject = media;
      setCameraOn(true);
    } catch {
      toast.error("Camera permission is required for video preview.");
    }
  }

  async function beginWritten(event) {
    event.preventDefault();
    if (!form.role.trim() || !form.jobDescription.trim()) return toast.error("Role and job description are required.");
    setSubmitting(true);
    try {
      const data = await startInterview({ ...form, resumeProjectId: form.resumeProjectId || null, questionCount: Number(form.questionCount) });
      setSession(data);
      notifyWorkspaceHistoryChanged("interview");
      navigate(`/interview?session=${encodeURIComponent(data.id)}`, { replace: true });
      window.setTimeout(() => speakText(data.currentQuestion), 200);
    } catch (error) {
      if (error?.response?.status === 402) setRechargeOpen(true);
      else toast.error(apiMessage(error, "Interview could not start."));
    } finally { setSubmitting(false); }
  }

  function enterLive(event) {
    event.preventDefault();
    if (!form.role.trim() || !form.jobDescription.trim()) {
      toast.error("Role and job description are required.");
      return;
    }
    setLiveRoom({
      role: form.role.trim(),
      company: form.company.trim(),
      jobDescription: form.jobDescription.trim(),
      language: form.language,
      interviewerStyle: form.interviewerStyle,
      interviewType: form.type,
      difficulty: form.difficulty,
    });
    publishWorkspaceContext({ kind: "interview", title: `Live: ${form.role.trim()}` });
  }

  async function submitAnswer(event) {
    event.preventDefault();
    if (!answer.trim() || submitting || !session) return;
    setSubmitting(true);
    stopSpeaking();
    try {
      const data = await answerInterview(session.id, answer.trim());
      setSession(data);
      setAnswer("");
      notifyWorkspaceHistoryChanged("interview");
      publishWorkspaceContext({ kind: "interview", id: data.id, title: data.role });
      if (!data.completed && data.currentQuestion) window.setTimeout(() => speakText(data.currentQuestion), 250);
    } catch (error) {
      if (error?.response?.status === 402) setRechargeOpen(true);
      else toast.error(apiMessage(error, "Answer could not be evaluated."));
    } finally { setSubmitting(false); }
  }

  if (loading) return <div className="interview-loading"><Loader2 size={22} className="animate-spin" /><span>Preparing interview room...</span></div>;

  return (
    <div className="interview-page">
      {liveRoom ? (<LiveInterviewRoom config={liveRoom} onExit={() => { setLiveRoom(null); publishWorkspaceContext({ kind: "interview", title: "New practice" }); }} />) : !session ? (
        <form className="interview-setup" onSubmit={enterLive}>
          <section className="interview-intro">
            <span className="interview-kicker"><Sparkles size={14} /> AI mock interview</span>
            <h1>Practice the interview, not a script.</h1>
            <p>Questions adapt to your role, job description and every answer. Speak naturally and receive a score after each response.</p>
            <div className="interview-feature-row"><span><Mic2 size={16} /> Voice answers</span><span><Video size={16} /> Camera rehearsal</span><span><Target size={16} /> Adaptive scoring</span></div>
          </section>
          <section className="interview-form-panel">
            <div className="interview-grid">
              <label>Target role<input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Java Backend Developer" maxLength={140} /></label>
              <label>Company (optional)<input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company name" maxLength={140} /></label>
              <label>Interview type<select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Difficulty<select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>{DIFFICULTIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label>Speaking language<select value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}><option value="AUTO">Automatic Hindi / English</option><option value="HINDI">Hindi / Hinglish</option><option value="ENGLISH">English only</option></select></label>
              <label>Interviewer style<select value={form.interviewerStyle} onChange={(e) => setForm({ ...form, interviewerStyle: e.target.value })}><option value="BALANCED">Balanced</option><option value="SUPPORTIVE">Supportive</option><option value="STRICT">Strict</option></select></label>
              <label>Resume context<select value={form.resumeProjectId} onChange={(e) => setForm({ ...form, resumeProjectId: e.target.value })}><option value="">No resume</option>{resumes.map((item) => <option key={item.id} value={item.id}>{item.fileName || "Resume"}</option>)}</select></label>
              <label>Questions<select value={form.questionCount} onChange={(e) => setForm({ ...form, questionCount: e.target.value })}>{[3, 4, 5, 6, 7, 8, 9, 10].map((count) => <option key={count}>{count}</option>)}</select></label>
              <label className="interview-wide">Gemini model<select value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}>{models.map((item) => <option key={item.id} value={item.id}>{item.label || item.id}</option>)}</select></label>
              <label className="interview-wide">Job description<textarea value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} placeholder="Paste the complete job description here..." rows={7} maxLength={20000} /></label>
            </div>
            <div className="interview-entry-actions">
              <button className="interview-primary" type="submit"><Video size={17} /> Enter live voice room</button>
              <button className="interview-written" type="button" onClick={beginWritten} disabled={submitting}>{submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Written practice</button>
            </div>
          </section>
        </form>
      ) : (
        <div className="interview-room">
          <header className="interview-room-head">
            <div><span>{session.type?.replaceAll("_", " ")} / {session.difficulty}</span><h1>{session.role}{session.company ? ` at ${session.company}` : ""}</h1></div>
            <div className="interview-progress"><strong>{Math.min(session.currentQuestionNumber || 1, session.totalQuestions)} / {session.totalQuestions}</strong><span><i style={{ width: `${Math.min(100, ((session.currentQuestionNumber || 1) / session.totalQuestions) * 100)}%` }} /></span></div>
          </header>
          <div className="interview-stage">
            <main className="interview-dialogue">
              {session.turns?.map((turn) => <article className="interview-turn" key={turn.id}>
                <div className="interview-question"><span>Question {turn.questionNumber}</span><p>{turn.question}</p><SpeakButton text={turn.question} className="interview-icon-button" /></div>
                <div className="interview-answer"><span>Your answer</span><p>{turn.answer}</p></div>
                <div className="interview-feedback"><strong>{turn.score}/100</strong><div><h3>{turn.feedback}</h3>{turn.improvements?.length > 0 && <p>Improve: {turn.improvements.join("; ")}</p>}<details><summary>View ideal answer</summary><p>{turn.idealAnswer}</p></details></div></div>
              </article>)}
              {session.completed ? <section className="interview-complete"><CheckCircle2 size={32} /><span>Interview complete</span><h2>{session.overallScore}/100</h2><p>{session.summary}</p><button type="button" onClick={() => navigate("/interview?new=1")}><RotateCcw size={15} /> Start another interview</button></section> : <section className="interview-current"><div className="interview-current-label"><span>Question {session.currentQuestionNumber}</span><em>{session.currentFocus}</em></div><div className="interview-current-question"><h2>{session.currentQuestion}</h2><SpeakButton text={session.currentQuestion} className="interview-icon-button" /></div></section>}
            </main>
            <aside className="interview-video-panel">
              <div className="interview-video"><video ref={videoRef} autoPlay muted playsInline />{!cameraOn && <div><CameraOff size={28} /><span>Camera preview is off</span></div>}</div>
              <button type="button" onClick={toggleCamera} className={cameraOn ? "is-on" : ""}>{cameraOn ? <CameraOff size={15} /> : <Camera size={15} />}{cameraOn ? "Turn camera off" : "Turn camera on"}</button>
              <p>Video stays on this device and is not uploaded.</p>
            </aside>
          </div>
          {!session.completed && <form className="interview-composer" onSubmit={submitAnswer}><textarea value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer naturally, or tap the microphone..." rows={3} maxLength={10000} /><div><VoiceInputButton value={answer} onChange={setAnswer} disabled={submitting} className="interview-voice-button" /><span>{answer.length.toLocaleString()} / 10,000</span><button className="interview-send" disabled={!answer.trim() || submitting}>{submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{submitting ? "Evaluating..." : "Submit answer"}<ChevronRight size={15} /></button></div></form>}
        </div>
      )}
      <RechargeModal open={rechargeOpen} reason="interview practice" onClose={() => setRechargeOpen(false)} />
    </div>
  );
}
