import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Bot,
  Braces,
  Brain,
  ChevronDown,
  Cpu,
  Eye,
  Image,
  Loader2,
  MessageSquareText,
  PlayCircle,
  Rocket,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  WandSparkles,
  Workflow,
  Zap,
} from "lucide-react";
import BrandLogo from "../../shared/BrandLogo";
import { getPlans } from "../../services/planService";

// Each feature is tagged with an accent so the grid reads as "one platform,
// four capability tracks" (chat, code, visual, career-docs) instead of a
// flat list of bullet points.
const ACCENTS = {
  chat: { grad: "from-cyan-400 to-blue-600", text: "text-cyan-300", ring: "ring-cyan-400/30" },
  code: { grad: "from-violet-400 to-fuchsia-600", text: "text-violet-300", ring: "ring-violet-400/30" },
  visual: { grad: "from-orange-400 to-amber-500", text: "text-orange-300", ring: "ring-orange-400/30" },
  career: { grad: "from-emerald-400 to-teal-600", text: "text-emerald-300", ring: "ring-emerald-400/30" },
};

const features = [
  { icon: MessageSquareText, title: "AI Career Chat", text: "Ask about resumes, interviews, DSA, or job strategy and get grounded answers in real time.", tone: "chat" },
  { icon: Braces, title: "AI Coding Assistant", text: "Debug, refactor, or generate code with a model tuned for real engineering problems.", tone: "code" },
  { icon: Eye, title: "Live Artifact Preview", text: "Code the AI writes opens in a side panel with an instant live preview — no copy-pasting.", tone: "code" },
  { icon: Brain, title: "Multiple AI Models", text: "Switch between chat, reasoning, coding, and vision models depending on the task.", tone: "chat" },
  { icon: WandSparkles, title: "Resume Builder", text: "Generate ATS-ready summaries, skills, and project bullet points in seconds.", tone: "career" },
  { icon: ScanSearch, title: "ATS Optimization", text: "Improve keyword matching, structure, and role alignment before you apply.", tone: "career" },
  { icon: Image, title: "AI Image Tools", text: "Generate creative or professional visuals straight from a prompt.", tone: "visual" },
  { icon: ShieldCheck, title: "Secure by Design", text: "JWT auth, OTP verification, wallet ledgering, and Razorpay-backed payments.", tone: "career" },
];

const models = ["Llama 3.3 70B", "DeepSeek R1", "Vision Models", "OpenRouter", "Gemini Image", "Coding Models", "Resume AI", "PDF AI"];

const workflow = [
  "Create a free account",
  "Claim 100 credits instantly",
  "Pick chat, code, resume, image, or PDF tools",
  "Choose the best-fit AI model for the task",
  "Generate, preview, and pick up again from your dashboard",
];

const fallbackPlans = [
  { id: "free", name: "Starter", price: 0, tokens: 100, description: "Free credits for testing AI chat, coding, and resume tools." },
  { id: "pro", name: "Career Pro", price: 299, tokens: 15000, description: "Best for resume building, ATS, coding help, and interview prep." },
  { id: "max", name: "Offer Mode", price: 799, tokens: 50000, description: "For heavy AI usage across documents, images, and advanced tools." },
];

const faqs = [
  ["Do I get free credits after signup?", "Yes — every new account receives 100 free credits instantly, no card required."],
  ["Can I use it for coding help?", "Yes. There's a dedicated coding model, and any code it writes opens in a live artifact preview."],
  ["Can I switch between AI models?", "Yes — chat, reasoning, coding, vision, and image models are all available from the same workspace."],
  ["Is this only a resume tool?", "No — it's a full AI career workspace covering chat, coding, resumes, ATS, and images in one place."],
];

function GlowPanel({ children, className = "", accent }) {
  return (
    <div
      className={`rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)] ${
        accent ? `ring-1 ${ACCENTS[accent].ring}` : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

function SectionTitle({ badge, title, text, accent = "text-cyan-300" }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className={`text-sm font-black uppercase tracking-[0.28em] ${accent}`}>{badge}</p>
      <h2 className="mt-4 text-4xl font-black leading-tight text-white md:text-6xl">{title}</h2>
      <p className="mt-5 text-base leading-8 text-slate-300 md:text-lg">{text}</p>
    </div>
  );
}

// Signature element: a split "workspace" mockup — chat on the left, a code
// tab with a live preview on the right — mirroring the artifact-panel
// experience the product actually delivers, instead of a generic chat bubble.
function WorkspaceMockup() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-r from-cyan-400 via-violet-500 to-orange-400 opacity-25 blur-2xl" />

      <div className="relative overflow-hidden rounded-[1.75rem] border border-white/15 bg-[#0b0a16] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-fuchsia-500">
              <Bot size={20} />
            </div>
            <div>
              <p className="text-sm font-black text-white">CareerForge AI</p>
              <p className="text-xs font-bold text-cyan-300">chat + code + live preview</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black text-emerald-300">Online</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="space-y-3 border-b border-white/10 p-4 sm:border-b-0 sm:border-r">
            <p className="px-1 text-[11px] font-black uppercase tracking-wider text-slate-500">Chat</p>
            <div className="ml-auto max-w-[92%] rounded-2xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-3.5 py-2.5 text-[13px] font-semibold text-white">
              Build a countdown timer component in React.
            </div>
            <div className="max-w-[95%] rounded-2xl bg-white/10 px-3.5 py-2.5 text-[13px] leading-6 text-slate-200">
              Done — here's the component with a live preview on the right.
            </div>
            <div className="ml-auto max-w-[85%] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-3.5 py-2.5 text-[13px] font-semibold text-white">
              Add a reset button too.
            </div>
          </div>

          <div className="flex flex-col p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-black text-slate-300">
                <TerminalSquare size={13} /> Code
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-cyan-400 to-violet-500 px-2.5 py-1 text-[11px] font-black text-white">
                <PlayCircle size={13} /> Preview
              </span>
            </div>
            <div className="flex-1 rounded-xl bg-black/40 p-3 font-mono text-[11px] leading-5 text-slate-400">
              <p><span className="text-fuchsia-400">function</span> <span className="text-cyan-300">Countdown</span>() {"{"}</p>
              <p className="pl-3 text-slate-500">const [t, setT] = useState(60);</p>
              <p className="pl-3 text-slate-500">...</p>
              <p>{"}"}</p>
            </div>
            <div className="mt-3 grid place-items-center rounded-xl border border-dashed border-white/15 bg-white/5 py-4">
              <span className="text-2xl font-black text-white">00:59</span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">live preview</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlansSection() {
  const [plans, setPlans] = useState(fallbackPlans);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    // ✅ FIX — pehle getPlans() ka koi timeout nahi tha. Agar backend
    // slow/unreachable hota to request kabhi resolve/reject nahi hoti
    // thi, isliye "loading" hamesha true reh jaata tha aur poora page
    // "fas" gaya jaisa lagta (infinite spinner, koi fallback nahi).
    //
    // Ab 6 second ka hard timeout hai — usme response na aaye to
    // request abort ho jaati hai aur fallback plans turant dikha diye
    // jaate hain, page kabhi atakta nahi.
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    getPlans({ signal: controller.signal })
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data) ? data.filter((plan) => plan.active !== false) : [];
        setPlans(list.length ? list : fallbackPlans);
      })
      .catch(() => {
        if (!active) return;
        setErrored(true);
        setPlans(fallbackPlans);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  const visiblePlans = useMemo(() => plans.slice(0, 3), [plans]);
  const accentByIndex = ["from-cyan-400 to-blue-600", "from-orange-500 to-fuchsia-600", "from-emerald-400 to-teal-600"];

  return (
    <section id="pricing" className="px-5 py-24">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          badge="Credits & Plans"
          title="Start free, upgrade when you grow."
          text="Start with free credits, then pick a plan for AI chat, coding, resumes, images, and PDF tools."
        />

        {loading && (
          <div className="mt-8 flex justify-center">
            <Loader2 className="animate-spin text-white" />
          </div>
        )}

        {errored && !loading && (
          <p className="mt-6 text-center text-sm font-semibold text-orange-300">
            Live pricing is unreachable right now — showing standard plans.
          </p>
        )}

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {visiblePlans.map((plan, index) => (
            <div
              key={plan.id || plan.name}
              className={`relative rounded-[1.75rem] border p-7 transition-transform duration-150 hover:-translate-y-1 ${
                index === 1
                  ? "border-fuchsia-400/60 bg-gradient-to-b from-[#161029] to-[#0d0a19] shadow-[0_25px_70px_-30px_rgba(217,70,239,0.5)]"
                  : "border-white/10 bg-white/[0.06]"
              }`}
            >
              {index === 1 && (
                <span className="absolute -top-3 left-7 inline-flex rounded-full bg-gradient-to-r from-orange-500 to-fuchsia-600 px-4 py-1 text-xs font-black uppercase text-white">
                  Most Popular
                </span>
              )}

              <h3 className="text-2xl font-black text-white">{plan.name}</h3>

              <div className="mt-5 flex items-end gap-2">
                <span className={`bg-gradient-to-r ${accentByIndex[index % 3]} bg-clip-text text-5xl font-black text-transparent`}>
                  ₹{plan.price ?? 0}
                </span>
                <span className="mb-2 text-sm text-slate-400">one-time</span>
              </div>

              <p className="mt-5 min-h-20 text-sm leading-7 text-slate-300">{plan.description}</p>

              <div className="mt-6 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-yellow-300">
                {(plan.tokens || 0).toLocaleString()} credits included
              </div>

              <Link
                to={`/wallet${plan.id ? `?plan=${plan.id}` : ""}`}
                className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white transition-transform duration-150 hover:-translate-y-0.5 bg-gradient-to-r ${accentByIndex[index % 3]}`}
              >
                Choose plan <ArrowRight size={18} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <main className="min-h-screen overflow-hidden bg-[#05040c] text-white">
      <section className="relative px-5 pb-24 pt-20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.30),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(167,139,250,0.30),transparent_32%),radial-gradient(circle_at_50%_85%,rgba(249,115,22,0.22),transparent_35%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:52px_52px] opacity-20" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-cyan-100">
              <Sparkles size={18} className="text-yellow-300" />
              Chat • Code • Live Preview • Resume • ATS • Image
            </div>

            <h1 className="max-w-5xl text-5xl font-black leading-[1.02] md:text-7xl xl:text-8xl">
              Build your career with{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-orange-200 bg-clip-text text-transparent">
                powerful AI.
              </span>
            </h1>

            <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-300 md:text-xl md:leading-9">
              CareerForge AI is a full AI workspace: chat for career and coding help, an artifact
              panel that renders a live preview of any code it writes, an ATS-ready resume builder,
              and image generation — all in one place.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-3 rounded-3xl bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-600 px-8 py-5 text-base font-black text-white shadow-[0_20px_60px_rgba(56,189,248,0.25)] transition-transform duration-150 hover:-translate-y-1"
              >
                Start Free with 100 Credits <Rocket size={22} />
              </Link>

              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-3 rounded-3xl border border-white/15 bg-white/10 px-8 py-5 text-base font-black text-white transition-colors duration-150 hover:bg-white/15"
              >
                Login to Dashboard <ArrowRight size={22} />
              </Link>
            </div>

            <div className="mt-10 grid max-w-3xl grid-cols-2 gap-4 md:grid-cols-4">
              {[
                ["100", "Free Credits"],
                ["8+", "AI Tools"],
                ["Multi", "AI Models"],
                ["Live", "Code Preview"],
              ].map(([num, label]) => (
                <div key={label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
                  <p className="text-3xl font-black text-white">{num}</p>
                  <p className="mt-1 text-sm font-bold text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <WorkspaceMockup />
        </div>
      </section>

      <section id="features" className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            badge="Features"
            title="One colorful AI platform for every career task."
            text="Chat, coding, live previews, resumes, ATS, images, and a secure wallet — all in one clean workspace."
          />

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, text, tone }) => (
              <GlowPanel key={title} accent={tone} className="transition-transform duration-150 hover:-translate-y-1">
                <div className={`mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${ACCENTS[tone].grad}`}>
                  <Icon size={26} />
                </div>
                <h3 className="text-xl font-black text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{text}</p>
              </GlowPanel>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2">
            <GlowPanel className="p-8">
              <Workflow className="text-cyan-300" size={40} />
              <h2 className="mt-5 text-4xl font-black text-white md:text-5xl">A simple user journey</h2>

              <div className="mt-8 space-y-4">
                {workflow.map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-violet-500 text-sm font-black text-white">
                      {index + 1}
                    </div>
                    <p className="pt-2 font-bold text-slate-100">{step}</p>
                  </div>
                ))}
              </div>
            </GlowPanel>

            <GlowPanel className="p-8">
              <Cpu className="text-orange-300" size={40} />
              <h2 className="mt-5 text-4xl font-black text-white md:text-5xl">Multiple AI models</h2>
              <p className="mt-5 text-base leading-8 text-slate-300">
                Pick a fast model, a deep reasoning model, a coding model, or a vision model — whatever the task needs.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {models.map((model) => (
                  <span key={model} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-black text-white">
                    {model}
                  </span>
                ))}
              </div>
            </GlowPanel>
          </div>
        </div>
      </section>

      <PlansSection />

      <section id="docs" className="px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            badge="Documentation"
            title="Clear docs for users and developers."
            text="Everything from signup and credits to architecture and deployment, written down properly."
          />

          <div className="mt-14 grid gap-8 md:grid-cols-2">
            {[
              [BookOpenCheck, "User Documentation", "Signup, login, credits, AI chat, resume tools, wallet, and payments.", "/docs/user", "from-cyan-400 to-blue-500"],
              [TerminalSquare, "Developer Documentation", "Architecture, Docker, AWS, Elastic Beanstalk, CI/CD, and environment setup.", "/docs/developer", "from-violet-400 to-fuchsia-500"],
            ].map(([Icon, title, text, link, grad]) => (
              <Link
                key={title}
                to={link}
                className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-8 transition-transform duration-150 hover:-translate-y-1"
              >
                <div className={`grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br ${grad}`}>
                  <Icon size={30} />
                </div>
                <h3 className="mt-6 text-3xl font-black text-white">{title}</h3>
                <p className="mt-4 text-base leading-8 text-slate-300">{text}</p>
                <span className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-black text-slate-950">
                  Open docs <ArrowRight size={18} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-24">
        <div className="mx-auto max-w-5xl">
          <SectionTitle
            badge="FAQ"
            title="Questions before you start."
            text="The things people usually want to know first."
          />

          <div className="mt-12 rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-6">
            {faqs.map(([q, a], index) => (
              <div key={q} className="border-b border-white/10 py-5 last:border-0">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span className="text-lg font-black text-white">{q}</span>
                  <ChevronDown className={`shrink-0 text-slate-400 transition-transform duration-150 ${openFaq === index ? "rotate-180" : ""}`} />
                </button>

                {openFaq === index && <p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">{a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-24">
        <div className="mx-auto max-w-7xl rounded-[1.75rem] border border-white/10 bg-gradient-to-r from-cyan-500 via-violet-600 to-orange-500 p-10 text-center shadow-2xl md:p-16">
          <Zap className="mx-auto text-yellow-200" size={50} />
          <h2 className="mt-6 text-4xl font-black text-white md:text-7xl">Start your AI career workspace today.</h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/90">
            Create an account, claim 100 free credits, and start using the AI tools right away.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-3 rounded-3xl bg-white px-8 py-5 text-base font-black text-slate-950 transition-transform duration-150 hover:-translate-y-1"
            >
              Claim 100 free credits <ArrowRight size={22} />
            </Link>

            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-3 rounded-3xl border border-white/30 bg-white/10 px-8 py-5 text-base font-black text-white"
            >
              Login to dashboard
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <BrandLogo />
          <p className="text-sm text-slate-400">CareerForge AI — your colorful AI career workspace.</p>
          <div className="flex flex-wrap gap-5 text-sm font-bold text-slate-300">
            <a href="#features">Features</a>
            <a href="#workflow">Workflow</a>
            <a href="#pricing">Plans</a>
            <a href="#docs">Docs</a>
          </div>
        </div>
      </footer>
    </main>
  );
}