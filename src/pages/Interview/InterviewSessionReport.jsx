import { BarChart3, CheckCircle2, Clock3, MessageSquareText, ShieldCheck, Target } from "lucide-react";
import "./InterviewSessionReport.css";


function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export default function InterviewSessionReport({ report, onDone }) {
  return (
    <main className="interview-session-report">
      <header className="session-report-header">
        <div>
          <span><ShieldCheck size={14} />Temporary session report</span>
          <h1>{report.role}</h1>
          <p>This practice snapshot stays in this browser view and is not saved on the server.</p>
        </div>
        <div className="session-score" aria-label={`Practice score ${report.score} out of 100`}>
          <strong>{report.score}</strong><small>/100</small>
        </div>
      </header>

      <section className="session-report-metrics" aria-label="Interview metrics">
        <div><MessageSquareText size={17} /><span>Answers<strong>{report.answers}</strong></span></div>
        <div><Clock3 size={17} /><span>Duration<strong>{formatDuration(report.durationSeconds)}</strong></span></div>
        <div><BarChart3 size={17} /><span>Captured words<strong>{report.words}</strong></span></div>
        <div><Target size={17} /><span>Speaking pace<strong>{report.speakingPace} wpm</strong></span></div>
      </section>

      <div className="session-report-columns">
        <section className="session-feedback strengths">
          <header><CheckCircle2 size={17} /><div><h2>What worked</h2><p>Signals detected in this practice session</p></div></header>
          <ul>{report.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
        <section className="session-feedback improvements">
          <header><Target size={17} /><div><h2>Next improvements</h2><p>Focus points for the next attempt</p></div></header>
          <ul>{report.improvements.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </div>

      <footer className="session-report-footer">
        <p>Practice score is a coaching estimate, not an employer decision.</p>
        <button type="button" onClick={onDone}>Finish session</button>
      </footer>
    </main>
  );
}
