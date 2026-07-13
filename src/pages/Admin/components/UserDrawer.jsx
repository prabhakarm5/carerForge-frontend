import { Ban, CheckCircle2, Loader2, Mail, RefreshCw, Send, Shield, ShieldOff, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { sendAdminMessage } from "../../../services/adminService";
import { formatNumber, formatTime, LoadingState, RequestTable, requestError } from "./AdminUi";

const MESSAGE_LIMIT = 4000;
const SUBJECT_LIMIT = 120;

export default function UserDrawer({ activity, loading, onClose, onAction, onRefresh }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionKey, setActionKey] = useState(null); // tracks which action button is busy
  const subjectRef = useRef(null);
  const account = activity?.user;

  // Lock background scroll while the drawer is open, restore focus target on mount
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  // Close on Escape for fast keyboard-driven workflows
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const submit = async (event) => {
    event.preventDefault();
    if (!account || sending) return;
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject || !trimmedMessage) {
      toast.error("Add a subject and message before sending");
      return;
    }
    setSending(true);
    try {
      await sendAdminMessage(account.id, { subject: trimmedSubject, message: trimmedMessage });
      toast.success("Message queued for delivery");
      setSubject("");
      setMessage("");
      subjectRef.current?.focus();
    } catch (error) {
      toast.error(requestError(error, "Message could not be sent"));
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  };

  const handleAction = async (nextAction) => {
    if (actionKey) return;
    setActionKey(nextAction);
    try {
      await onAction?.(account, nextAction);
    } finally {
      setActionKey(null);
    }
  };

  return (
    <div className="admin-drawer-layer" role="presentation">
      <button
        className="admin-drawer-backdrop"
        onClick={onClose}
        aria-label="Close user details"
      />

      <aside
        className="admin-user-drawer admin-drawer-enter"
        role="dialog"
        aria-modal="true"
        aria-label={account?.name ? `${account.name} activity` : "User activity"}
      >
        <header>
          <div>
            <span>User activity</span>
            <h2>{account?.name || "Loading user"}</h2>
            <p>{account?.email}</p>
          </div>
          <button title="Close" onClick={onClose} className="admin-icon-btn">
            <X size={18} />
          </button>
        </header>

        {loading ? (
          <LoadingState label="Loading user activity" />
        ) : account ? (
          <div className="admin-drawer-content">
            <section className="admin-drawer-stats">
              <div><span>Requests</span><strong>{formatNumber(activity.requestCount)}</strong></div>
              <div><span>Errors</span><strong>{formatNumber(activity.errorCount)}</strong></div>
              <div><span>Average</span><strong>{activity.averageLatencyMs} ms</strong></div>
              <div><span>Last seen</span><strong>{activity.lastSeenAt ? formatTime(activity.lastSeenAt) : "-"}</strong></div>
            </section>

            <section className="admin-drawer-section">
              <div className="admin-drawer-title">
                <div>
                  <h3>Request history</h3>
                  <p>URLs hit during the retained window</p>
                </div>
                <button
                  title="Refresh activity"
                  onClick={handleRefresh}
                  className="admin-icon-btn"
                  disabled={refreshing}
                >
                  <RefreshCw size={15} className={refreshing ? "admin-spin" : ""} />
                </button>
              </div>
              <RequestTable requests={activity.requests} />
            </section>

            <form className="admin-message-form" onSubmit={submit}>
              <div className="admin-drawer-title">
                <div>
                  <h3>Message user</h3>
                  <p>Delivered to the registered email address</p>
                </div>
                <Mail size={16} />
              </div>

              <input
                ref={subjectRef}
                required
                maxLength={SUBJECT_LIMIT}
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />

              <div className="admin-textarea-wrap">
                <textarea
                  required
                  maxLength={MESSAGE_LIMIT}
                  rows="5"
                  placeholder="Write a clear support message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <span className="admin-char-count">{message.length}/{MESSAGE_LIMIT}</span>
              </div>

              <button
                className="admin-primary-btn"
                disabled={sending || !subject.trim() || !message.trim()}
              >
                {sending ? <Loader2 className="admin-spin" size={15} /> : <Send size={15} />}
                {sending ? "Sending…" : "Send message"}
              </button>
            </form>

            {account.role !== "ROLE_ADMIN" && (
              <section className="admin-drawer-actions">
                <button
                  onClick={() => handleAction(account.enabled ? "disable" : "enable")}
                  disabled={actionKey !== null}
                >
                  {actionKey === "disable" || actionKey === "enable" ? (
                    <Loader2 className="admin-spin" size={15} />
                  ) : account.enabled ? (
                    <ShieldOff size={15} />
                  ) : (
                    <Shield size={15} />
                  )}
                  {account.enabled ? "Disable" : "Enable"}
                </button>

                <button
                  onClick={() => handleAction(account.blocked ? "unblock" : "block")}
                  disabled={actionKey !== null}
                >
                  {actionKey === "block" || actionKey === "unblock" ? (
                    <Loader2 className="admin-spin" size={15} />
                  ) : account.blocked ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <Ban size={15} />
                  )}
                  {account.blocked ? "Unblock" : "Block"}
                </button>
              </section>
            )}
          </div>
        ) : null}
      </aside>
    </div>
  );
}