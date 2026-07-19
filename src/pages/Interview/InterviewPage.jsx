import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Camera, CameraOff, CheckCircle2, ChevronRight, Loader2, RotateCcw, Send } from "lucide-react";
import toast from "react-hot-toast";

import { answerInterview, extractInterviewContext, getInterview, startInterview } from "../../services/interviewService";
import { getResumeModels, getResumeProjects } from "../../services/resumeService";
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
  const [uploadingJobDescription, setUploadingJobDescription] = useState(false);
  const [jobDescriptionUpload, setJobDescriptionUpload] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [form, setForm] = useState({ role: "", company: "", jobDescription: "", resumeProjectId: "", resumeContext: "", resumeFileName: "", type: "MIXED", difficulty: "INTERMEDIATE", questionCount: 5, model: "", language: "AUTO", interviewerStyle: "STRICT", candidateLevel: "EARLY_CAREER", interviewGoal: "JOB_INTERVIEW" });

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
      resumeContext: form.resumeProjectId ? null : form.resumeContext || null,
    });
    publishWorkspaceContext({ kind: "interview", title: `Live: ${form.role.trim()}` });
  }

  async function uploadInterviewResume(file, event) {
    if (!file || uploadingResume) return;
    setUploadingResume(true);
    try {
      // Interview setup only needs faithful resume text; full ATS analysis remains in Resume Studio.
      const result = await extractInterviewContext(file, form.model, undefined, "RESUME");
      setForm((current) => ({
        ...current,
        resumeProjectId: "",
        resumeContext: result.text || "",
        resumeFileName: result.fileName || file.name,
      }));
      window.dispatchEvent(new Event("wallet:refresh"));
      toast.success("Resume read and attached to this interview.");
    } catch (error) {
      if (error?.response?.status === 402) setRechargeOpen(true);
      else toast.error(apiMessage(error, "Resume could not be attached."));
    } finally {
      setUploadingResume(false);
      if (event?.target) event.target.value = "";
    }
  }

  async function uploadJobDescription(file, event) {
    if (!file || uploadingJobDescription) return;
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Upload a PDF, PNG, JPG, or WEBP job description.");
      if (event?.target) event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Job description file must be 5 MB or smaller.");
      if (event?.target) event.target.value = "";
      return;
    }

    setUploadingJobDescription(true);
    setJobDescriptionUpload({ fileName: file.name, stage: "Uploading securely...", progress: 8 });
    const progressTimer = window.setInterval(() => {
      setJobDescriptionUpload((current) => current && current.progress < 88
        ? { ...current, stage: current.progress > 55 ? "Reading and extracting text..." : current.stage, progress: Math.min(88, current.progress + 4) }
        : current);
    }, 450);
    try {
      const result = await extractInterviewContext(file, form.model, (progress) => {
        setJobDescriptionUpload((current) => ({
          fileName: current?.fileName || file.name,
          stage: progress >= 55 ? "Reading and extracting text..." : "Uploading securely...",
          progress: Math.max(current?.progress || 0, progress),
        }));
      });
      setForm((current) => ({ ...current, jobDescription: result.text || current.jobDescription }));
      setJobDescriptionUpload({ fileName: result.fileName || file.name, stage: "Text extracted and attached", progress: 100 });
      window.dispatchEvent(new Event("wallet:refresh"));
      toast.success("Job description read and attached to the interview.");
    } catch (error) {
      setJobDescriptionUpload(null);
      if (error?.response?.status === 402) setRechargeOpen(true);
      else toast.error(apiMessage(error, "Job description could not be read."));
    } finally {
      window.clearInterval(progressTimer);
      setUploadingJobDescription(false);
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
    <div className={`relative h-full min-h-0 bg-[#070b14] text-slate-50 ${liveRoom || session ? "overflow-hidden" : "overflow-auto"}`}>
      {liveRoom ? (
        <LiveInterviewRoom config={liveRoom} onRecharge={() => setRechargeOpen(true)} onExit={() => { setLiveRoom(null); publishWorkspaceContext({ kind: "interview", title: "New practice" }); }} />
      ) : !session ? (
        <InterviewSetup form={form} setForm={setForm} resumes={resumes} models={models} submitting={submitting} uploadingResume={uploadingResume} uploadingJobDescription={uploadingJobDescription} jobDescriptionUpload={jobDescriptionUpload} onSubmit={enterLive} onWritten={beginWritten} onResumeUpload={uploadInterviewResume} onJobDescriptionUpload={uploadJobDescription} />
      ) : (
        <div className="flex h-full min-h-0 flex-col">
          <header className="z-[5] flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-[#070b14f5] px-3 py-2.5 sm:px-5 sm:py-3">
            <div className="min-w-0"><span className="text-[9px] uppercase text-cyan-300 sm:text-[10px]">{session.type?.replaceAll("_", " ")} / {session.difficulty}</span><h1 className="mt-1 truncate text-[13px] font-black sm:text-base">{session.role}{session.company ? ` at ${session.company}` : ""}</h1></div>
            <div className="flex shrink-0 items-center gap-2 text-xs text-slate-300"><strong>{Math.min(session.currentQuestionNumber || 1, session.totalQuestions)} / {session.totalQuestions}</strong><span className="block h-1 w-16 overflow-hidden rounded-full bg-slate-800 sm:w-28"><i className="block h-full bg-cyan-400" style={{ width: `${Math.min(100, ((session.currentQuestionNumber || 1) / session.totalQuestions) * 100)}%` }} /></span></div>
          </header>

          <div className="mx-auto grid min-h-0 w-full max-w-[1180px] flex-1 grid-cols-1 gap-4 overflow-y-auto px-3 pb-4 pt-3 md:grid-cols-[minmax(0,1fr)_240px] md:px-5 md:pt-5 lg:grid-cols-[minmax(0,1fr)_260px]">
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

          {!session.completed && <form className="z-[8] shrink-0 border-t border-slate-800 bg-[#070b14fa] px-2.5 py-2 pb-[calc(8px+env(safe-area-inset-bottom))] lg:px-[max(18px,calc((100vw-1180px)/2))] lg:py-3" onSubmit={submitAnswer}><textarea className="max-h-[120px] w-full resize-none rounded-t-lg border border-slate-700 bg-[#0b1220] p-3 text-[13px] leading-5 text-slate-200 outline-none focus:border-cyan-700" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Answer naturally, or tap the microphone..." rows={3} maxLength={10000} /><div className="-mt-px flex items-center gap-2 rounded-b-lg border border-slate-700 bg-[#0b1220] p-2"><VoiceInputButton value={answer} onChange={setAnswer} disabled={submitting} className="grid h-[34px] w-[34px] place-items-center rounded-lg text-slate-400" /><span className="ml-auto text-[10px] text-slate-600">{answer.length.toLocaleString()} / 10,000</span><button className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-2 text-[0] font-black text-[#04202a] disabled:opacity-40 sm:text-xs" disabled={!answer.trim() || submitting}>{submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}<span className="hidden sm:inline">{submitting ? "Evaluating..." : "Submit answer"}</span><ChevronRight size={15} /></button></div></form>}
        </div>
      )}
      <RechargeModal open={rechargeOpen} reason="interview practice" onClose={() => setRechargeOpen(false)} />
    </div>
  );
}