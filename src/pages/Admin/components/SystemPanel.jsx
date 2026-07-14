import {
  AlertTriangle,
  CheckCircle2,
  Database,
  Gauge,
  Mail,
  PlugZap,
  RefreshCw,
  Server,
} from "lucide-react";
import { EmptyState, LoadingState, SectionHeader } from "./AdminUi";

const SERVICE_ICONS = { postgresql: Database, redis: Server, email: Mail };

function label(value) {
  return String(value || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function healthy(status) {
  return ["UP", "CONFIGURED"].includes(status);
}

export default function SystemPanel({ status, loading, onRefresh }) {
  if (loading && !status) return <LoadingState label="Checking platform services" />;
  if (!status) return <EmptyState label="System status is unavailable" icon={AlertTriangle} />;

  const services = Object.entries(status.services || {});
  const integrations = Object.entries(status.integrations || {});
  const limits = Object.entries(status.rateLimits || {});

  return <div className="admin-section-stack">
    <SectionHeader
      title="System readiness"
      description="On-demand infrastructure checks and configuration visibility. Secrets are never returned."
      action={<button className="admin-secondary-btn" onClick={onRefresh} disabled={loading}>
        <RefreshCw size={15} className={loading ? "admin-spin" : ""} />Refresh
      </button>}
    />

    <section className="admin-system-summary">
      <div><span className={status.overallStatus === "OPERATIONAL" ? "up" : "down"} />
        <div><small>Platform state</small><strong>{status.overallStatus}</strong></div>
      </div>
      <small>Checked {new Date(status.checkedAt).toLocaleString()}</small>
    </section>

    <section className="admin-system-grid">
      {services.map(([name, service]) => {
        const Icon = SERVICE_ICONS[name] || PlugZap;
        const isHealthy = healthy(service.status);
        return <article className="admin-system-service" key={name}>
          <header><span><Icon size={18} /></span><small className={isHealthy ? "up" : "down"}>
            {isHealthy ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}{service.status}
          </small></header>
          <h3>{label(name)}</h3>
          <p>{service.message}</p>
          <footer>{service.latencyMs > 0 ? `${service.latencyMs} ms check` : "Configuration check"}</footer>
        </article>;
      })}
    </section>

    <section className="admin-panel admin-integration-panel">
      <header><div><h3>Integration readiness</h3><p>Configuration presence only; provider secrets stay server-side.</p></div><PlugZap size={18} /></header>
      <div className="admin-integration-grid">
        {integrations.map(([name, configured]) => <div key={name}>
          <span className={configured ? "up" : "down"}>{configured ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}</span>
          <strong>{label(name)}</strong><small>{configured ? "Configured" : "Missing configuration"}</small>
        </div>)}
      </div>
    </section>

    <section className="admin-panel admin-table-panel">
      <header><div><h3>Rate-limit policy</h3><p>Effective Redis token-bucket configuration from the backend.</p></div><Gauge size={18} /></header>
      <div className="admin-table-scroll"><table><thead><tr><th>Surface</th><th>Capacity</th><th>Refill</th><th>Window</th></tr></thead>
        <tbody>{limits.map(([name, limit]) => <tr key={name}><td>{label(name)}</td><td>{limit.capacity}</td><td>{limit.refillTokens} tokens</td><td>{limit.refillMinutes} min</td></tr>)}</tbody>
      </table></div>
    </section>
  </div>;
}