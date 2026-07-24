import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Activity, CircleGauge, Clock3, Cpu, Gauge, MemoryStick, Radio, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, formatBytes, formatUptime, MetricCard, MetricList, RequestTable, SectionHeader } from "./AdminUi";

const DEFAULT_INTERVAL_MS = 3000;
const PULSE_DURATION_MS = 600;

/**
 * Always shows the FULL number — 1,204 stays 1,204, never gets rounded down
 * or abbreviated to "1.2k". With live polling, every request that comes in
 * should visibly move the counter, exactly like a stock ticker.
 */
function formatExact(value) {
  return Number(value || 0).toLocaleString();
}

/**
 * Keeps `data` fresh two ways:
 *  1. If the parent hands us an `onRefresh` fetcher, we poll it ourselves
 *     (stock-ticker style) — paused automatically when the tab is hidden
 *     so we don't burn requests in a background tab.
 *  2. If the parent re-fetches on its own and just passes a new `overview`
 *     prop, we pick that up too and still fire the same pulse feedback.
 */
function useLiveOverview(initialOverview, onRefresh, intervalMs) {
  const [data, setData] = useState(initialOverview);
  const [lastUpdated, setLastUpdated] = useState(() => Date.now());
  const [connectionState, setConnectionState] = useState("live"); // "live" | "retrying"
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef(null);

  const triggerPulse = useCallback(() => {
    setPulse(true);
    clearTimeout(pulseTimer.current);
    pulseTimer.current = setTimeout(() => setPulse(false), PULSE_DURATION_MS);
  }, []);

  // Parent-driven refresh: a new `overview` object arrived as a prop.
  useEffect(() => {
    if (onRefresh) return;
    setData(initialOverview);
    setLastUpdated(Date.now());
    triggerPulse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOverview, onRefresh]);

  // Self-driven refresh: we own the polling loop.
  useEffect(() => {
    if (!onRefresh) return undefined;
    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      try {
        const fresh = await onRefresh();
        if (cancelled || !fresh) return;
        setData(fresh);
        setLastUpdated(Date.now());
        setConnectionState("live");
        triggerPulse();
      } catch {
        if (!cancelled) setConnectionState("retrying");
      }
    };

    const id = setInterval(tick, intervalMs);
    const onVisibilityChange = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [onRefresh, intervalMs, triggerPulse]);

  useEffect(() => () => clearTimeout(pulseTimer.current), []);

  return { data, lastUpdated, isLive: Boolean(onRefresh), connectionState, pulse };
}

/** Ticks its own "Xs ago" label once a second without re-rendering the parent panel. */
const LiveBadge = memo(function LiveBadge({ lastUpdated, connectionState, isLive }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!isLive) return null;
  const seconds = Math.max(0, Math.round((Date.now() - lastUpdated) / 1000));
  const retrying = connectionState === "retrying";
  const timeLabel = retrying ? "Reconnecting" : seconds < 2 ? "Updated just now" : `Updated ${seconds}s ago`;

  return (
    <div
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1.5 text-[11px] font-bold ${
        retrying
          ? "border-amber-400/30 bg-amber-400/[0.07] text-amber-300"
          : "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-300"
      }`}
    >
      <Radio size={11} className="shrink-0" />
      <span className="relative flex h-1.5 w-1.5">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none ${
            retrying ? "bg-amber-400" : "bg-emerald-400"
          }`}
        />
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${retrying ? "bg-amber-400" : "bg-emerald-500"}`} />
      </span>
      <span>{retrying ? "Reconnecting" : "Live"}</span>
      <span className="opacity-40" aria-hidden="true">·</span>
      <span className="font-semibold opacity-80">{timeLabel}</span>
    </div>
  );
});

const panelClass = "min-w-0 rounded-xl border border-slate-500/10 bg-[#0e1420] p-4 sm:p-5";
const pulseRingClass = (active) =>
  `rounded-xl ring-2 transition-shadow duration-500 ${active ? "ring-cyan-400/60" : "ring-transparent"}`;

export function OverviewPanel({ overview, onRefresh, refreshInterval = DEFAULT_INTERVAL_MS }) {
  const { data, lastUpdated, isLive, connectionState, pulse } = useLiveOverview(overview, onRefresh, refreshInterval);
  const heap = Math.min(100, data.system.usedHeapBytes * 100 / Math.max(1, data.system.maxHeapBytes));

  return <div className="flex flex-col gap-4 sm:gap-5">
    <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
      <SectionHeader title="Operations overview" description="Live application health, traffic and user signals from this server instance." />
      <LiveBadge lastUpdated={lastUpdated} connectionState={connectionState} isLive={isLive} />
    </div>

    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className={pulseRingClass(pulse)}><MetricCard icon={Users} label="Total users" value={formatExact(data.users.total)} hint={`+${formatExact(data.users.joinedLastSevenDays)} joined this week`} tone="cyan" /></div>
      <div className={pulseRingClass(pulse)}><MetricCard icon={Activity} label="API requests" value={formatExact(data.traffic.requests)} hint={`${formatExact(data.traffic.activeUsers)} active users`} tone="violet" /></div>
      <div className={pulseRingClass(pulse)}><MetricCard icon={Clock3} label="Average latency" value={`${data.traffic.averageLatencyMs} ms`} hint={`${data.traffic.errorRate}% error rate`} tone={data.traffic.averageLatencyMs > 500 ? "rose" : "amber"} /></div>
      <div className={pulseRingClass(pulse)}><MetricCard icon={Cpu} label="Process CPU" value={`${data.system.processCpuPercent}%`} hint={`${formatExact(data.system.liveThreads)} live threads`} tone="rose" /></div>
    </section>

    <section className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[1.7fr_1fr]">
      <div className={`${panelClass} flex flex-col ${pulse ? "ring-2 ring-cyan-400/60" : "ring-2 ring-transparent"} transition-shadow duration-500`}>
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

      <div className={`${panelClass} flex flex-col`}>
        <header className="mb-3.5 flex items-start justify-between gap-2.5 text-slate-500">
          <div><h3 className="m-0 text-sm font-semibold text-slate-50">Runtime health</h3><p className="m-0 mt-0.5 text-[11px] text-slate-400">Current JVM and host process</p></div>
          <CircleGauge size={18} />
        </header>
        <div className="mb-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-500/10 bg-slate-500/[0.03] px-2.5 py-2"><MemoryStick size={16} className="shrink-0 text-slate-500" /><span className="flex-1 truncate text-[10px] text-slate-400">Heap used</span><strong className="shrink-0 text-xs font-extrabold text-slate-50">{formatBytes(data.system.usedHeapBytes)}</strong></div>
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-500/10 bg-slate-500/[0.03] px-2.5 py-2"><Cpu size={16} className="shrink-0 text-slate-500" /><span className="flex-1 truncate text-[10px] text-slate-400">System CPU</span><strong className="shrink-0 text-xs font-extrabold text-slate-50">{data.system.systemCpuPercent}%</strong></div>
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-500/10 bg-slate-500/[0.03] px-2.5 py-2"><Activity size={16} className="shrink-0 text-slate-500" /><span className="flex-1 truncate text-[10px] text-slate-400">Page views</span><strong className="shrink-0 text-xs font-extrabold text-slate-50">{formatExact(data.traffic.pageViews)}</strong></div>
          <div className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-500/10 bg-slate-500/[0.03] px-2.5 py-2"><Clock3 size={16} className="shrink-0 text-slate-500" /><span className="flex-1 truncate text-[10px] text-slate-400">Uptime</span><strong className="shrink-0 text-xs font-extrabold text-slate-50">{formatUptime(data.system.uptimeSeconds)}</strong></div>
        </div>
        <div className="relative mt-auto h-1.5 overflow-hidden rounded-full bg-slate-500/10"><span className="block h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-400 transition-[width] duration-700 ease-out" style={{ width: `${heap}%` }} /></div>
        <small className="mt-1.5 text-[10px] text-slate-500">{formatBytes(data.system.maxHeapBytes)} maximum heap</small>
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
              <th className="sticky top-0 whitespace-nowrap border-b border-slate-500/10 bg-[#0e1420] px-2.5 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Endpoint</th>
              <th className="sticky top-0 whitespace-nowrap border-b border-slate-500/10 bg-[#0e1420] px-2.5 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Requests</th>
              <th className="sticky top-0 whitespace-nowrap border-b border-slate-500/10 bg-[#0e1420] px-2.5 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Average</th>
              <th className="sticky top-0 whitespace-nowrap border-b border-slate-500/10 bg-[#0e1420] px-2.5 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">P95</th>
              <th className="sticky top-0 whitespace-nowrap border-b border-slate-500/10 bg-[#0e1420] px-2.5 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Maximum</th>
              <th className="sticky top-0 whitespace-nowrap border-b border-slate-500/10 bg-[#0e1420] px-2.5 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Errors</th>
            </tr>
          </thead>
          <tbody>
            {(data.slowEndpoints || []).map((item) => (
              <tr key={item.path} className="hover:[&>td]:bg-slate-500/5">
                <td className="max-w-[260px] overflow-hidden text-ellipsis whitespace-nowrap border-b border-slate-500/5 px-2.5 py-2 font-mono text-slate-200">{item.path}</td>
                <td className="whitespace-nowrap border-b border-slate-500/5 px-2.5 py-2 text-slate-300">{formatExact(item.requests)}{item.requests < 20 && <small className="ml-1.5 inline-block whitespace-nowrap rounded-full bg-slate-500/10 px-1.5 py-0.5 text-[8px] font-bold text-slate-400">Low sample</small>}</td>
                <td className="whitespace-nowrap border-b border-slate-500/5 px-2.5 py-2 text-slate-300">{item.averageLatencyMs} ms</td>
                <td className={`whitespace-nowrap border-b border-slate-500/5 px-2.5 py-2 ${item.p95LatencyMs > 750 ? "font-extrabold text-rose-400" : "text-slate-300"}`}>{item.p95LatencyMs} ms</td>
                <td className="whitespace-nowrap border-b border-slate-500/5 px-2.5 py-2 text-slate-300">{item.maxLatencyMs} ms</td>
                <td className="whitespace-nowrap border-b border-slate-500/5 px-2.5 py-2 text-slate-300">{formatExact(item.errors)}</td>
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
  const { data, lastUpdated, isLive, connectionState, pulse } = useLiveOverview(overview, onRefresh, refreshInterval);
  const statusData = Object.entries(data.statusCodes || {}).map(([name, value]) => ({ name, value }));

  return <div className="flex flex-col gap-4 sm:gap-5">
    <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
      <SectionHeader title="Traffic explorer" description="Inspect status codes, proxy-resolved IP, location hints and client details." />
      <LiveBadge lastUpdated={lastUpdated} connectionState={connectionState} isLive={isLive} />
    </div>

    <section className="grid grid-cols-1 items-stretch gap-3 xl:grid-cols-[1.7fr_1fr]">
      <div className={`${panelClass} flex flex-col ${pulse ? "ring-2 ring-cyan-400/60" : "ring-2 ring-transparent"} transition-shadow duration-500`}>
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
        <span className="whitespace-nowrap text-[11px] text-slate-400">{formatExact(data.recentRequests.length)} events</span>
      </header>
      <RequestTable requests={data.recentRequests} detailed />
    </section>
  </div>;
}