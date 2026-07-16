import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BadgeHelp, CheckCircle2, ChevronLeft, LifeBuoy,
  Loader2, MessageSquareText, Plus, RefreshCw, Send, TicketCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createSupportTicket, getSupportTicket, getSupportTickets,
  reopenSupportTicket, replySupportTicket, resolveSupportTicket,
} from "../../services/supportService";

const STATUS = {
  OPEN: { label: "Open", color: "#38bdf8", bg: "rgba(56,189,248,.12)" },
  IN_PROGRESS: { label: "In progress", color: "#a78bfa", bg: "rgba(167,139,250,.12)" },
  WAITING_FOR_USER: { label: "Reply needed", color: "#fbbf24", bg: "rgba(251,191,36,.12)" },
  RESOLVED: { label: "Resolved", color: "#34d399", bg: "rgba(52,211,153,.12)" },
  CLOSED: { label: "Closed", color: "#94a3b8", bg: "rgba(148,163,184,.12)" },
};

function StatusPill({ status }) {
  const meta = STATUS[status] || STATUS.OPEN;
  return <span style={{ color: meta.color, background: meta.bg }} className="rounded-full px-2 py-1 text-[10px] font-bold uppercase">{meta.label}</span>;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function SupportPage({ embedded = false }) {
  const [params, setParams] = useSearchParams();
  const updateParams = useCallback((next, options) => {
    setParams(embedded ? { tab: "support", ...next } : next, options);
  }, [embedded, setParams]);
  const [tickets, setTickets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creating, setCreating] = useState(params.get("new") === "1");
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [form, setForm] = useState({
    subject: params.get("orderId") ? "Payment needs review" : "",
    category: params.get("orderId") ? "PAYMENT" : "TECHNICAL",
    priority: params.get("orderId") ? "HIGH" : "NORMAL",
    orderId: params.get("orderId") || "",
    message: params.get("reason") || "",
  });

  const loadTickets = useCallback(async () => {
    try {
      setLoading(true);
      setTickets(await getSupportTickets());
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not load support tickets");
    } finally {
      setLoading(false);
    }
  }, []);

  const openTicket = useCallback(async (id) => {
    try {
      setDetailLoading(true);
      setSelected(await getSupportTicket(id));
      setCreating(false);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not open ticket");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadTickets, 0);
    return () => window.clearTimeout(timer);
  }, [loadTickets]);
  useEffect(() => {
    const id = params.get("ticket");
    if (!id) return undefined;
    const timer = window.setTimeout(() => openTicket(id), 0);
    return () => window.clearTimeout(timer);
  }, [params, openTicket]);

  const activeId = selected?.ticket?.id;
  const status = selected?.ticket?.status;
  const closed = status === "CLOSED";

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitTicket(event) {
    event.preventDefault();
    try {
      setBusy(true);
      const created = await createSupportTicket(form);
      setSelected(created);
      setCreating(false);
      updateParams({ ticket: created.ticket.id }, { replace: true });
      await loadTickets();
      toast.success("Support ticket created");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create ticket");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event) {
    event.preventDefault();
    if (!reply.trim()) return;
    try {
      setBusy(true);
      setSelected(await replySupportTicket(activeId, reply.trim()));
      setReply("");
      await loadTickets();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send reply");
    } finally {
      setBusy(false);
    }
  }

  async function toggleResolved() {
    try {
      setBusy(true);
      const done = status === "RESOLVED" || status === "CLOSED";
      const data = done
        ? await reopenSupportTicket(activeId)
        : await resolveSupportTicket(activeId);
      setSelected(data);
      await loadTickets();
      toast.success(done ? "Ticket reopened" : "Ticket resolved");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not update ticket");
    } finally {
      setBusy(false);
    }
  }

  function startTicket() {
    setCreating(true);
    setSelected(null);
    updateParams({ new: "1" });
  }

  function backToList() {
    setSelected(null);
    setCreating(false);
    updateParams({});
  }

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1320px] flex-col text-white">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-cyan-400/10 text-cyan-300"><LifeBuoy size={20} /></div>
          <div>
            <h1 className="text-lg font-bold sm:text-xl">Support center</h1>
            <p className="text-xs text-slate-400">Payment, account and product help in one place.</p>
          </div>
        </div>
        <button onClick={startTicket} className="inline-flex h-9 items-center gap-2 rounded-lg bg-cyan-400 px-3 text-xs font-bold text-slate-950 hover:bg-cyan-300"><Plus size={15} /> New ticket</button>
      </header>

      <div className="grid min-h-0 flex-1 gap-4 pt-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className={(selected || creating ? "hidden lg:flex" : "flex") + " min-h-0 flex-col border-r border-white/10 lg:pr-4"}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Your tickets</span>
            <button onClick={loadTickets} title="Refresh tickets" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/5 hover:text-white"><RefreshCw size={14} /></button>
          </div>
          <div className="min-h-0 space-y-2 overflow-y-auto pr-1">
            {loading && <div className="grid py-16 place-items-center text-slate-400"><Loader2 className="animate-spin" size={20} /></div>}
            {!loading && tickets.length === 0 && <div className="py-16 text-center"><BadgeHelp className="mx-auto mb-3 text-slate-600" /><p className="text-sm font-semibold text-slate-300">No tickets yet</p><p className="mt-1 text-xs text-slate-500">Create one whenever you need help.</p></div>}
            {tickets.map((ticket) => (
              <button
                key={ticket.id}
                onClick={() => { updateParams({ ticket: ticket.id }); openTicket(ticket.id); }}
                className={"w-full rounded-lg border p-3 text-left transition " + (activeId === ticket.id ? "border-cyan-400/40 bg-cyan-400/10" : "border-white/10 bg-white/[.025] hover:bg-white/[.05]")}
              >
                <div className="mb-2 flex items-start justify-between gap-2"><p className="line-clamp-2 text-xs font-semibold text-slate-100">{ticket.subject}</p><StatusPill status={ticket.status} /></div>
                <p className="truncate font-mono text-[10px] text-slate-500">#{ticket.id.slice(0, 8)}{ticket.orderId ? " · " + ticket.orderId : ""}</p>
                <p className="mt-2 text-[10px] text-slate-500">{formatDate(ticket.updatedAt)}</p>
              </button>
            ))}
          </div>
        </aside>

        <section className={(!selected && !creating ? "hidden lg:grid" : "flex") + " min-h-0 flex-col"}>
          {(selected || creating) && <button onClick={backToList} className="mb-3 inline-flex items-center gap-1 self-start text-xs text-slate-400 lg:hidden"><ChevronLeft size={15} /> Tickets</button>}

          {creating && (
            <form onSubmit={submitTicket} className="mx-auto w-full max-w-2xl space-y-4">
              <div><h2 className="text-base font-bold">Tell us what happened</h2><p className="mt-1 text-xs text-slate-400">Add the exact error and payment order ID when available.</p></div>
              <Field label="Subject"><input required maxLength={140} value={form.subject} onChange={(e) => updateForm("subject", e.target.value)} className="support-input" placeholder="Short summary of the issue" /></Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Category"><select value={form.category} onChange={(e) => updateForm("category", e.target.value)} className="support-input bg-[#0b1220]">{["PAYMENT","BILLING","TECHNICAL","ACCOUNT","OTHER"].map((value) => <option key={value}>{value}</option>)}</select></Field>
                <Field label="Priority"><select value={form.priority} onChange={(e) => updateForm("priority", e.target.value)} className="support-input bg-[#0b1220]">{["LOW","NORMAL","HIGH","URGENT"].map((value) => <option key={value}>{value}</option>)}</select></Field>
              </div>
              <Field label="Payment order ID (optional)"><input value={form.orderId} onChange={(e) => updateForm("orderId", e.target.value)} className="support-input font-mono text-xs" placeholder="order_..." /></Field>
              <Field label="Details"><textarea required maxLength={5000} rows={7} value={form.message} onChange={(e) => updateForm("message", e.target.value)} className="support-textarea" placeholder="What did you expect, what happened, and when?" /></Field>
              <button disabled={busy} className="inline-flex h-10 items-center gap-2 rounded-lg bg-cyan-400 px-4 text-sm font-bold text-slate-950 disabled:opacity-50">{busy ? <Loader2 size={15} className="animate-spin" /> : <TicketCheck size={15} />} Create ticket</button>
            </form>
          )}

          {!creating && detailLoading && <div className="grid flex-1 place-items-center text-slate-400"><Loader2 className="animate-spin" /></div>}
          {!creating && selected && !detailLoading && (
            <>
              <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <div className="mb-2 flex items-center gap-2"><StatusPill status={status} /><span className="text-[10px] text-slate-500">{selected.ticket.category} · {selected.ticket.priority}</span></div>
                  <h2 className="text-base font-bold sm:text-lg">{selected.ticket.subject}</h2>
                  {selected.ticket.orderId && <p className="mt-1 font-mono text-[10px] text-slate-500">{selected.ticket.orderId}</p>}
                </div>
                <button disabled={busy} onClick={toggleResolved} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-300 hover:bg-white/5"><CheckCircle2 size={14} />{status === "RESOLVED" || status === "CLOSED" ? "Reopen" : "Mark resolved"}</button>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-4">
                {selected.messages.map((message) => {
                  const admin = message.senderRole === "ROLE_ADMIN";
                  return (
                    <div key={message.id} className={"flex " + (admin ? "" : "justify-end")}>
                      <div className={"max-w-[88%] rounded-lg px-3 py-2.5 sm:max-w-[72%] " + (admin ? "bg-cyan-400/10" : "bg-violet-500/15")}>
                        <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400">{admin ? "CareerForge support" : "You"}<span className="font-normal normal-case text-slate-600">{formatDate(message.createdAt)}</span></div>
                        <p className="whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              {!closed && <form onSubmit={sendReply} className="flex shrink-0 gap-2 border-t border-white/10 pt-3"><textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} className="support-textarea min-h-11 flex-1" placeholder="Write a reply..." /><button disabled={busy || !reply.trim()} title="Send reply" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-cyan-400 text-slate-950 disabled:opacity-40">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button></form>}
            </>
          )}
          {!creating && !selected && <div className="hidden flex-1 place-items-center text-center text-slate-500 lg:grid"><div><MessageSquareText className="mx-auto mb-3" /><p className="text-sm">Select a ticket to view the conversation.</p></div></div>}
        </section>
      </div>
      <style>{".support-input{height:40px;width:100%;border-radius:8px;border:1px solid rgba(255,255,255,.1);background-color:rgba(255,255,255,.04);padding:0 12px;font-size:14px;outline:none}.support-input:focus,.support-textarea:focus{border-color:rgba(34,211,238,.5)}.support-textarea{width:100%;resize:none;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);padding:10px 12px;font-size:14px;line-height:1.5;outline:none}"}</style>
    </div>
  );
}

function Field({ label, children }) {
  return <label className="block"><span className="mb-1.5 block text-xs text-slate-400">{label}</span>{children}</label>;
}