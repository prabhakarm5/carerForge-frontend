import { Activity, Clock3, Cpu, Users } from "lucide-react";

export const formatNumber = (value = 0) => new Intl.NumberFormat("en-IN").format(value);
export const formatDateTime = (value) => value
  ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  : "Not available";
export const formatTime = (value) => value
  ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
  : "-";

export function formatBytes(bytes = 0) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** index).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

export function formatUptime(seconds = 0) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return days ? `${days}d ${hours}h` : `${hours}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export function requestError(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error || fallback;
}

function statusTone(status) {
  if (status >= 500) return "danger";
  if (status >= 400) return "warn";
  if (status >= 300) return "info";
  return "success";
}

export function MetricCard({ icon: Icon, label, value, hint, tone = "cyan" }) {
  return <article className={`admin-metric admin-tone-${tone}`}>
    <span className="admin-metric-icon"><Icon size={18} /></span>
    <div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>
  </article>;
}

export function EmptyState({ icon: Icon = Activity, label }) {
  return <div className="admin-empty"><Icon size={20} /><span>{label}</span></div>;
}

export function LoadingState({ label = "Loading" }) {
  return <div className="admin-page-loading compact"><span className="admin-css-spinner" /><span>{label}</span></div>;
}

export function SectionHeader({ title, description, action }) {
  return <div className="admin-section-heading"><div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

export function MetricList({ title, items = [], color = "cyan" }) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return <section className="admin-panel admin-ranked-panel">
    <header><h3>{title}</h3></header>
    {items.length ? <div className="admin-ranked-list">{items.map((item) => <div className="admin-ranked-row" key={item.name}>
      <div><span title={item.name}>{item.name}</span><strong>{formatNumber(item.value)}</strong></div>
      <div className="admin-rank-track"><span className={`admin-rank-fill ${color}`} style={{ width: `${item.value * 100 / max}%` }} /></div>
    </div>)}</div> : <EmptyState label="No activity in this window" />}
  </section>;
}

export function RequestTable({ requests = [], detailed = false }) {
  return <div className="admin-table-scroll"><table className="admin-request-table">
    <thead><tr><th>Time</th><th>Method</th><th>Route</th><th>Status</th><th>Latency</th>{detailed && <><th>IP address</th><th>Location</th><th>Client</th></>}</tr></thead>
    <tbody>{requests.map((request, index) => <tr key={`${request.timestamp}-${request.path}-${index}`}>
      <td>{formatTime(request.timestamp)}</td><td><span className="admin-method">{request.method}</span></td>
      <td className="admin-route-cell" title={request.path}>{request.path}</td>
      <td><span className={`admin-status ${statusTone(request.status)}`}>{request.status}</span></td>
      <td className={request.durationMs > 750 ? "admin-latency-hot" : ""}>{request.durationMs} ms</td>
      {detailed && <><td>{request.clientIp || request.maskedIp}</td><td>{request.location || request.country}</td><td className="admin-client-cell" title={request.userAgent}>{request.userAgent || "Unknown"}</td></>}
    </tr>)}</tbody>
  </table>{!requests.length && <EmptyState label="No requests captured in this window" />}</div>;
}

export const KPI_ICONS = { users: Users, requests: Activity, latency: Clock3, cpu: Cpu };