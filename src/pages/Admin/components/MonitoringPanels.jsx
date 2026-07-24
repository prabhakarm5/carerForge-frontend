import { memo, useEffect, useRef, useState } from "react";
import { Activity, ArrowDown, ArrowUp, CircleGauge, Clock3, Cpu, Gauge, Radio, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, formatBytes, formatUptime, MetricList, RequestTable, SectionHeader } from "./AdminUi";
import axiosInstance from "../../../utils/axiosInstance";
import { API } from "../../../config/api";

// How often we poll for fresh numbers. 2s = near real-time without hammering the API.
const DEFAULT_INTERVAL_MS = 2000;
const PULSE_DURATION_MS = 650;
const MAX_BACKOFF_MS = 20000;

// ⚠️ Confirm this path matches your actual route (pattern seen elsewhere in
// this app is API.<DOMAIN>.<ACTION>, e.g. API.PLANS.GET_ALL). If your admin
// overview endpoint is named differently, this is the only line to change —
// everything below (polling, gauges, deltas) works off whatever it returns.
const fetchOverview = () => axiosInstance.get(API.ADMIN.OVERVIEW).then((res) => res.data);

/** Full, exact number — 12,483 stays 12,483, never rounds to "12k". */
function formatExact(value) {
  return Number(value || 0).toLocaleString();
}

const TONE = {
  cyan: { text: "text-cyan-300", bg: "bg-cyan-400/10", ring: "ring-cyan-400/60", hex: "#22d3ee" },
  violet: { text: "text-violet-300", bg: "bg-violet-400/10", ring: "ring-violet-400/60", hex: "#a78bfa" },
  amber: { text: "text-amber-300", bg: "bg-amber-400/10", ring: "ring-amber-400/60", hex: "#fbbf24" },
  rose: { text: "text-rose-300", bg: "bg-rose-400/10", ring: "ring-rose-400/60", hex: "#fb7185" },
  emerald: { text: "text-emerald-300", bg: "bg-emerald-400/10", ring: "ring-emerald-400/60", hex: "#34d399" },
};

/**
 * Polls `fetcher` on an interval, tracks the previous snapshot (so we can
 * compute live deltas like "+42 requests since last update"), and backs
 * off automatically on repeated failures instead of hammering a dead route.
 * Falls back to the `initialOverview` prop for the very first paint so
 * there's no loading flash.
 */
function useLiveOverview(initialOverview, customFetcher, intervalMs) {
  const fetcher = customFetcher || fetchOverview;
  const [data, setData] = useState(initialOverview);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const [connectionState, setConnectionState] = useState("live"); // "live" | "retrying"
  const [pulse, setPulse] = useState(false);
  const previousRef = useRef(null);
  const pulseTimer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId;
    let failCount = 0;

    const schedule = (delay) => { timeoutId = setTimeout(tick, delay); };

    const tick = async () => {
      if (cancelled) return;
      if (document.hidden) { schedule(intervalMs); return; }
      try {
        const fresh = await fetcher();
        if (cancelled || !fresh) return;
        failCount = 0;
        setData((prev) => { previousRef.current = prev; return fresh; });
        setLastUpdated(Date.now());
        setConnectionState("live");
        setPulse(true);
        clearTimeout(pulseTimer.current);
        pulseTimer.current = setTimeout(() => setPulse(false), PULSE_DURATION_MS);
        schedule(intervalMs);
      } catch {
        if (cancelled) return;
        failCount += 1;
        setConnectionState("retrying");
        schedule(Math.min(intervalMs * 2 ** failCount, MAX_BACKOFF_MS));
      }
    };

    schedule(intervalMs);
    const onVisibilityChange = () => { if (!document.hidden) { clearTimeout(timeoutId); tick(); } };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      clearTimeout(pulseTimer.current);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [fetcher, intervalMs]);

  return { data, previous: previousRef.current, lastUpdated, connectionState, pulse };
}

/** Ticks its own "Xs ago" label every second without re-rendering the whole panel. */
const LiveBadge = memo(function LiveBadge({ lastUpdated, connectionState }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const retrying = connectionState === "retrying";
  const seconds = Math.max(0, Math.round((Date.now() - lastUpdated) / 1000));
  const label = retrying ? "Reconnecting" : seconds < 2 ? "Updated just now" : `Updated ${seconds}s ago`;

  return (
    <div className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-bold ${retrying ? "border-amber-400/30 bg-amber-400/[0.07] text-amber-300" : "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300"}`}>
      <Radio size={11} className="shrink-0" />
      <span className="relative flex h-1.5 w-1.5">
        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none ${retrying ? "bg-amber-400" : "bg-emerald-400"}`} />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${retrying ? "bg-amber-400" : "bg-emerald-500"}`} />
      </span>
      <span>{retrying ? "Reconnecting" : "Live"}</span>
      <span className="opacity-40" aria-hidden="true">·</span>
      <span className="font-mono font-semibold tabular-nums opacity-80">{label}</span>
    </div>
  );
});

/** Animated ring gauge — the stroke smoothly eases to the new % every time `value` changes. */
function RadialGauge({ value, tone = "cyan", size = 44, stroke = 4.5 }) {
  const t = TONE[tone] || TONE.cyan;
  const clamped = Math.min(100, Math.max(0, Number(value) || 0));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={t.hex} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[10px] font-bold tabular-nums text-white">{Math.round(clamped)}%</span>
      </div>
    </div>
  );
}

/** Small up/down pill showing exactly how much a number moved since the last poll. */
function TrendPill({ current, previous }) {
  if (previous == null) return null;
  const delta = current - previous;
  if (delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${up ? "bg-emerald-400/10 text-emerald-300" : "bg-rose-400/10 text-rose-300"}`}>
      {up ? <ArrowUp size={9} /> : <ArrowDown size={9} />}{formatExact(Math.abs(delta))}
    </span>
  );
}

function StatCard({ icon: Icon, tone = "cyan", label, value, hint, pulse, gaugeValue, trendCurrent, trendPrevious }) {
  const t = TONE[tone] || TONE.cyan;
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-3 ring-2 transition-shadow duration-500 sm:p-4 ${pulse ? t.ring : "ring-transparent"}`}>
      <div className="flex items-center justify-between gap-2">
        {gaugeValue != null
          ? <RadialGauge value={gaugeValue} tone={tone} />
          : <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${t.bg} ${t.text}`}><Icon size={15} /></span>}
        <TrendPill current={trendCurrent} previous={trendPrevious} />
      </div>
      <p className="mt-2.5 truncate text-[10px] font-medium text-slate-400 sm:mt-3 sm:text-[11px]">{label}</p>
      <p className="mt-0.5 truncate font-mono text-lg font-extrabold tabular-nums text-white sm:text-2xl">{value}</p>
      <p className="mt-1 truncate text-[9px] text-slate-500 sm:text-[10px]">{hint}</p>
    </div>
  );
}

const panelClass = "min-w-0 rounded-2xl border border-white/5 bg-[#0b0f1a] p-4 sm:p-5";
const pulseRing = (active) => `ring-2 transition-shadow duration-500 ${active ? "ring-cyan-400/60" : "ring-transparent"}`;

export function OverviewPanel({ overview, onRefresh, refreshInterval = DEFAULT_INTERVAL_MS }) {
  const { data, previous, lastUpdated, connectionState, pulse } = useLiveOverview(overview, onRefresh, refreshInterval);
  const heapPct = Math.min(100, data.system.usedHeapBytes * 100 / Math.max(1, data.system.maxHeapBytes));
  const requestDelta = previous ? data.traffic.requests - previous.traffic.requests : null;

  return <div className="flex flex-col gap-4 sm:gap-6">
    <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
      <SectionHeader title="Operations overview" description="Live application health, traffic and user signals from this server instance." />
      <LiveBadge lastUpdated={lastUpdated} connectionState={connectionState} />
    </div>

    <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      <StatCard icon={Users} tone="cyan" pulse={pulse}
        label="Total users" value={formatExact(data.users.total)} hint={`+${formatExact(data.users.joinedLastSevenDays)} this week`}
        trendCurrent={data.users.total} trendPrevious={previous?.users.total} />
      <StatCard icon={Activity} tone="violet" pulse={pulse}
        label="API requests" value={formatExact(data.traffic.requests)}
        hint={requestDelta ? `+${formatExact(requestDelta)} since last update` : `${formatExact(data.traffic.activeUsers)} active users`}
        trendCurrent={data.traffic.requests} trendPrevious={previous?.traffic.requests} />
      <StatCard icon={Clock3} tone={data.traffic.averageLatencyMs > 500 ? "rose" : "amber"} pulse={pulse}
        label="Average latency" value={`${data.traffic.averageLatencyMs} ms`} hint={`${data.traffic.errorRate}% error rate`}
        trendCurrent={data.traffic.averageLatencyMs} trendPrevious={previous?.traffic.averageLatencyMs} />
      <StatCard icon={Cpu} tone="rose" pulse={pulse} gaugeValue={data.system.processCpuPercent}
        label="Process CPU" value={`${data.system.processCpuPercent}%`} hint={`${formatExact(data.system.liveThreads)} live threads`} />
    </section>

    <section className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[1.7fr_1fr]">
      <div className={`${panelClass} flex flex-col ${pulseRing(pulse)}`}>
        <header className="mb-3.5 flex items-start justify-between gap-2.5 text-slate-500">
          <div><h3 className="m-0 text-sm font-semibold text-slate-50">Request volume</h3><p className="m-0 mt-0.5 text-[11px] text-slate-400">Hourly traffic over the retained monitoring window</p></div>
          <Gauge size={18} />
        </header>
        <div className="min-h-[170px] flex-1 sm:min-h-[190px] xl:min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%"><AreaChart data={data.requestTimeline}>
            <defs><linearGradient id="requestFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity=".42" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs>
            <CartesianGrid stroke="rgba(148,163,184,.11)" vertical={false} /><XAxis dataKey="label" stroke="#718096" tickLine={false} axisLine={false} fontSize={10} /><YAxis stroke="#718096" tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} width={28} />
            <Tooltip contentStyle={{ background: "#101827", border: "1px solid #263349", borderRadius: 6 }} /><Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} fill="url(#requestFill)" isAnimationActive={false} />
          </AreaChart></ResponsiveContainer>
        </div>
      </div>

      <div className={panelClass + " flex flex-col"}>
        <header className="mb-3.5 flex items-start justify-between gap-2.5 text-slate-500">
          <div><h3 className="m-0 text-sm font-semibold text-slate-50">Runtime health</h3><p className="m-0 mt-0.5 text-[11px] text-slate-400">Current JVM and host process</p></div>
          <CircleGauge size={18} />
        </header>

        <div className="mb-3.5 grid grid-cols-2 gap-2.5">
          <div className={`flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] py-3 transition-shadow duration-500 ${pulse ? "shadow-[0_0_0_1px_rgba(34,211,238,0.35)]" : ""}`}>
            <RadialGauge value={data.system.systemCpuPercent} tone="cyan" size={48} />
            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">System CPU</span>
          </div>
          <div className={`flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] py-3 transition-shadow duration-500 ${pulse ? "shadow-[0_0_0_1px_rgba(167,139,250,0.35)]" : ""}`}>
            <RadialGauge value={heapPct} tone="violet" size={48} />
            <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Heap used</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2">
            <span className="flex items-center gap-1.5 truncate text-[10px] text-slate-400"><Activity size={12} className="shrink-0 text-slate-500" />Page views</span>
            <strong className="truncate font-mono text-xs font-bold tabular-nums text-slate-50">{formatExact(data.traffic.pageViews)}</strong>
          </div>
          <div className="flex min-w-0 flex-col gap-1 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-2">
            <span className="flex items-center gap-1.5 truncate text-[10px] text-slate-400"><Clock3 size={12} className="shrink-0 text-slate-500" />Uptime</span>
            <strong className="truncate font-mono text-xs font-bold tabular-nums text-slate-50">{formatUptime(data.system.uptimeSeconds)}</strong>
          </div>
        </div>

        <p className="mt-auto pt-3 text-[10px] text-slate-500">{formatBytes(data.system.usedHeapBytes)} <span className="opacity-50">/</span> {formatBytes(data.system.maxHeapBytes)} heap</p>
      </div>
    </section>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <MetricList title="Top API endpoints" items={data.topEndpoints} color="cyan" />
      <MetricList title="Top product pages" items={data.topPages} color="violet" />
      <MetricList title="Traffic locations" items={data.countries} color="amber" />
    </section>

    <section className={panelClass}>
      <header className="mb-3.5 flex items-start justify-between gap-2.5 text-slate-500">
        <div><h3 className="m-0 text-sm font-semibold text-slate-50">Slow endpoint analysis</h3><p className="m-0 mt-0.5 text-[11px] text-slate-400">P95 stabilizes after about 20 requests; low-count rows are provisional</p></div>
        <Clock3 size={18} />
      </header>
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable]">
        <table className="w-full min-w-[560px] border-collapse text-xs">
          <thead>
            <tr>
              {["Endpoint", "Requests", "Average", "P95", "Maximum", "Errors"].map((h) => (
                <th key={h} className="sticky top-0 whitespace-nowrap border-b border-white/5 bg-[#0b0f1a] px-2.5 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.slowEndpoints || []).map((item) => (
              <tr key={item.path} className="hover:[&>td]:bg-white/[0.03]">
                <td className="max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-white/5 px-2.5 py-2 font-mono text-slate-200">{item.path}</td>
                <td className="whitespace-nowrap border-b border-white/5 px-2.5 py-2 font-mono tabular-nums text-slate-300">{formatExact(item.requests)}{item.requests < 20 && <small className="ml-1.5 inline-block whitespace-nowrap rounded-full bg-white/5 px-1.5 py-0.5 text-[8px] font-bold text-slate-400">Low sample</small>}</td>
                <td className="whitespace-nowrap border-b border-white/5 px-2.5 py-2 font-mono tabular-nums text-slate-300">{item.averageLatencyMs} ms</td>
                <td className={`whitespace-nowrap border-b border-white/5 px-2.5 py-2 font-mono tabular-nums ${item.p95LatencyMs > 750 ? "font-extrabold text-rose-400" : "text-slate-300"}`}>{item.p95LatencyMs} ms</td>
                <td className="whitespace-nowrap border-b border-white/5 px-2.5 py-2 font-mono tabular-nums text-slate-300">{item.maxLatencyMs} ms</td>
                <td className="whitespace-nowrap border-b border-white/5 px-2.5 py-2 font-mono tabular-nums text-slate-300">{formatExact(item.errors)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.slowEndpoints?.length && <EmptyState label="Not enough request data yet" />}
      </div>
    </section>
  </div>;
}

export function TrafficPanel({ overview, onRefresh, refreshInterval = DEFAULT_INTERVAL_MS }) {
  const { data, lastUpdated, connectionState, pulse } = useLiveOverview(overview, onRefresh, refreshInterval);
  const statusData = Object.entries(data.statusCodes || {}).map(([name, value]) => ({ name, value }));

  return <div className="flex flex-col gap-4 sm:gap-6">
    <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
      <SectionHeader title="Traffic explorer" description="Inspect status codes, proxy-resolved IP, location hints and client details." />
      <LiveBadge lastUpdated={lastUpdated} connectionState={connectionState} />
    </div>

    <section className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[1.7fr_1fr]">
      <div className={`${panelClass} flex flex-col ${pulseRing(pulse)}`}>
        <header className="mb-3.5 flex items-start justify-between gap-2.5 text-slate-500">
          <div><h3 className="m-0 text-sm font-semibold text-slate-50">HTTP outcomes</h3><p className="m-0 mt-0.5 text-[11px] text-slate-400">Success, redirect and failure groups</p></div>
          <Activity size={18} />
        </header>
        <div className="min-h-[170px] flex-1 sm:min-h-[190px] xl:min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={statusData}><CartesianGrid stroke="rgba(148,163,184,.11)" vertical={false} /><XAxis dataKey="name" stroke="#718096" tickLine={false} axisLine={false} /><YAxis stroke="#718096" tickLine={false} axisLine={false} allowDecimals={false} width={28} /><Tooltip contentStyle={{ background: "#101827", border: "1px solid #263349", borderRadius: 6 }} /><Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer>
        </div>
      </div>
      <MetricList title="Most requested endpoints" items={data.topEndpoints} color="cyan" />
    </section>

    <section className={panelClass}>
      <header className="mb-3.5 flex items-start justify-between gap-2.5 text-slate-500">
        <div><h3 className="m-0 text-sm font-semibold text-slate-50">Recent requests</h3><p className="m-0 mt-0.5 text-[11px] text-slate-400">Full IP is restricted to administrators</p></div>
        <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-slate-400">{formatExact(data.recentRequests.length)} events</span>
      </header>
      <RequestTable requests={data.recentRequests} detailed />
    </section>
  </div>;
}