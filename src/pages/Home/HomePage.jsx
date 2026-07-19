import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronDown,
  FileSearch,
  FileText,
  Image as ImageIcon,
  MessageSquareText,
  Mic2,
  Rocket,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  Zap,
} from "lucide-react";

import BrandLogo from "../../shared/BrandLogo";
import { getPlans } from "../../services/planService";

const fallbackPlans = [
  { id: "starter", name: "Starter", price: 0, tokens: 100, description: "Explore the core career workspace." },
  { id: "career-pro", name: "Career Pro", price: 299, tokens: 15000, description: "Resume, interview, chat, and job-search usage." },
  { id: "offer-mode", name: "Offer Mode", price: 799, tokens: 50000, description: "Higher-volume preparation across every AI workspace." },
];

const workspaces = [
  {
    id: "chat",
    eyebrow: "Career Chat",
    title: "A conversation that keeps the same context tomorrow.",
    description: "Streamed answers, durable conversation memory, model choice, voice input, and a dedicated artifact panel for code and documents.",
    image: "/features/chat.png",
    alt: "CareerForge AI career chat workspace",
    icon: MessageSquareText,
    color: "text-cyan-300",
    bar: "bg-cyan-400",
    route: "/chat",
    points: ["PostgreSQL-backed history after Redis expiry", "Live code and document artifacts", "Compact mobile composer"],
  },
  {
    id: "resume",
    eyebrow: "Resume Studio",
    title: "Analyze, improve, match, and download an ATS resume.",
    description: "Upload a resume, review ATS gaps, compare it with a job description, continue with a bilingual coach, and generate a downloadable result.",
    image: "/features/resume.png",
    alt: "CareerForge AI resume analysis workspace",
    icon: FileSearch,
    color: "text-emerald-300",
    bar: "bg-emerald-400",
    route: "/resume?new=1",
    points: ["PDF, DOCX, image, and pasted text intake", "ATS and job-match scoring", "Generated PDF download"],
  },
  {
    id: "interview",
    eyebrow: "Interview Room",
    title: "Practice against your role, resume, and real job brief.",
    description: "Choose written or live practice, attach a resume, upload a PDF or image job description, and receive evidence-based scoring and follow-ups.",
    image: "/features/interview.png",
    alt: "CareerForge AI interview practice setup",
    icon: Mic2,
    color: "text-amber-300",
    bar: "bg-amber-300",
    route: "/interview",
    points: ["English, Hindi, and automatic language matching", "Audio-reactive human interviewer", "PDF and image job-description extraction"],
  },
  {
    id: "image",
    eyebrow: "Image Studio",
    title: "Create a new visual or transform an existing image.",
    description: "Pick a configured model, write or speak a prompt, use image-to-image editing, and manage every result from searchable history.",
    image: "/features/image-studio.png",
    alt: "CareerForge AI image generation workspace",
    icon: ImageIcon,
    color: "text-rose-300",
    bar: "bg-rose-400",
    route: "/image-generator?new=1",
    points: ["Text-to-image and image-to-image", "Favorites, regeneration, and download", "Provider-safe server-side keys"],
  },
  {
    id: "jobs",
    eyebrow: "Live Jobs",
    title: "Move from preparation to current opportunities.",
    description: "Search current roles with focused filters and apply links, then return to the same career workspace for resume and interview preparation.",
    image: "/features/jobs.png",
    alt: "CareerForge AI live job search workspace",
    icon: BriefcaseBusiness,
    color: "text-blue-300",
    bar: "bg-blue-400",
    route: "/jobs",
    points: ["Current job-provider results", "Role and location filters", "Direct apply workflow"],
  },
];

const faq = [
  ["Does every new account receive free credits?", "Yes. A verified new user starts with 100 credits, and paid plans or eligible promo rewards add more."],
  ["What happens when credits reach zero?", "The same recharge panel opens from chat, resume, interview, image, and other paid AI actions. You can apply a promo before choosing a plan."],
  ["Will old chats still remember context?", "The database remains the source of truth. If the Redis memory cache expires, bounded conversation history is rebuilt before the next model request."],
  ["Can interview practice use a real job description?", "Yes. Paste it directly or upload a PDF, PNG, JPG, or WebP file from the interview setup."],
];

function SectionHeading({ eyebrow, title, text }) {
  return (
    <div className="max-w-3xl">
      <p className="m-0 text-xs font-black uppercase text-cyan-300">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">{title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">{text}</p>
    </div>
  );
}

function ProductBand({ workspace, index }) {
  const Icon = workspace.icon;
  const mediaFirst = index % 2 === 0;
  return (
    <article className="border-t border-white/10 py-10 sm:py-14 lg:py-16">
      <div className="mx-auto grid max-w-[1220px] items-center gap-7 px-4 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,.92fr)] lg:gap-12 lg:px-8">
        <figure className={`${mediaFirst ? "lg:order-1" : "lg:order-2"} m-0 min-w-0 overflow-hidden rounded-lg border border-white/15 bg-[#070b12] shadow-[0_24px_70px_rgba(0,0,0,.34)]`}>
          <div className={`h-1.5 w-full ${workspace.bar}`} />
          <img src={workspace.image} alt={workspace.alt} loading={index < 2 ? "eager" : "lazy"} className="block aspect-[16/10] h-auto w-full object-cover object-top" />
        </figure>

        <div className={mediaFirst ? "lg:order-2" : "lg:order-1"}>
          <div className={`inline-flex items-center gap-2 text-xs font-black uppercase ${workspace.color}`}>
            <Icon size={16} /> {workspace.eyebrow}
          </div>
          <h3 className="mt-3 text-2xl font-black leading-tight text-white sm:text-3xl">{workspace.title}</h3>
          <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">{workspace.description}</p>
          <ul className="mt-5 grid gap-2.5">
            {workspace.points.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-slate-300">
                <CheckCircle2 size={16} className={`mt-0.5 shrink-0 ${workspace.color}`} />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <Link to={workspace.route} className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-4 text-sm font-black text-white hover:border-cyan-300/50 hover:bg-white/10">
            Open {workspace.eyebrow} <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

function PlansSection() {
  const [plans, setPlans] = useState(fallbackPlans);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    getPlans({ signal: controller.signal })
      .then((items) => {
        if (!active) return;
        const available = Array.isArray(items) ? items.filter((item) => item.active !== false) : [];
        setPlans(available.length ? available.slice(0, 3) : fallbackPlans);
      })
      .catch(() => {
        if (active) {
          setPlans(fallbackPlans);
          setUsingFallback(true);
        }
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, []);

  const visiblePlans = useMemo(() => plans.slice(0, 3), [plans]);
  return (
    <section id="pricing" className="border-y border-white/10 bg-[#0b111b] py-16 sm:py-20">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Credits" title="Start free. Recharge only when you need more." text="One wallet works across every AI workspace, and promo eligibility is verified by the backend." />
        {usingFallback && <p className="mt-4 text-xs text-amber-300">Live pricing is temporarily unavailable. Standard plan examples are shown.</p>}
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {loading ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-lg border border-white/10 bg-white/[0.04]" />) : visiblePlans.map((plan, index) => (
            <article key={plan.id || plan.name} className="relative rounded-lg border border-white/10 bg-[#080d15] p-5">
              <span className={`absolute left-0 top-0 h-1 w-full ${index === 0 ? "bg-cyan-400" : index === 1 ? "bg-amber-300" : "bg-emerald-400"}`} />
              <h3 className="text-lg font-black text-white">{plan.name}</h3>
              <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{plan.description}</p>
              <p className="mt-5 text-3xl font-black text-white">{Number(plan.price || 0) === 0 ? "Free" : <>{"\u20B9"}{Number(plan.price).toLocaleString()}</>}</p>
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-300"><Zap size={13} /> {Number(plan.tokens || 0).toLocaleString()} credits</p>
              <Link to={Number(plan.price || 0) === 0 ? "/register" : `/login?next=${encodeURIComponent(`/wallet?plan=${plan.id}`)}`} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-slate-950">
                {Number(plan.price || 0) === 0 ? "Create free account" : "Choose after login"} <ArrowRight size={15} />
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#060a12] text-white">
      <section className="relative flex min-h-[calc(100svh-88px)] max-h-[880px] items-end overflow-hidden border-b border-white/10">
        <img src="/images/career-hero-v2.png" alt="Professional preparing for a career interview" className="absolute inset-0 h-full w-full object-cover object-[64%_center] sm:object-center" />
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040913] via-[#040913e8] to-transparent" />
        <div className="relative mx-auto w-full max-w-[1320px] px-4 pb-14 pt-28 sm:px-6 sm:pb-20 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-300/30 bg-black/40 px-3 py-2 text-xs font-black text-cyan-200 backdrop-blur">
              <Sparkles size={15} /> AI career operating system
            </div>
            <h1 className="mt-5 text-[42px] font-black leading-none text-white sm:text-6xl lg:text-[80px]">CareerForge AI</h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-200 sm:text-lg">
              Prepare, create, practice, and apply from one connected workspace with durable chat memory, ATS resume tools, live interviews, image creation, current jobs, and a shared credit wallet.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link to="/register" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cyan-400 px-6 text-sm font-black text-[#031318] hover:bg-cyan-300">
                Start with 100 free credits <Rocket size={18} />
              </Link>
              <a href="#features" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-white/25 bg-black/35 px-6 text-sm font-black text-white backdrop-blur hover:bg-black/55">
                Explore workspaces <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0b111b]">
        <div className="mx-auto grid max-w-[1220px] grid-cols-2 border-x border-white/10 sm:grid-cols-4">
          {[["100", "Free starting credits"], ["5", "Connected AI workspaces"], ["1", "Shared secure wallet"], ["24/7", "History and access"]].map(([value, label], index) => (
            <div key={label} className={`px-4 py-5 ${index < 3 ? "border-r border-white/10" : ""} ${index < 2 ? "max-sm:border-b" : ""}`}>
              <strong className="block text-2xl font-black text-white">{value}</strong>
              <span className="mt-1 block text-xs text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="px-4 pb-6 pt-16 sm:px-6 sm:pt-20 lg:px-8">
        <div className="mx-auto max-w-[1220px]">
          <SectionHeading eyebrow="Product workspaces" title="Everything new is visible before you sign in." text="These are verified screens from the running product, not generic illustrations." />
        </div>
      </section>

      {workspaces.map((workspace, index) => <ProductBand key={workspace.id} workspace={workspace} index={index} />)}

      <section className="border-t border-white/10 bg-[#0a0f18] py-16 sm:py-20">
        <div className="mx-auto max-w-[1180px] px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="One connected system" title="The supporting features are part of the same workflow." text="No separate account, disconnected history, or different payment flow for each tool." />
          <div className="mt-9 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [FileText, "Cover Letter Studio", "Resume-grounded letters with editable PDF and DOCX export.", "text-emerald-300"],
              [WandSparkles, "Artifact Preview", "Code and long documents open in a focused side panel.", "text-cyan-300"],
              [ShieldCheck, "Secure Sessions", "In-memory access tokens and HttpOnly refresh cookies.", "text-blue-300"],
              [BadgeCheck, "Promo and Wallet", "One recharge flow with backend-verified rewards.", "text-amber-300"],
            ].map(([Icon, title, text, color]) => (
              <article key={title} className="bg-[#080d15] p-5">
                <Icon size={22} className={color} />
                <h3 className="mt-4 text-base font-black text-white">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <PlansSection />

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-[940px] px-4 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="FAQ" title="Know the flow before you begin." text="Clear answers about credits, memory, and the new interview document flow." />
          <div className="mt-8 border-t border-white/10">
            {faq.map(([question, answer], index) => (
              <div key={question} className="border-b border-white/10 py-1">
                <button type="button" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} className="flex min-h-16 w-full items-center justify-between gap-4 py-3 text-left text-sm font-black text-white sm:text-base">
                  <span>{question}</span>
                  <ChevronDown size={18} className={`shrink-0 text-slate-500 transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
                </button>
                {openFaq === index && <p className="mb-5 max-w-3xl text-sm leading-7 text-slate-400">{answer}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-white/10 bg-cyan-400 py-12 text-[#031318]">
        <div className="mx-auto flex max-w-[1180px] flex-col items-start justify-between gap-6 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase">Ready when you are</p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">Build your next career move in CareerForge AI.</h2>
          </div>
          <Link to="/register" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-lg bg-[#06101a] px-6 text-sm font-black text-white">
            Create free account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="bg-[#050810] py-10">
        <div className="mx-auto flex max-w-[1180px] flex-col gap-5 px-4 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <BrandLogo />
          <p className="m-0 text-xs text-slate-500">Career chat, resumes, interviews, images, jobs, and secure credits in one workspace.</p>
          <div className="flex gap-5 text-xs font-bold text-slate-400">
            <a href="#features">Features</a>
            <a href="#pricing">Plans</a>
            <Link to="/login">Login</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}