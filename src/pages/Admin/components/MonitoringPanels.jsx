import { Activity, CircleGauge, Clock3, Cpu, Gauge, MemoryStick, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, formatBytes, formatNumber, formatUptime, MetricCard, MetricList, RequestTable, SectionHeader } from "./AdminUi";

export function OverviewPanel({ overview }) {
  const heap = Math.min(100, overview.system.usedHeapBytes * 100 / Math.max(1, overview.system.maxHeapBytes));
  return <div className="admin-section-stack">
    <SectionHeader title="Operations overview" description="Live application health, traffic and user signals from this server instance." />
    <section className="admin-metrics-grid">
      <MetricCard icon={Users} label="Total users" value={formatNumber(overview.users.total)} hint={`+${overview.users.joinedLastSevenDays} joined this week`} tone="cyan" />
      <MetricCard icon={Activity} label="API requests" value={formatNumber(overview.traffic.requests)} hint={`${overview.traffic.activeUsers} active users`} tone="violet" />
      <MetricCard icon={Clock3} label="Average latency" value={`${overview.traffic.averageLatencyMs} ms`} hint={`${overview.traffic.errorRate}% error rate`} tone={overview.traffic.averageLatencyMs > 500 ? "rose" : "amber"} />
      <MetricCard icon={Cpu} label="Process CPU" value={`${overview.system.processCpuPercent}%`} hint={`${overview.system.liveThreads} live threads`} tone="rose" />
    </section>
    <section className="admin-chart-grid">
      <div className="admin-panel admin-chart-panel"><header><div><h3>Request volume</h3><p>Hourly traffic over the retained monitoring window</p></div><Gauge size={18} /></header>
        <div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={overview.requestTimeline}>
          <defs><linearGradient id="requestFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22d3ee" stopOpacity=".42" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></linearGradient></defs>
          <CartesianGrid stroke="rgba(148,163,184,.11)" vertical={false} /><XAxis dataKey="label" stroke="#718096" tickLine={false} axisLine={false} fontSize={10} /><YAxis stroke="#718096" tickLine={false} axisLine={false} fontSize={10} allowDecimals={false} width={28} />
          <Tooltip contentStyle={{ background: "#101827", border: "1px solid #263349", borderRadius: 6 }} /><Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} fill="url(#requestFill)" isAnimationActive={false} />
        </AreaChart></ResponsiveContainer></div>
      </div>
      <div className="admin-panel admin-health-panel"><header><div><h3>Runtime health</h3><p>Current JVM and host process</p></div><CircleGauge size={18} /></header>
        <div className="admin-health-list"><div><MemoryStick size={16} /><span>Heap used</span><strong>{formatBytes(overview.system.usedHeapBytes)}</strong></div><div><Cpu size={16} /><span>System CPU</span><strong>{overview.system.systemCpuPercent}%</strong></div><div><Activity size={16} /><span>Page views</span><strong>{formatNumber(overview.traffic.pageViews)}</strong></div><div><Clock3 size={16} /><span>Uptime</span><strong>{formatUptime(overview.system.uptimeSeconds)}</strong></div></div>
        <div className="admin-heap-track"><span style={{ width: `${heap}%` }} /></div><small>{formatBytes(overview.system.maxHeapBytes)} maximum heap</small>
      </div>
    </section>
    <section className="admin-list-grid"><MetricList title="Top API endpoints" items={overview.topEndpoints} color="cyan" /><MetricList title="Top product pages" items={overview.topPages} color="violet" /><MetricList title="Traffic locations" items={overview.countries} color="amber" /></section>
    <section className="admin-panel admin-table-panel"><header><div><h3>Slow endpoint analysis</h3><p>Ranked by p95 latency, which is more reliable than a small-sample average</p></div><Clock3 size={18} /></header>
      <div className="admin-table-scroll"><table><thead><tr><th>Endpoint</th><th>Requests</th><th>Average</th><th>P95</th><th>Maximum</th><th>Errors</th></tr></thead><tbody>{(overview.slowEndpoints || []).map((item) => <tr key={item.path}><td className="admin-route-cell">{item.path}</td><td>{item.requests}</td><td>{item.averageLatencyMs} ms</td><td className={item.p95LatencyMs > 750 ? "admin-latency-hot" : ""}>{item.p95LatencyMs} ms</td><td>{item.maxLatencyMs} ms</td><td>{item.errors}</td></tr>)}</tbody></table>{!overview.slowEndpoints?.length && <EmptyState label="Not enough request data yet" />}</div>
    </section>
  </div>;
}

export function TrafficPanel({ overview }) {
  const statusData = Object.entries(overview.statusCodes || {}).map(([name, value]) => ({ name, value }));
  return <div className="admin-section-stack"><SectionHeader title="Traffic explorer" description="Inspect status codes, proxy-resolved IP, location hints and client details." />
    <section className="admin-chart-grid"><div className="admin-panel admin-chart-panel"><header><div><h3>HTTP outcomes</h3><p>Success, redirect and failure groups</p></div><Activity size={18} /></header><div className="admin-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={statusData}><CartesianGrid stroke="rgba(148,163,184,.11)" vertical={false} /><XAxis dataKey="name" stroke="#718096" tickLine={false} axisLine={false} /><YAxis stroke="#718096" tickLine={false} axisLine={false} allowDecimals={false} width={28} /><Tooltip contentStyle={{ background: "#101827", border: "1px solid #263349", borderRadius: 6 }} /><Bar dataKey="value" fill="#a78bfa" radius={[4, 4, 0, 0]} isAnimationActive={false} /></BarChart></ResponsiveContainer></div></div><MetricList title="Most requested endpoints" items={overview.topEndpoints} color="cyan" /></section>
    <section className="admin-panel admin-table-panel"><header><div><h3>Recent requests</h3><p>Full IP is restricted to administrators</p></div><span>{overview.recentRequests.length} events</span></header><RequestTable requests={overview.recentRequests} detailed /></section>
  </div>;
}