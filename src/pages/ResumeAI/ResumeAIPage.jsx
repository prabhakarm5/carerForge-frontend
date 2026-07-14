import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import ReactMarkdown from "react-markdown";
import {
  ArrowDown,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Download,
  FileCheck2,
  FileText,
  Languages,
  LoaderCircle,
  MessageCircle,
  Paperclip,
  Plus,
  Send,
  Sparkles,
  Target,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";

import {
  analyzeResume,
  streamResumeCoach,
  deleteResumeProject,
  downloadAtsResume,
  generateAtsResume,
  getResumeModels,
  getResumeProject,
  getResumeProjects,
  matchResumeToJob,
} from "../../services/resumeService";
import { getWallet } from "../../services/walletService";
import { notifyWorkspaceHistoryChanged, publishWorkspaceContext } from "../../services/workspaceEvents";
import RechargeModal from "../../components/common/recharge/RechargeModal";
import { SpeakButton, VoiceInputButton } from "../../components/voice/VoiceControls";
import "./ResumeAIPage.css";

const ACCEPTED_TYPES = ".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const RESUME_MODEL_STORAGE_KEY = "cf_resume_model";

const COPY = {
  en: {
    greeting: "Hi, I am your Resume Coach. Upload your resume and I will guide you step by step.",
    subGreeting: "You can ask follow-up questions here after the ATS analysis.",
    hasJob: "Do you have a job description for the role you are targeting?",
    yesJob: "Yes, I will paste it",
    noJob: "No, analyze now",
    pasteJob: "Paste the job description below. I will compare it with your resume.",
    askPlaceholder: "Ask about your resume...",
  },
  hi: {
    greeting: "Namaste, main aapka Resume Coach hoon. Resume upload kijiye, main step by step guide karunga.",
    subGreeting: "ATS analysis ke baad aap yahin follow-up questions pooch sakte hain.",
    hasJob: "Kya aapke paas target role ka job description hai?",
    yesJob: "Haan, main paste karunga",
    noJob: "Nahi, abhi analyze karo",
    pasteJob: "Job description neeche paste kijiye. Main use resume se compare karunga.",
    askPlaceholder: "Apne resume ke baare mein poochhiye...",
  },
};

function safeList(value) {
  return Array.isArray(value) ? value : [];
}

function detectLanguage(value) {
  if (/[\u0900-\u097f]/.test(value)) return "hi";
  if (/\b(bhai|mera|meri|mujhe|mujhko|kya|kaise|kyu|hai|hain|hoon|karo|karna|chahiye|nahi|resume ko|batao)\b/i.test(value)) return "hi";
  return "en";
}

function isResumeGenerationRequest(message) {
  const value = message.toLowerCase().replace(/\s+/g, " ").trim();
  const mentionsResume = /\b(resume|cv|curriculum vitae)\b|रेज़्यूमे|रिज्यूमे/.test(value);
  const hasQuestionTone = /\b(kya|can you|could you|doge|sak(?:te|ta|ti)|possible)\b|\?$|क्या|सकते/.test(value);
  const asksToAddMissingDetails = /\b(add|include|insert|daal|dalna|jod|project|experience|internship|link)\b|जोड़|डाल|प्रोजेक्ट|लिंक/.test(value);
  const suppliesDetails = value.length >= 280 || /https?:\/\/|github\.com|linkedin\.com|\btech(?:nology)? stack\b|\bresponsibilit(?:y|ies)\b/.test(value);

  // Questions about adding a project/link need a coach follow-up first. Generating here
  // would silently invent or omit the details the user has not supplied yet.
  if (hasQuestionTone && asksToAddMissingDetails && !suppliesDetails) return false;

  const explicitFinalBuild = /\b(create|generate|build|rewrite|redesign|prepare)\b.*\b(resume|cv)\b|\b(resume|cv)\b.*\b(create|generate|build|rewrite|redesign|prepare)\b/.test(value);
  const hinglishFinalBuild = /\b(resume|cv)\b.*\b(banao|bana do|bana ke do|taiyar karo|ready karo|sudhar do)\b|\b(ab|abb|now)\b.*\b(banao|bana do|generate|final|ready)\b/.test(value);
  const hindiFinalBuild = /(रेज़्यूमे|रिज्यूमे).*(बनाओ|बना दो|तैयार करो|सुधार दो)/.test(value);
  const detailedEdit = suppliesDetails && mentionsResume && /\b(add|include|insert|update|rewrite|design|format|daal|jod)\b|जोड़|डाल|अपडेट/.test(value);

  return explicitFinalBuild || hinglishFinalBuild || hindiFinalBuild || detailedEdit;
}

function isDownloadRequest(message) {
  return /^\s*(download|pdf download|download pdf|resume download|download karo|pdf do)\s*[.!?]*$/i.test(message);
}

function validateResumeFile(file) {
  if (!file) return "Please choose a resume file.";
  if (file.size > MAX_FILE_BYTES) return "Resume must be 5 MB or smaller.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (!["pdf", "docx", "txt", "png", "jpg", "jpeg", "webp"].includes(extension)) {
    return "Upload PDF, DOCX, TXT, PNG, JPG or WEBP.";
  }
  return "";
}

function itemText(item) {
  if (typeof item === "string") return item;
  if (item?.problem) return `${item.problem}${item.fix ? ` Fix: ${item.fix}` : ""}`;
  return item?.message || item?.issue || item?.title || item?.recommendation || item?.description || JSON.stringify(item);
}

function errorMessage(error, fallback) {
  const responseMessage = error?.response?.data?.message;
  if (responseMessage) return responseMessage;
  if (!error?.response && error?.message) return error.message;
  return fallback;
}

function isInsufficientCreditError(error) {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.message || error?.message || "").toLowerCase();
  return status === 402 || /insufficient\s+(tokens?|credits?)|not enough\s+(tokens?|credits?)|out of\s+(tokens?|credits?)/.test(message);
}
function AssistantMark() {
  return <span className="resume-avatar assistant"><Sparkles size={16} /></span>;
}

function ChoiceChips({ choices, disabled }) {
  return (
    <div className="resume-choice-row">
      {choices.map((choice) => (
        <button key={choice.label} type="button" onClick={choice.onClick} disabled={disabled}>
          {choice.icon || <ChevronRight size={14} />}
          <span>{choice.label}</span>
        </button>
      ))}
    </div>
  );
}

function ScoreBadge({ value, label }) {
  const score = Math.max(0, Math.min(100, Number(value) || 0));
  const tone = score >= 80 ? "good" : score >= 60 ? "medium" : "low";
  return (
    <div className={`resume-score-badge ${tone}`}>
      <strong>{score}</strong>
      <span>{label}</span>
    </div>
  );
}

function CompactModelSelector({ models, value, onChange, disabled }) {
  return (
    <label className="resume-model-compact" title="Choose Gemini model">
      <BrainCircuit size={14} />
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled || !models.length}>
        {models.length ? models.map((model) => (
          <option value={model.id} key={model.id}>{model.label}{model.preview ? " (Preview)" : ""}</option>
        )) : <option>Gemini</option>}
      </select>
    </label>
  );
}

function ResumeIntake({ file, onFileSelect, pastedText, setPastedText, onUseText, jobDescription, setJobDescription, step, setStep, onAnalyze, busy }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [sourceMode, setSourceMode] = useState("upload");
  const copy = COPY.hi;

  return (
    <div className="resume-thread-block">
      <AssistantMark />
      <div className="resume-assistant-content">
        <h2>{COPY.en.greeting}</h2>
        <p>{copy.greeting}</p>
        <span className="resume-muted-line">Already have a resume, only screenshots, or just career details? Start from any of them.</span>

        <div className="resume-source-tabs" role="tablist" aria-label="Choose how to start">
          <button type="button" className={sourceMode === "upload" ? "active" : ""} onClick={() => setSourceMode("upload")}><UploadCloud size={15} />Upload resume</button>
          <button type="button" className={sourceMode === "paste" ? "active" : ""} onClick={() => setSourceMode("paste")}><FileText size={15} />Paste or start new</button>
        </div>

        {sourceMode === "upload" ? (
          <div
            className={`resume-chat-upload ${dragging ? "dragging" : ""} ${file ? "selected" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              onFileSelect(event.dataTransfer.files?.[0]);
            }}
          >
            <input ref={inputRef} type="file" accept={ACCEPTED_TYPES} hidden onChange={(event) => onFileSelect(event.target.files?.[0])} />
            {file ? <FileCheck2 size={24} /> : <UploadCloud size={24} />}
            <div>
              <strong>{file?.name || "Drop your resume or screenshots here"}</strong>
              <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB selected` : "PDF, DOCX, TXT, PNG, JPG or WEBP, up to 5 MB"}</span>
            </div>
            <button type="button" onClick={() => inputRef.current?.click()}>{file ? "Change" : "Choose file"}</button>
          </div>
        ) : (
          <div className="resume-paste-intake">
            <div><strong>Paste an old resume or describe yourself</strong><span>Name, contact, education, skills, projects, experience and links. Facts only; missing sections can be added later in chat.</span></div>
            <textarea
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              maxLength={30000}
              placeholder={"Example:\nName and target role\nEmail, phone, city, LinkedIn, GitHub\nEducation with dates\nSkills\nProjects or experience with what you built and achieved"}
            />
            <div className="resume-form-footer">
              <span>{pastedText.length.toLocaleString()} / 30,000</span>
              <button type="button" onClick={onUseText} disabled={pastedText.trim().length < 80 || busy}><Sparkles size={15} />Analyze details</button>
            </div>
          </div>
        )}

        {file && step === "job-choice" && (
          <div className="resume-guided-question">
            <strong>{COPY.en.hasJob}</strong>
            <p>{COPY.hi.hasJob}</p>
            <ChoiceChips disabled={busy} choices={[
              { label: COPY.en.yesJob, icon: <BriefcaseBusiness size={14} />, onClick: () => setStep("job-input") },
              { label: COPY.en.noJob, icon: <Sparkles size={14} />, onClick: () => onAnalyze("") },
            ]} />
          </div>
        )}

        {file && step === "job-input" && (
          <div className="resume-inline-form">
            <strong>{COPY.en.pasteJob}</strong>
            <p>{COPY.hi.pasteJob}</p>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              maxLength={20000}
              placeholder="Paste job title, responsibilities and requirements..."
              autoFocus
            />
            <div className="resume-form-footer">
              <span>{jobDescription.length.toLocaleString()} / 20,000</span>
              <button type="button" onClick={() => onAnalyze(jobDescription)} disabled={!jobDescription.trim() || busy}>
                {busy ? <LoaderCircle className="resume-spin" size={15} /> : <Target size={15} />}
                Analyze and match
              </button>
            </div>
          </div>
        )}

        {busy && (
          <div className="resume-progress-line">
            <LoaderCircle className="resume-spin" size={17} />
            <div><strong>Reading and analyzing your resume...</strong><span>Extracting skills, ATS structure and role gaps.</span></div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisSummary({ project, onOpenReport, onAsk, onMatch, onFindJobs, onGenerate, onDownload, busy }) {
  const analysis = project.analysis || {};
  const issues = safeList(analysis.issues).slice(0, 3);
  const strengths = safeList(analysis.strengths).slice(0, 3);
  const hasJob = Boolean(project.jobDescriptionProvided || analysis.jobMatch?.provided);

  return (
    <div className="resume-thread-block">
      <AssistantMark />
      <div className="resume-assistant-content">
        <div className="resume-result-heading">
          <div><span className="resume-kicker"><Check size={13} /> Analysis complete</span><h2>{analysis.candidate?.headline || "Your ATS report is ready"}</h2></div>
          <div className="resume-score-row">
            <ScoreBadge value={project.atsScore ?? analysis.overallScore} label="ATS" />
            {hasJob && <ScoreBadge value={project.matchScore ?? analysis.jobMatch?.score} label="Match" />}
          </div>
        </div>
        <p className="resume-summary-copy">{analysis.summary || "I reviewed the structure, content, keywords and ATS compatibility of your resume."}</p>

        <div className="resume-insight-grid">
          <section>
            <h3>Strong points</h3>
            {strengths.length ? strengths.map((item, index) => <p key={index}><Check size={14} />{itemText(item)}</p>) : <p>No clear strengths were returned.</p>}
          </section>
          <section>
            <h3>Fix first</h3>
            {issues.length ? issues.map((item, index) => <p key={index}><Target size={14} />{itemText(item)}</p>) : <p>No critical issues were found.</p>}
          </section>
        </div>

        <ChoiceChips disabled={busy} choices={[
          { label: "View full report", icon: <FileText size={14} />, onClick: onOpenReport },
          { label: "Explain biggest issue", icon: <MessageCircle size={14} />, onClick: () => onAsk("Explain my biggest ATS issue in simple terms and tell me exactly how to fix it.") },
          ...(!hasJob ? [{ label: "Match a job", icon: <BriefcaseBusiness size={14} />, onClick: onMatch }] : []),
          { label: "Find matching jobs", icon: <BriefcaseBusiness size={14} />, onClick: onFindJobs },
          { label: project.generatedResume ? "Regenerate ATS resume" : "Build ATS resume", icon: <Sparkles size={14} />, onClick: onGenerate },
          ...(project.generatedResume ? [{ label: "Download PDF", icon: <Download size={14} />, onClick: onDownload }] : []),
        ]} />
      </div>
    </div>
  );
}

function CoachMessage({ message }) {
  const assistant = String(message.role).toUpperCase() !== "USER";
  return (
    <div className={`resume-thread-block ${assistant ? "" : "user"}`}>
      {assistant ? <AssistantMark /> : <span className="resume-avatar user"><UserRound size={15} /></span>}
      <div className={assistant ? "resume-assistant-content resume-markdown" : "resume-user-message"}>
        {assistant ? <ReactMarkdown>{message.content || ""}</ReactMarkdown> : <p>{message.content}</p>}
        {assistant && message.content && <SpeakButton text={message.content} className="resume-attach" title="Read answer aloud" />}
      </div>
    </div>
  );
}

function GeneratedResumeCard({ project, onDownload, busy }) {
  const resume = project.generatedResume || {};
  const sectionCount = [resume.summary, resume.skills?.length, resume.experience?.length, resume.projects?.length, resume.education?.length]
    .filter(Boolean).length;
  return (
    <div className="resume-thread-block">
      <AssistantMark />
      <div className="resume-ready-card">
        <span className="resume-ready-icon"><FileCheck2 size={20} /></span>
        <div className="resume-ready-copy">
          <span>ATS resume ready</span>
          <strong>{resume.name || project.fileName || "Improved resume"}</strong>
          <small>{sectionCount} polished sections | ATS-safe one-column PDF</small>
        </div>
        <button type="button" onClick={onDownload} disabled={busy}>
          {busy ? <LoaderCircle className="resume-spin" size={15} /> : <Download size={15} />}
          Download PDF
        </button>
      </div>
    </div>
  );
}
function JobMatchPrompt({ value, onChange, onSubmit, onCancel, busy }) {
  return (
    <div className="resume-thread-block">
      <AssistantMark />
      <div className="resume-assistant-content resume-inline-form">
        <h2>Match this resume to a job</h2>
        <p>Paste the job description. I will show matched keywords, missing skills and practical gaps.</p>
        <textarea value={value} onChange={(event) => onChange(event.target.value)} maxLength={20000} autoFocus placeholder="Paste the complete job description..." />
        <div className="resume-form-footer">
          <button className="resume-text-button" type="button" onClick={onCancel}>Cancel</button>
          <button type="button" onClick={onSubmit} disabled={!value.trim() || busy}>
            {busy ? <LoaderCircle className="resume-spin" size={15} /> : <Target size={15} />} Match now
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportDrawer({ project, onClose }) {
  const analysis = project.analysis || {};
  const categories = Object.entries(analysis.categoryScores || {});
  const jobMatch = analysis.jobMatch || {};
  const sections = [
    ["Issues to fix", analysis.issues],
    ["Recommendations", analysis.recommendations],
    ["Missing sections", analysis.missingSections],
    ["Matched keywords", jobMatch.matchedKeywords],
    ["Missing keywords", jobMatch.missingKeywords],
    ["Role gaps", jobMatch.gaps],
  ];

  return (
    <div className="resume-report-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="resume-report-drawer" role="dialog" aria-modal="true" aria-label="Full resume report">
        <header><div><span>Resume report</span><h2>{project.fileName}</h2></div><button type="button" onClick={onClose} aria-label="Close report"><X size={18} /></button></header>
        <div className="resume-report-scroll">
          <div className="resume-report-scores">
            <ScoreBadge value={project.atsScore ?? analysis.overallScore} label="ATS score" />
            {(project.jobDescriptionProvided || jobMatch.provided) && <ScoreBadge value={project.matchScore ?? jobMatch.score} label="Job match" />}
          </div>
          {categories.length > 0 && <section><h3>Category scores</h3><div className="resume-category-list">{categories.map(([name, value]) => <div key={name}><span>{name.replace(/([A-Z])/g, " $1")}</span><progress value={Number(value) || 0} max="100" /><strong>{Number(value) || 0}</strong></div>)}</div></section>}
          {sections.map(([title, items]) => safeList(items).length > 0 && (
            <section key={title}><h3>{title}</h3><div className="resume-report-list">{safeList(items).map((item, index) => <p key={index}><ChevronRight size={14} />{itemText(item)}</p>)}</div></section>
          ))}
        </div>
      </aside>
    </div>
  );
}

export default function ResumeAIPage() {
  const { wallet, setWallet } = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const requestedProjectId = searchParams.get("project");
  const startNewRequested = searchParams.get("new") === "1";
  const [, setProjects] = useState([]);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem(RESUME_MODEL_STORAGE_KEY) || "");
  const [activeProject, setActiveProject] = useState(null);
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [intakeStep, setIntakeStep] = useState("file");
  const [composer, setComposer] = useState("");
  const [language, setLanguage] = useState("en");
  const [showReport, setShowReport] = useState(false);
  const [showJobMatch, setShowJobMatch] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [action, setAction] = useState("");
  const [showJump, setShowJump] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const scrollRef = useRef(null);
  const composerRef = useRef(null);
  const attachRef = useRef(null);
  const followRef = useRef(true);

  const busy = Boolean(action);
  const copy = COPY[language];

  const refreshWallet = useCallback(() => {
    if (!setWallet) return Promise.resolve();
    return getWallet().then(setWallet).catch(() => {});
  }, [setWallet]);

  const handleActionError = (error, fallback) => {
    if (isInsufficientCreditError(error)) {
      setRechargeOpen(true);
      toast.error("You need more tokens to continue with Resume AI.");
      return;
    }
    toast.error(errorMessage(error, fallback));
  };

  const selectModel = useCallback((modelId) => {
    setSelectedModel(modelId);
    if (modelId) localStorage.setItem(RESUME_MODEL_STORAGE_KEY, modelId);
  }, []);

  const resetNew = useCallback(() => {
    setActiveProject(null);
    setFile(null);
    setJobDescription("");
    setPastedText("");
    setIntakeStep("file");
    setComposer("");
    setShowJobMatch(false);
    setShowReport(false);
    setSearchParams({ new: "1" });
    followRef.current = true;
  }, [setSearchParams]);

  const loadWorkspace = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await getResumeProjects();
      setProjects(data);
      if (startNewRequested || !data.length) {
        setActiveProject(null);
        setIntakeStep("file");
      } else {
        const target = data.find((item) => String(item.id) === requestedProjectId) || data[0];
        const detail = await getResumeProject(target.id);
        setActiveProject(detail);
        if (detail.modelId) selectModel(detail.modelId);
      }
    } catch (error) {
      toast.error(errorMessage(error, "Could not load resume history."));
    } finally {
      setLoadingHistory(false);
    }
  }, [requestedProjectId, selectModel, startNewRequested]);

  useEffect(() => {
    const timer = window.setTimeout(loadWorkspace, 0);
    return () => window.clearTimeout(timer);
  }, [loadWorkspace]);

  useEffect(() => {
    getResumeModels().then((data) => {
      setModels(data);
      setSelectedModel((current) => {
        const next = data.some((model) => model.id === current) ? current : (data.find((model) => model.defaultModel)?.id || data[0]?.id || "");
        if (next) localStorage.setItem(RESUME_MODEL_STORAGE_KEY, next);
        return next;
      });
    }).catch((error) => toast.error(errorMessage(error, "Could not load Gemini models.")));
  }, []);

  useEffect(() => {
    publishWorkspaceContext(activeProject
      ? { kind: "resume", title: activeProject.fileName || "Resume analysis", id: activeProject.id }
      : { kind: "resume", title: "New resume analysis" });
  }, [activeProject]);

  useEffect(() => {
    if (!followRef.current || !scrollRef.current) return;
    window.requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: action ? "smooth" : "auto" }));
  }, [activeProject, action, intakeStep, showJobMatch]);

  useEffect(() => {
    if (!composerRef.current) return;
    composerRef.current.style.height = "auto";
    composerRef.current.style.height = `${Math.min(composerRef.current.scrollHeight, 150)}px`;
  }, [composer]);

  const replaceProject = (project) => {
    setActiveProject(project);
    if (project.modelId) selectModel(project.modelId);
    setProjects((current) => [{
      id: project.id,
      fileName: project.fileName,
      status: project.status,
      modelId: project.modelId,
      modelLabel: project.modelLabel,
      atsScore: project.atsScore,
      matchScore: project.matchScore,
      jobDescriptionProvided: project.jobDescriptionProvided,
      updatedAt: project.updatedAt,
    }, ...current.filter((item) => item.id !== project.id)]);
    notifyWorkspaceHistoryChanged("resume");
    setSearchParams({ project: project.id }, { replace: true });
  };

  const selectResumeFile = useCallback((nextFile) => {
    const validationError = validateResumeFile(nextFile);
    if (validationError) {
      toast.error(validationError);
      return false;
    }
    setFile(nextFile);
    setIntakeStep("job-choice");
    return true;
  }, []);

  const usePastedResume = useCallback(() => {
    const source = pastedText.trim();
    if (source.length < 80) {
      toast.error("Add at least 80 characters of truthful resume or career details.");
      return;
    }
    const pastedFile = new File([source], "Career_Details.txt", { type: "text/plain;charset=utf-8" });
    selectResumeFile(pastedFile);
  }, [pastedText, selectResumeFile]);

  const attachAnotherResume = useCallback((nextFile) => {
    if (!nextFile || validateResumeFile(nextFile)) {
      const validationError = validateResumeFile(nextFile);
      if (validationError) toast.error(validationError);
      return;
    }
    resetNew();
    setFile(nextFile);
    setIntakeStep("job-choice");
  }, [resetNew]);
  const submitAnalysis = async (description = "") => {
    if (!file || busy) return;
    setAction("analyzing");
    followRef.current = true;
    try {
      const project = await analyzeResume(file, description, selectedModel);
      replaceProject(project);
      setFile(null);
      setJobDescription("");
      setIntakeStep("file");
      refreshWallet();
      toast.success("Resume analysis is ready.");
    } catch (error) {
      handleActionError(error, "Resume analysis failed.");
    } finally {
      setAction("");
    }
  };

  const runGeneration = async (instructions) => {
    const message = instructions.trim() || "Create a complete ATS-friendly resume and make it ready to download.";
    if (!activeProject || busy) return;
    const optimistic = { id: `local-${safeList(activeProject.messages).length}`, role: "USER", content: message };
    setLanguage(detectLanguage(message));
    setComposer("");
    setStreamingText("");
    setActiveProject((current) => ({ ...current, messages: [...safeList(current.messages), optimistic] }));
    setAction("generating");
    followRef.current = true;
    try {
      const response = await generateAtsResume(activeProject.id, message, selectedModel);
      const assistant = {
        id: `generated-${safeList(activeProject.messages).length + 1}`,
        role: "ASSISTANT",
        content: response.message || "Your improved ATS-friendly resume is ready. Use Download PDF below.",
      };
      setActiveProject((current) => ({
        ...current,
        status: "GENERATED",
        generatedResume: response.resume,
        downloadUrl: response.downloadUrl,
        messages: [...safeList(current.messages), assistant],
      }));
      setProjects((current) => current.map((item) => item.id === activeProject.id ? { ...item, status: "GENERATED" } : item));
      notifyWorkspaceHistoryChanged("resume");
      refreshWallet();
      toast.success("Your ATS-friendly resume is ready to download.");
    } catch (error) {
      setActiveProject((current) => ({ ...current, messages: safeList(current.messages).filter((item) => item.id !== optimistic.id) }));
      handleActionError(error, "Could not generate the ATS resume.");
    } finally {
      setAction("");
    }
  };

  const sendCoachMessage = async (text = composer) => {
    const message = text.trim();
    if (!message || !activeProject || busy) return;
    if (isDownloadRequest(message) && activeProject.generatedResume) {
      setComposer("");
      await downloadResume();
      return;
    }
    if (isResumeGenerationRequest(message)) {
      await runGeneration(message);
      return;
    }

    setLanguage(detectLanguage(message));
    setComposer("");
    setStreamingText("");
    followRef.current = true;
    const optimistic = { id: `local-${safeList(activeProject.messages).length}`, role: "USER", content: message };
    setActiveProject((current) => ({ ...current, messages: [...safeList(current.messages), optimistic] }));
    setAction("chatting");
    try {
      const answer = await streamResumeCoach(activeProject.id, message, selectedModel, {
        onChunk: setStreamingText,
      });
      setActiveProject((current) => ({
        ...current,
        messages: [...safeList(current.messages), { id: `ai-${safeList(activeProject.messages).length + 1}`, role: "ASSISTANT", content: answer }],
        modelId: selectedModel,
        modelLabel: models.find((model) => model.id === selectedModel)?.label || selectedModel,
      }));
      refreshWallet();
    } catch (error) {
      handleActionError(error, "Resume coach could not complete the response.");
    } finally {
      setStreamingText("");
      setAction("");
    }
  };
  const matchJob = async () => {
    if (!jobDescription.trim() || !activeProject || busy) return;
    setAction("matching");
    try {
      replaceProject(await matchResumeToJob(activeProject.id, jobDescription.trim(), selectedModel));
      setJobDescription("");
      setShowJobMatch(false);
      refreshWallet();
      toast.success("Job match analysis is ready.");
    } catch (error) {
      handleActionError(error, "Job matching failed.");
    } finally {
      setAction("");
    }
  };

  const generateResume = async () => {
    const instruction = language === "hi"
      ? "Mera complete ATS-friendly resume improve karke banao aur download ke liye ready karo. Koi fact invent mat karna."
      : "Create my complete improved ATS-friendly resume and make it ready to download. Do not invent facts.";
    await runGeneration(instruction);
  };
  const downloadResume = async () => {
    if (!activeProject || busy) return;
    setAction("downloading");
    try {
      await downloadAtsResume(activeProject.id, `ATS_${activeProject.fileName?.replace(/\.[^.]+$/, "") || "Resume"}.pdf`);
    } catch (error) {
      toast.error(errorMessage(error, "Could not download the resume."));
    } finally {
      setAction("");
    }
  };

  const removeProject = async () => {
    if (!activeProject || busy || !window.confirm("Delete this resume analysis and its coach messages?")) return;
    setAction("deleting");
    try {
      await deleteResumeProject(activeProject.id);
      notifyWorkspaceHistoryChanged("resume");
      resetNew();
      toast.success("Resume analysis deleted.");
    } catch (error) {
      toast.error(errorMessage(error, "Could not delete this analysis."));
    } finally {
      setAction("");
    }
  };

  const messages = useMemo(() => safeList(activeProject?.messages), [activeProject?.messages]);

  return (
    <div className="resume-page">
      <header className="resume-chat-header">
        <div className="resume-header-title"><span className="resume-header-mark"><FileText size={17} /></span><div><strong>Resume Coach</strong><span>{activeProject?.fileName || "Guided ATS workspace"}</span></div></div>
        <div className="resume-header-actions">
          <span className="resume-language" title="Replies automatically follow your language"><Languages size={13} /> Auto</span>
          <CompactModelSelector models={models} value={selectedModel} onChange={selectModel} disabled={busy} />
          {activeProject && <button className="resume-icon-button danger" type="button" onClick={removeProject} disabled={busy} title="Delete analysis"><Trash2 size={16} /></button>}
          <button className="resume-new-button" type="button" onClick={resetNew} disabled={busy}><Plus size={15} /><span>New</span></button>
        </div>
      </header>

      <div
        className="resume-chat-scroll"
        ref={scrollRef}
        onScroll={(event) => {
          const element = event.currentTarget;
          const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 96;
          followRef.current = atBottom;
          setShowJump(!atBottom);
        }}
      >
        <div className="resume-thread">
          {loadingHistory ? (
            <div className="resume-center-status"><LoaderCircle className="resume-spin" size={22} /><span>Opening Resume Coach...</span></div>
          ) : !activeProject ? (
            <ResumeIntake file={file} onFileSelect={selectResumeFile} pastedText={pastedText} setPastedText={setPastedText} onUseText={usePastedResume} jobDescription={jobDescription} setJobDescription={setJobDescription} step={intakeStep} setStep={setIntakeStep} onAnalyze={submitAnalysis} busy={action === "analyzing"} />
          ) : (
            <>
              <AnalysisSummary project={activeProject} onOpenReport={() => setShowReport(true)} onAsk={sendCoachMessage} onMatch={() => setShowJobMatch(true)} onFindJobs={() => navigate(`/jobs?query=${encodeURIComponent(activeProject.generatedResume?.headline || activeProject.analysis?.candidate?.headline || "Software Developer")}`)} onGenerate={generateResume} onDownload={downloadResume} busy={busy} />
              {messages.map((message) => <CoachMessage key={message.id} message={message} />)}
              {activeProject.generatedResume && <GeneratedResumeCard project={activeProject} onDownload={downloadResume} busy={action === "downloading"} />}
              {showJobMatch && <JobMatchPrompt value={jobDescription} onChange={setJobDescription} onSubmit={matchJob} onCancel={() => { setShowJobMatch(false); setJobDescription(""); }} busy={action === "matching"} />}
              {action === "chatting" && streamingText && <CoachMessage message={{ role: "ASSISTANT", content: streamingText }} />}
              {action === "chatting" && !streamingText && <div className="resume-thread-block"><AssistantMark /><div className="resume-typing"><span /><span /><span /><em>Reviewing your resume</em></div></div>}
              {action === "generating" && <div className="resume-thread-block"><AssistantMark /><div className="resume-progress-line"><LoaderCircle className="resume-spin" size={17} /><div><strong>Building your ATS-friendly resume...</strong><span>Improving wording and structure without inventing facts.</span></div></div></div>}
            </>
          )}
        </div>
      </div>

      {activeProject && (
        <footer className="resume-composer-shell">
          <div className="resume-composer">
            <input ref={attachRef} type="file" accept={ACCEPTED_TYPES} hidden onChange={(event) => { attachAnotherResume(event.target.files?.[0]); event.target.value = ""; }} />
            <button type="button" className="resume-attach" onClick={() => attachRef.current?.click()} title="Attach another PDF or resume image"><Paperclip size={17} /></button>
            <textarea
              ref={composerRef}
              value={composer}
              rows="1"
              maxLength={20000}
              placeholder={copy.askPlaceholder}
              disabled={busy}
              onChange={(event) => { setComposer(event.target.value); if (event.target.value.trim()) setLanguage(detectLanguage(event.target.value)); }}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); sendCoachMessage(); } }}
            />
            <VoiceInputButton value={composer} onChange={setComposer} disabled={busy} className="resume-attach" title="Speak your message" />
            <button className="resume-send" type="button" onClick={() => sendCoachMessage()} disabled={!composer.trim() || busy} aria-label="Send message">{busy ? <LoaderCircle className="resume-spin" size={17} /> : <Send size={17} />}</button>
          </div>
          <p>CareerForge can make mistakes. Verify dates, skills and experience before applying.</p>
        </footer>
      )}

      <RechargeModal
        open={rechargeOpen}
        reason="tokens"
        onClose={() => setRechargeOpen(false)}
        currentPlanId={wallet?.currentPlanId}
        onActivated={refreshWallet}
      />
      {showJump && activeProject && <button className="resume-jump-bottom" type="button" onClick={() => { followRef.current = true; setShowJump(false); scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }} title="Jump to latest"><ArrowDown size={17} /></button>}
      {showReport && activeProject && <ReportDrawer project={activeProject} onClose={() => setShowReport(false)} />}
    </div>
  );
}