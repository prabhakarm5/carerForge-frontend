import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import BrandLogo from "./BrandLogo";

/** Shared readable shell for public legal and support pages. */
export function LegalLayout({ title, lastUpdated, children }) {
  return (
    <div className="min-h-screen w-full bg-[#060a12] text-slate-300">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#060a12]/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft size={15} /> Home</Link>
          <BrandLogo size="sm" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="inline-flex items-center gap-2 text-xs font-black uppercase text-cyan-300"><ShieldCheck size={15} /> CareerForge AI</div>
        <h1 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">{title}</h1>
        <p className="mt-2 text-xs text-slate-500">Last updated: {lastUpdated}</p>
        <div className="mt-10 space-y-9 text-sm leading-7 text-slate-300">{children}</div>
      </main>
    </div>
  );
}

export function Section({ number, title, children }) {
  return <section><h2 className="mb-2 flex items-baseline gap-2 text-base font-black text-white"><span className="text-xs text-cyan-300">{number}</span>{title}</h2><div className="space-y-3">{children}</div></section>;
}