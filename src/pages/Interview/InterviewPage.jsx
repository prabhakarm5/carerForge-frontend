import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, CameraOff, CheckCircle2, ChevronRight, Loader2, RotateCcw, Send } from "lucide-react";
import toast from "react-hot-toast";

import { answerInterview, getInterview, startInterview } from "../../services/interviewService";
import { getResumeModels, getResumeProjects } from "../../services/resumeService";
import { notifyWorkspaceHistoryChanged, publishWorkspaceContext } from "../../services/workspaceEvents";
import { SpeakButton, VoiceInputButton, speakText, stopSpeaking } from "../../components/voice/VoiceControls";
import RechargeModal from "../../components/common/recharge/RechargeModal";
import LiveInterviewRoom from "./LiveInterviewRoom";
import InterviewSetup from "./InterviewSetup";
import "./InterviewPage.css";

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
      {liveRoom ? (<LiveInterviewRoom config={liveRoom} onRecharge={() => setRechargeOpen(true)} onExit={() => { setLiveRoom(null); publishWorkspaceContext({ kind: "interview", title: "New practice" }); }} />) : !session ? (<InterviewSetup form={form} setForm={setForm} resumes={resumes} models={models} submitting={submitting} onSubmit={enterLive} onWritten={beginWritten} />) : (
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
