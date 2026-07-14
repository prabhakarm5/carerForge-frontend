import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BriefcaseBusiness,
  Building2,
  Check,
  Download,
  FileText,
  LoaderCircle,
  PenLine,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";

import {
  deleteCoverLetter,
  downloadCoverLetter,
  generateCoverLetter,
  getCoverLetter,
  getCoverLetterStyles,
  regenerateCoverLetter,
  updateCoverLetter,
} from "../../services/coverLetterService";
import { getResumeModels, getResumeProjects } from "../../services/resumeService";
import { getWallet } from "../../services/walletService";
import { notifyWorkspaceHistoryChanged, publishWorkspaceContext } from "../../services/workspaceEvents";
import RechargeModal from "../../components/common/recharge/RechargeModal";
import "./CoverLetterPage.css";

const MODEL_STORAGE_KEY = "cf_cover_letter_model";
const EMPTY_FORM = {
  resumeProjectId: "",
  company: "",
  role: "",
  jobDescription: "",
  style: "",
  model: "",
  instructions: "",
};

function messageFor(error, fallback) {
  return error?.response?.data?.message || error?.message || fallback;
}

function needsRecharge(error) {
  const status = error?.response?.status;
  const message = String(messageFor(error, "")).toLowerCase();
  return status === 402 || /insufficient|not enough.*(credit|token)/.test(message);
}

export default function CoverLetterPage() {
  const { wallet, setWallet } = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get("letter");
  const newRequested = searchParams.get("new") === "1";
  const [resumes, setResumes] = useState([]);
  const [models, setModels] = useState([]);
  const [styles, setStyles] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [letter, setLetter] = useState(null);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [pageError, setPageError] = useState("");
  const [rechargeOpen, setRechargeOpen] = useState(false);

  const dirty = Boolean(letter) && content !== savedContent;
  const wordCount = useMemo(() => content.trim() ? content.trim().split(/\s+/).length : 0, [content]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getResumeProjects(), getResumeModels(), getCoverLetterStyles()])
      .then(([resumeData, modelData, styleData]) => {
        if (cancelled) return;
        const nextResumes = Array.isArray(resumeData) ? resumeData : [];
        const nextModels = Array.isArray(modelData) ? modelData : [];
        const nextStyles = Array.isArray(styleData) ? styleData : [];
        const storedModel = localStorage.getItem(MODEL_STORAGE_KEY);
        const selectedModel = nextModels.some((item) => item.id === storedModel)
          ? storedModel : nextModels[0]?.id || "";
        setResumes(nextResumes);
        setModels(nextModels);
        setStyles(nextStyles);
        setForm((current) => ({
          ...current,
          resumeProjectId: current.resumeProjectId || nextResumes[0]?.id || "",
          model: current.model || selectedModel,
          style: current.style || nextStyles[0]?.id || "",
        }));
      })
      .catch((error) => setPageError(messageFor(error, "Cover Letter Studio could not load.")))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!requestedId || newRequested) {
      const resetTimer = window.setTimeout(() => {
        setLetter(null);
        setContent("");
        setSavedContent("");
        setPageError("");
        setForm((current) => ({ ...current, company: "", role: "", jobDescription: "", instructions: "" }));
        publishWorkspaceContext({ kind: "coverLetter", title: "New cover letter" });
      }, 0);
      return () => window.clearTimeout(resetTimer);
    }
    let cancelled = false;
    getCoverLetter(requestedId)
      .then((data) => {
        if (cancelled) return;
        setLetter(data);
        setContent(data.content || "");
        setSavedContent(data.content || "");
        setForm({
          resumeProjectId: data.resumeProjectId,
          company: data.company,
          role: data.role,
          jobDescription: data.jobDescription,
          style: data.style,
          model: data.modelId,
          instructions: data.lastInstructions || "",
        });
        setPageError("");
        publishWorkspaceContext({ kind: "coverLetter", title: `${data.role} at ${data.company}`, id: data.id });
      })
      .catch((error) => setPageError(messageFor(error, "This cover letter could not be loaded.")))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [newRequested, requestedId]);

  useEffect(() => {
    function saveShortcut(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s" && dirty) {
        event.preventDefault();
        saveEdits();
      }
    }
    window.addEventListener("keydown", saveShortcut);
    return () => window.removeEventListener("keydown", saveShortcut);
  });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "model") {
      localStorage.setItem(MODEL_STORAGE_KEY, value);
    }
  }

  async function refreshWallet() {
    try {
      const nextWallet = await getWallet();
      setWallet?.(nextWallet);
    } catch {
      // The finished document remains usable even if the wallet badge refresh is delayed.
    }
  }

  function handleError(error, fallback) {
    if (needsRecharge(error)) setRechargeOpen(true);
    const message = messageFor(error, fallback);
    setPageError(message);
    toast.error(message);
  }

  async function createLetter(event) {
    event.preventDefault();
    if (!form.resumeProjectId || !form.company.trim() || !form.role.trim() || !form.jobDescription.trim()) {
      setPageError("Select a resume and add company, role, and job description.");
      return;
    }
    setBusy("generating");
    setPageError("");
    try {
      const data = await generateCoverLetter({
        ...form,
        company: form.company.trim(),
        role: form.role.trim(),
        jobDescription: form.jobDescription.trim(),
        instructions: form.instructions.trim() || null,
        model: form.model || null,
      });
      setLetter(data);
      setContent(data.content || "");
      setSavedContent(data.content || "");
      setSearchParams({ letter: data.id }, { replace: true });
      notifyWorkspaceHistoryChanged("coverLetter");
      publishWorkspaceContext({ kind: "coverLetter", title: `${data.role} at ${data.company}`, id: data.id });
      await refreshWallet();
      toast.success("Cover letter generated.");
    } catch (error) {
      handleError(error, "Cover letter could not be generated.");
    } finally {
      setBusy("");
    }
  }

  async function saveEdits() {
    if (!letter || !content.trim() || !dirty || busy) return;
    setBusy("saving");
    try {
      const data = await updateCoverLetter(letter.id, content.trim());
      setLetter(data);
      setContent(data.content);
      setSavedContent(data.content);
      notifyWorkspaceHistoryChanged("coverLetter");
      toast.success("Edits saved.");
    } catch (error) {
      handleError(error, "Edits could not be saved.");
    } finally {
      setBusy("");
    }
  }

  async function regenerate() {
    if (!letter || busy || (dirty && !window.confirm("Regenerate and replace your unsaved edits?"))) return;
    setBusy("regenerating");
    setPageError("");
    try {
      const data = await regenerateCoverLetter(letter.id, {
        style: form.style,
        model: form.model || null,
        instructions: form.instructions.trim() || null,
      });
      setLetter(data);
      setContent(data.content || "");
      setSavedContent(data.content || "");
      notifyWorkspaceHistoryChanged("coverLetter");
      await refreshWallet();
      toast.success("Cover letter regenerated.");
    } catch (error) {
      handleError(error, "Cover letter could not be regenerated.");
    } finally {
      setBusy("");
    }
  }

  async function download(format) {
    if (!letter || busy) return;
    setBusy(`download-${format}`);
    try {
      await downloadCoverLetter(letter.id, format);
    } catch (error) {
      handleError(error, `The ${format.toUpperCase()} could not be downloaded.`);
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!letter || busy || !window.confirm("Delete this cover letter?")) return;
    setBusy("deleting");
    try {
      await deleteCoverLetter(letter.id);
      notifyWorkspaceHistoryChanged("coverLetter");
      setLetter(null);
      setContent("");
      setSavedContent("");
      setSearchParams({ new: "1" }, { replace: true });
      toast.success("Cover letter deleted.");
    } catch (error) {
      handleError(error, "Cover letter could not be deleted.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="cover-studio">
      <header className="cover-studio-header">
        <div className="cover-title-row">
          <span className="cover-title-icon"><PenLine size={18} /></span>
          <div>
            <h1>Cover Letter Studio</h1>
            <span>{letter ? `${letter.role} at ${letter.company}` : "New application"}</span>
          </div>
        </div>
        {letter && (
          <div className={`cover-save-state ${dirty ? "dirty" : "saved"}`}>
            {dirty ? <PenLine size={12} /> : <Check size={12} />}
            {dirty ? "Unsaved edits" : "Saved"}
          </div>
        )}
      </header>

      <div className="cover-studio-body">
        <form className="cover-controls" onSubmit={createLetter}>
          <div className="cover-section-heading"><FileText size={14} /><span>Application details</span></div>

          <label className="cover-field">
            <span>Resume</span>
            <select value={form.resumeProjectId} onChange={(event) => updateField("resumeProjectId", event.target.value)} disabled={Boolean(letter) || busy}>
              {!resumes.length && <option value="">No analyzed resume</option>}
              {resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.fileName} - {resume.atsScore ?? 0}/100</option>)}
            </select>
          </label>

          {!loading && !resumes.length && (
            <Link className="cover-resume-link" to="/resume"><Sparkles size={13} /> Analyze a resume first</Link>
          )}

          <div className="cover-two-fields">
            <label className="cover-field">
              <span><Building2 size={12} /> Company</span>
              <input value={form.company} onChange={(event) => updateField("company", event.target.value)} placeholder="Company name" maxLength={140} disabled={Boolean(letter) || busy} />
            </label>
            <label className="cover-field">
              <span><BriefcaseBusiness size={12} /> Role</span>
              <input value={form.role} onChange={(event) => updateField("role", event.target.value)} placeholder="Target role" maxLength={140} disabled={Boolean(letter) || busy} />
            </label>
          </div>

          <label className="cover-field cover-jd-field">
            <span>Job description</span>
            <textarea value={form.jobDescription} onChange={(event) => updateField("jobDescription", event.target.value)} placeholder="Paste the complete job description" maxLength={20000} disabled={Boolean(letter) || busy} />
            <small>{form.jobDescription.length.toLocaleString()} / 20,000</small>
          </label>

          <div className="cover-section-heading cover-tone-heading"><Sparkles size={14} /><span>Writing setup</span></div>
          <div className="cover-style-grid" role="radiogroup" aria-label="Cover letter style">
            {styles.map((style) => (
              <button key={style.id} type="button" role="radio" aria-checked={form.style === style.id} onClick={() => updateField("style", style.id)} className={form.style === style.id ? "active" : ""} disabled={busy} title={style.description}>
                <strong>{style.label}</strong>
                <span>{style.description}</span>
              </button>
            ))}
          </div>

          <label className="cover-field">
            <span>Gemini model</span>
            <select value={form.model} onChange={(event) => updateField("model", event.target.value)} disabled={busy || !models.length}>
              {models.map((model) => <option key={model.id} value={model.id}>{model.label}{model.preview ? " (Preview)" : ""}</option>)}
            </select>
          </label>

          <label className="cover-field cover-instructions">
            <span>Focus notes <em>Optional</em></span>
            <textarea value={form.instructions} onChange={(event) => updateField("instructions", event.target.value)} placeholder="Example: emphasize backend ownership and measurable impact" maxLength={4000} disabled={busy} />
          </label>

          {!letter ? (
            <button className="cover-primary-action" type="submit" disabled={loading || Boolean(busy) || !resumes.length || !styles.length || !models.length}>
              {busy === "generating" ? <LoaderCircle className="cover-spin" size={16} /> : <Sparkles size={16} />}
              {busy === "generating" ? "Writing cover letter..." : "Generate cover letter"}
            </button>
          ) : (
            <button className="cover-secondary-action" type="button" onClick={regenerate} disabled={Boolean(busy)}>
              {busy === "regenerating" ? <LoaderCircle className="cover-spin" size={15} /> : <RefreshCw size={15} />}
              Regenerate
            </button>
          )}
        </form>

        <main className="cover-editor-area">
          {pageError && <div className="cover-error" role="alert">{pageError}</div>}
          {loading && !letter ? (
            <div className="cover-empty"><LoaderCircle className="cover-spin" size={24} /><strong>Loading workspace...</strong></div>
          ) : letter ? (
            <>
              <div className="cover-editor-toolbar">
                <div><strong>{wordCount}</strong><span> words</span></div>
                <div className="cover-toolbar-actions">
                  <button type="button" onClick={saveEdits} disabled={!dirty || Boolean(busy)} title="Save edits"><Save size={14} /><span>Save</span></button>
                  <button type="button" onClick={() => download("pdf")} disabled={Boolean(busy)} title="Download PDF">{busy === "download-pdf" ? <LoaderCircle className="cover-spin" size={14} /> : <Download size={14} />}<span>PDF</span></button>
                  <button type="button" onClick={() => download("docx")} disabled={Boolean(busy)} title="Download DOCX">{busy === "download-docx" ? <LoaderCircle className="cover-spin" size={14} /> : <Download size={14} />}<span>DOCX</span></button>
                  <button className="danger" type="button" onClick={remove} disabled={Boolean(busy)} title="Delete cover letter"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="cover-paper-wrap">
                <div className="cover-paper-meta">
                  <strong>{letter.resumeFileName}</strong>
                  <span>{letter.styleLabel} / {letter.modelLabel}</span>
                </div>
                <textarea className="cover-paper" value={content} onChange={(event) => setContent(event.target.value)} spellCheck="true" aria-label="Editable cover letter" />
              </div>
            </>
          ) : (
            <div className="cover-empty">
              <span className="cover-empty-mark"><FileText size={28} /></span>
              <strong>Your cover letter will appear here</strong>
            </div>
          )}
        </main>
      </div>

      <RechargeModal open={rechargeOpen} reason="tokens" onClose={() => setRechargeOpen(false)} currentPlanId={wallet?.currentPlanId} onActivated={refreshWallet} />
    </div>
  );
}
