import { useEffect, useState } from "react";
import { Loader2, MessageSquareText, Send } from "lucide-react";
import toast from "react-hot-toast";
import {
  getAdminSupportTicket, getAdminSupportTickets,
  replyAdminSupportTicket, updateAdminSupportStatus,
} from "../../../services/adminService";
import { LoadingState, SectionHeader } from "./AdminUi";

const STATES = ["OPEN", "IN_PROGRESS", "WAITING_FOR_USER", "RESOLVED", "CLOSED"];

export default function SupportPanel() {
  const [filter, setFilter] = useState("");
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");

  async function load() {
    try {
      setLoading(true);
      setTickets(await getAdminSupportTickets(filter));
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load support tickets");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function open(id) {
    try { setSelected(await getAdminSupportTicket(id)); }
    catch (error) { toast.error(error.response?.data?.message || "Could not open ticket"); }
  }

  async function changeStatus(status) {
    try {
      setBusy(true);
      setSelected(await updateAdminSupportStatus(selected.ticket.id, status));
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function send(event) {
    event.preventDefault();
    if (!reply.trim()) return;
    try {
      setBusy(true);
      setSelected(await replyAdminSupportTicket(selected.ticket.id, reply.trim()));
      setReply("");
      await load();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send reply");
    } finally {
      setBusy(false);
    }
  }

  return <div className="admin-section-stack">
    <SectionHeader title="Support inbox" description="Review user complaints, payment disputes and product issues." action={
      <select value={filter} onChange={(event) => setFilter(event.target.value)} className="admin-support-filter">
        <option value="">All statuses</option>{STATES.map((value) => <option key={value}>{value}</option>)}
      </select>
    } />
    {loading ? <LoadingState label="Loading support inbox" /> : <div className="admin-support-layout">
      <section className="admin-support-list">
        {tickets.map((ticket) => <button key={ticket.id} onClick={() => open(ticket.id)} className={selected?.ticket?.id === ticket.id ? "active" : ""}>
          <div><strong>{ticket.subject}</strong><span>{ticket.status}</span></div>
          <p>{ticket.category} · {ticket.priority}</p>
          <small>{ticket.orderId || ticket.userId}</small>
        </button>)}
        {!tickets.length && <div className="admin-support-empty"><MessageSquareText size={22} /><span>No matching tickets</span></div>}
      </section>
      <section className="admin-support-detail">
        {!selected ? <div className="admin-support-empty"><MessageSquareText size={24} /><span>Select a ticket</span></div> : <>
          <header><div><h3>{selected.ticket.subject}</h3><small>{selected.ticket.orderId || selected.ticket.id}</small></div><select value={selected.ticket.status} disabled={busy} onChange={(event) => changeStatus(event.target.value)}>{STATES.map((value) => <option key={value}>{value}</option>)}</select></header>
          <div className="admin-support-messages">{selected.messages.map((message) => <article key={message.id} className={message.senderRole === "ROLE_ADMIN" ? "admin" : "user"}><strong>{message.senderRole === "ROLE_ADMIN" ? "Support" : "User"}</strong><p>{message.message}</p></article>)}</div>
          <form onSubmit={send}><textarea rows={2} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Reply to the user..." /><button disabled={busy || !reply.trim()}>{busy ? <Loader2 className="animate-spin" size={15} /> : <Send size={15} />}</button></form>
        </>}
      </section>
    </div>}
  </div>;
}