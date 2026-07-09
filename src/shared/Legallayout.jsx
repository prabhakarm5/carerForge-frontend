import { Link } from "react-router-dom";
import { ArrowLeft, Flame } from "lucide-react";

/**
 * Shared shell for legal/policy pages (Terms, Payment & Credits Policy, etc.)
 * Kept visually consistent with the auth screens but built for reading:
 * plain text column, generous line-height, numbered sections, sticky-ish
 * top bar so the user can always get back to the app.
 */
export function LegalLayout({ title, lastUpdated, children }) {
    return (
        <div className="min-h-screen w-full bg-[#0a0713]">
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-24 left-1/3 h-[420px] w-[420px] rounded-full bg-violet-600/10 blur-[130px]" />
                <div className="absolute bottom-[-10%] right-[-5%] h-[360px] w-[360px] rounded-full bg-amber-400/10 blur-[120px]" />
            </div>

            <header className="relative z-10 border-b border-white/[0.06] bg-[#0a0713]/80 backdrop-blur-xl">
                <div className="mx-auto max-w-3xl px-5 py-4 flex items-center justify-between">
                    <Link to="/register" className="flex items-center gap-2 text-white/60 hover:text-white text-[12.5px] font-semibold transition-colors duration-150">
                        <ArrowLeft size={15} /> Back
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-amber-400 via-fuchsia-500 to-violet-600">
                            <Flame size={13} className="text-white" strokeWidth={2.5} />
                        </span>
                        <span className="text-white font-black text-[13px] tracking-tight">CareerForge AI</span>
                    </div>
                </div>
            </header>

            <main className="relative z-10 mx-auto max-w-3xl px-5 py-10 md:py-14">
                <p className="text-[10.5px] font-black uppercase tracking-widest text-fuchsia-300/80 mb-3">Legal</p>
                <h1 className="text-[28px] md:text-[34px] font-black text-white tracking-tight leading-tight">{title}</h1>
                <p className="text-white/40 text-[12.5px] mt-2 mb-10">Last updated: {lastUpdated}</p>

                <div className="space-y-9 text-slate-300 text-[13.5px] leading-7">
                    {children}
                </div>

                <div className="mt-14 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                    <p className="text-white/50 text-[12px] leading-6">
                        This document is a template provided for convenience and does not constitute legal advice.
                        Replace the placeholders below with your registered company details and have it reviewed
                        by a qualified lawyer before relying on it for compliance purposes.
                    </p>
                </div>
            </main>
        </div>
    );
}

export function Section({ number, title, children }) {
    return (
        <section>
            <h2 className="flex items-baseline gap-2.5 text-white font-black text-[16px] tracking-tight mb-2.5">
                <span className="text-fuchsia-300/70 text-[13px] font-bold">{number}</span>
                {title}
            </h2>
            <div className="space-y-3">{children}</div>
        </section>
    );
}