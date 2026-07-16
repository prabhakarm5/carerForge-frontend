import { BarChart3, CheckCircle2, Clock3, MessageSquareText, ShieldCheck, Target } from "lucide-react";

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remaining = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remaining}`;
}

export default function InterviewSessionReport({ report, onDone }) {
  const metrics = [
    [MessageSquareText, "Answers", report.answers],
    [Clock3, "Duration", formatDuration(report.durationSeconds)],
    [BarChart3, "Captured words", report.words],
    [Target, "Speaking pace", `${report.speakingPace} wpm`],
  ];
  return (
    <main className="h-full min-h-0 overflow-auto bg-[#070b12] p-3.5 text-slate-50 sm:p-[clamp(18px,4vw,46px)]">
      <header className="mx-auto flex w-full max-w-[1040px] items-center justify-between gap-4 border-b border-slate-700 py-1.5 pb-5 sm:items-end sm:gap-6 sm:py-3 sm:pb-7">
        <div className="min-w-0"><span className="flex items-center gap-2 text-[10px] font-extrabold uppercase text-cyan-300 sm:text-[11px]"><ShieldCheck size={14} />Temporary session report</span><h1 className="mb-0 mt-2 truncate text-[22px] font-black sm:mb-1 sm:mt-2.5 sm:text-[clamp(24px,4vw,42px)]">{report.role}</h1><p className="hidden max-w-[620px] text-xs leading-5 text-slate-400 min-[391px]:block">This practice snapshot stays in this browser view and is not saved on the server.</p></div>
        <div className="flex h-[72px] w-[72px] shrink-0 items-baseline justify-center rounded-full border border-cyan-800 bg-cyan-950/50 pt-5 shadow-[inset_0_0_0_5px_#09151c] sm:h-[118px] sm:w-[118px] sm:pt-9 sm:shadow-[inset_0_0_0_7px_#09151c]" aria-label={`Practice score ${report.score} out of 100`}><strong className="text-[23px] leading-none text-cyan-200 sm:text-4xl">{report.score}</strong><small className="text-[10px] text-slate-500 sm:text-[11px]">/100</small></div>
      </header>

      <section className="mx-auto grid w-full max-w-[1040px] grid-cols-2 gap-2 py-3.5 sm:grid-cols-4 sm:py-5" aria-label="Interview metrics">{metrics.map(([Icon,label,value]) => <div className="flex min-w-0 items-center gap-2.5 rounded-lg border border-slate-700 bg-[#0c131e] p-2.5 sm:p-3.5" key={label}><Icon size={17} className="shrink-0 text-cyan-300" /><span className="min-w-0 text-[9px] uppercase text-slate-500">{label}<strong className="mt-1 block truncate text-xs normal-case text-slate-100 sm:text-sm">{value}</strong></span></div>)}</section>

      <div className="mx-auto grid w-full max-w-[1040px] grid-cols-1 gap-3 sm:grid-cols-2">
        <section className="min-w-0 border-t-[3px] border-emerald-400 bg-[#0b121c] px-3.5 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5"><header className="flex items-start gap-2.5"><CheckCircle2 size={17} className="shrink-0 text-emerald-400" /><div><h2 className="m-0 text-[15px] font-bold">What worked</h2><p className="mt-1 text-[9px] text-slate-500">Signals detected in this practice session</p></div></header><ul className="mt-4 grid gap-2.5">{report.strengths.map((item) => <li className="relative pl-4 text-[11px] leading-5 text-slate-300 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-emerald-400" key={item}>{item}</li>)}</ul></section>
        <section className="min-w-0 border-t-[3px] border-amber-300 bg-[#0b121c] px-3.5 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5"><header className="flex items-start gap-2.5"><Target size={17} className="shrink-0 text-amber-300" /><div><h2 className="m-0 text-[15px] font-bold">Next improvements</h2><p className="mt-1 text-[9px] text-slate-500">Focus points for the next attempt</p></div></header><ul className="mt-4 grid gap-2.5">{report.improvements.map((item) => <li className="relative pl-4 text-[11px] leading-5 text-slate-300 before:absolute before:left-0 before:top-2 before:h-1.5 before:w-1.5 before:rounded-full before:bg-amber-300" key={item}>{item}</li>)}</ul></section>
      </div>

      <footer className="mx-auto flex w-full max-w-[1040px] flex-col items-stretch gap-3 py-5 sm:flex-row sm:items-center sm:justify-between"><p className="m-0 text-[10px] text-slate-500">Practice score is a coaching estimate, not an employer decision.</p><button className="h-10 rounded-md bg-cyan-300 px-5 text-[11px] font-black text-[#041116] hover:bg-cyan-200" type="button" onClick={onDone}>Finish session</button></footer>
    </main>
  );
}