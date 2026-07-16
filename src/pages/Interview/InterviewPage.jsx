import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, CameraOff, CheckCircle2, ChevronRight, Loader2, RotateCcw, Send } from "lucide-react";
import toast from "react-hot-toast";

import { answerInterview, getInterview, startInterview } from "../../services/interviewService";
import { analyzeResume, getResumeModels, getResumeProjects } from "../../services/resumeService";
import { notifyWorkspaceHistoryChanged, publishWorkspaceContext } from "../../services/workspaceEvents";
import { SpeakButton, VoiceInputButton, speakText, stopSpeaking } from "../../components/voice/VoiceControls";
import RechargeModal from "../../components/common/recharge/RechargeModal";
import LiveInterviewRoom from "./LiveInterviewRoom";
import InterviewSetup from "./InterviewSetup";

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
  const [uploadingResume, setUploadingResume] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [form, setForm] = useState({ role: "", company: "", jobDescription: "", resumeProjectId: "", type: "MIXED", difficulty: "INTERMEDIATE", questionCount: 5, model: "", language: "AUTO", interviewerStyle: "STRICT", candidateLevel: "EARLY_CAREER", interviewGoal: "JOB_INTERVIEW" });

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
    if (!form.role.trim()) return toast.error("Target role or course is required.");
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
    if (!form.role.trim()) {
      toast.error("Target role or course is required.");
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
      candidateLevel: form.candidateLevel,
      interviewGoal: form.interviewGoal,
      resumeProjectId: form.resumeProjectId || null,
    });
    publishWorkspaceContext({ kind: "interview", title: `Live: ${form.role.trim()}` });
  }

  async function uploadInterviewResume(file, event) {
    if (!file || uploadingResume) return;
    setUploadingResume(true);
    try {
      const project = await analyzeResume(file, form.jobDescription, form.model);
      setResumes((current) => [project, ...current.filter((item) => item.id !== project.id)]);
      setForm((current) => ({ ...current, resumeProjectId: project.id }));
      toast.success("Resume analyzed and attached to this interview.");
    } catch (error) {
      if (error?.response?.status === 402) setRechargeOpen(true);
      else toast.error(apiMessage(error, "Resume could not be attached."));
    } finally {
      setUploadingResume(false);
      if (event?.target) event.target.value = "";
    }
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

  if (loading) return <div className="grid h-full place-content-center justify-items-center gap-2.5 bg-[#070b14] text-[13px] text-slate-400"><Loader2 size={22} className="animate-spin" /><span>Preparing interview room...</span></div>;

  return (
    <div className="h-full min-h-0 overflow-auto bg-[#070b14] text-slate-50">
      {liveRoom ? (
        <LiveInterviewRoom config={liveRoom} onRecharge={() => setRechargeOpen(true)} onExit={() => { setLiveRoom(null); publishWorkspaceContext({ kind: "interview", title: "New practice" }); }} />
      ) : !session ? (
        <InterviewSetup form={form} setForm={setForm} resumes={resumes} models={models} submitting={submitting} uploadingResume={uploadingResume} onSubmit={enterLive} onWritten={beginWritten} onResumeUpload={uploadInterviewResume} />
      ) : (
        <div className="flex min-h-full flex-col">
          <header className="sticky top-0 z-[5] flex items-center justify-between gap-3 border-b border-slate-800 bg-[#070b14f5] px-3 py-2.5 sm:px-5 sm:py-3">
            <div className="min-w-0"><span className="text-[9px] uppercase text-cyan-300 sm:text-[10px]">{session.type?.replaceAll("_", " ")} / {session.difficulty}</span><h1 className="mt-1 truncate text-[13px] font-black sm:text-base">{session.role}{session.company ? ` at ${session.company}` : ""}</h1></div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-slate-300"><strong>{Math.min(session.currentQuestionNumber || 1, session.totalQuestions)} / {session.totalQuestions}</strong><span className="block h-1 w-16 overflow-hidden rounded-full bg-slate-800 sm:w-28"><i className="block h-full bg-cyan-400" style={{ width: `${Math.min(100, ((session.currentQuestionNumber || 1) / session.totalQuestions) * 100)}%` }} /></span></div>
          </header>

          <div className="mx-auto grid w-full max-w-[1180px] grid-cols-1 gap-4 px-3 pb-44 pt-3 md:grid-cols-[minmax(0,1fr)_240px] md:px-5 md:pt-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <main className="min-w-0">
              {session.turns?.map((turn) => <article className="mb-5 border-b border-slate-800 pb-5" key={turn.id}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 sm:flex"><span className="col-span-2 shrink-0 text-[10px] uppercase text-slate-500 sm:w-[76px]">Question {turn.questionNumber}</span><p className="m-0 flex-1 text-[13px] leading-6 text-slate-200 sm:text-sm">{turn.question}</p><SpeakButton text={turn.question} className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border border-slate-700 bg-[#0b1220] text-slate-400" /></div>
                <div className="mt-3.5 block border-l-2 border-slate-700 bg-[#0b1220] p-3 sm:flex"><span className="mb-1.5 block shrink-0 text-[10px] uppercase text-slate-500 sm:mb-0 sm:w-[76px]">Your answer</span><p className="m-0 flex-1 text-[13px] leading-6 text-slate-200 sm:text-sm">{turn.answer}</p></div>
                <div className="mt-3 block gap-3 rounded-lg border border-cyan-900 bg-cyan-950/60 p-3 sm:flex"><strong className="mb-1 block text-xl text-cyan-300 sm:mb-0">{turn.score}/100</strong><div><h3 className="m-0 text-[13px] font-bold">{turn.feedback}</h3>{turn.improvements?.length > 0 && <p className="mt-1 text-xs leading-5 text-cyan-100/70">Improve: {turn.improvements.join("; ")}</p>}<details className="mt-1 text-xs text-cyan-100/70"><summary className="cursor-pointer">View ideal answer</summary><p className="mt-1 leading-5">{turn.idealAnswer}</p></details></div></div>
              </article>)}

              {session.completed ? <section className="px-5 py-10 text-center"><CheckCircle2 size={32} className="mx-auto text-emerald-400" /><span className="mt-2 block text-[11px] uppercase text-slate-400">Interview complete</span><h2 className="my-1 text-[42px] font-black">{session.overallScore}/100</h2><p className="mx-auto mb-4 max-w-2xl leading-7 text-slate-300">{session.summary}</p><button className="inline-flex items-center gap-2 text-cyan-300" type="button" onClick={() => navigate("/interview?new=1")}><RotateCcw size={15} /> Start another interview</button></section> : <section className="rounded-lg border border-cyan-800 bg-[#071f2d] p-3 sm:p-5"><div className="flex justify-between gap-2 text-[10px] uppercase text-cyan-300 sm:text-[11px]"><span>Question {session.currentQuestionNumber}</span><em className="not-italic text-slate-400">{session.currentFocus}</em></div><div className="mt-3 flex items-start gap-2.5"><h2 className="m-0 flex-1 text-base font-black leading-6 sm:text-xl sm:leading-7">{session.currentQuestion}</h2><SpeakButton text={session.currentQuestion} className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-lg border border-slate-700 bg-[#0b1220] text-slate-400" /></div></section>}
            </main>

            <aside className="order-first mb-1 grid grid-cols-[100px_minmax(0,1fr)] gap-2 md:order-none md:sticky md:top-[78px] md:block md:self-start">
              <div className="relative row-span-2 aspect-[4/3] overflow-hidden rounded-lg border border-slate-700 bg-slate-950"><video className="h-full w-full -scale-x-100 object-cover" ref={videoRef} autoPlay muted playsInline />{!cameraOn && <div className="absolute inset-0 grid place-content-center justify-items-center gap-2 text-[11px] text-slate-600"><CameraOff size={28} /><span>Camera preview is off</span></div>}</div>
              <button type="button" onClick={toggleCamera} className={`m-0 flex w-full items-center justify-center gap-2 rounded-lg border bg-[#0b1220] p-2 text-xs ${cameraOn ? "border-cyan-800 text-cyan-300" : "border-slate-700 text-slate-300"}`}>{cameraOn ? <CameraOff size={15} /> : <Camera size={15} />}{cameraOn ? "Turn camera off" : "Turn camera on"}</button>
              <p className="m-0 text-[10px] leading-4 text-slate-600 md:mt-2">Video stays on this device and is not uploaded.</p>
            </aside>
          </div>

          {!session.completed && <form className="fixed inset-x-0 bottom-0 z-[8] border-t border-slate-800 bg-[#070b14fa] px-2.5 py-2 pb-[calc(8px+env(safe-area-inset-bottom))] lg:left-[var(--sidebar-width,260px)] lg:px-[max(18px,calc((100vw-1180px)/2))] lg:py-3" onSubmit={submitAnswer}><textarea className="max-h-[120px] w-full resize-none rounded-t-lg border border-slate-700 bg-[#0b1220] p-3 text-[13px] leading-5 text-slate-200 outline-none focus:border-cyan-700" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer naturally, or tap the microphone..." rows={3} maxLength={10000} /><div className="-mt-px flex items-center gap-2 rounded-b-lg border border-slate-700 bg-[#0b1220] p-2"><VoiceInputButton value={answer} onChange={setAnswer} disabled={submitting} className="grid h-[34px] w-[34px] place-items-center rounded-lg text-slate-400" /><span className="ml-auto text-[10px] text-slate-600">{answer.length.toLocaleString()} / 10,000</span><button className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-[0] font-black text-[#04202a] disabled:opacity-40 sm:text-xs" disabled={!answer.trim() || submitting}>{submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}<span className="hidden sm:inline">{submitting ? "Evaluating..." : "Submit answer"}</span><ChevronRight size={15} /></button></div></form>}
        </div>
      )}
      <RechargeModal open={rechargeOpen} reason="interview practice" onClose={() => setRechargeOpen(false)} />
    </div>
  );
}