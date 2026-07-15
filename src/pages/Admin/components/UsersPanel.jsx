import { Ban, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Search, Shield, ShieldOff, Trash2, Users, X } from "lucide-react";
import { memo, useEffect, useState } from "react";
import { EmptyState, formatNumber, LoadingState, SectionHeader } from "./AdminUi";

const SEARCH_DEBOUNCE_MS = 550;

function UserRow({ account, onSelect, onAction, isRowBusy, busyAction }) {
  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(account);
    }
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    if (window.confirm(`Delete ${account.name || account.email}? This can't be undone.`)) {
      onAction(account, "delete");
    }
  };

  return (
    <tr
      className="admin-clickable-row"
      onClick={() => onSelect(account)}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`View activity for ${account.name || account.email}`}
    >
      <td data-label="User">
        <div className="admin-user-cell">
          <span>{account.name?.slice(0, 1)?.toUpperCase() || "U"}</span>
          <div>
            <strong>{account.name}</strong>
            <small>{account.email}</small>
          </div>
        </div>
      </td>
      <td data-label="Joined">{account.createdAt ? new Date(account.createdAt).toLocaleDateString() : "-"}</td>
      <td data-label="Role">{account.role.replace("ROLE_", "")}</td>
      <td data-label="Verification">
        {account.emailVerified ? (
          <span className="admin-verified"><CheckCircle2 size={14} />Verified</span>
        ) : (
          "Pending"
        )}
      </td>
      <td data-label="Access">
        <span className={`admin-access ${account.blocked ? "blocked" : account.enabled ? "enabled" : "disabled"}`}>
          {account.blocked ? "Blocked" : account.enabled ? "Enabled" : "Disabled"}
        </span>
      </td>
      <td data-label="Actions" onClick={(event) => event.stopPropagation()}>
        {account.role === "ROLE_ADMIN" ? (
          <span className="admin-protected"><Shield size={14} />Protected</span>
        ) : (
          <div className="admin-row-actions">
            <button
              title={account.enabled ? "Disable user" : "Enable user"}
              onClick={() => onAction(account, account.enabled ? "disable" : "enable")}
              disabled={isRowBusy}
            >
              {actionMatches(busyAction, account.enabled ? "disable" : "enable") ? (
                <Loader2 className="admin-spin" size={15} />
              ) : account.enabled ? (
                <ShieldOff size={15} />
              ) : (
                <Shield size={15} />
              )}
            </button>
            <button
              title={account.blocked ? "Unblock user" : "Block user"}
              onClick={() => onAction(account, account.blocked ? "unblock" : "block")}
              disabled={isRowBusy}
            >
              {actionMatches(busyAction, account.blocked ? "unblock" : "block") ? (
                <Loader2 className="admin-spin" size={15} />
              ) : account.blocked ? (
                <CheckCircle2 size={15} />
              ) : (
                <Ban size={15} />
              )}
            </button>
            <button className="danger" title="Delete user" onClick={handleDelete} disabled={isRowBusy}>
              {actionMatches(busyAction, "delete") ? <Loader2 className="admin-spin" size={15} /> : <Trash2 size={15} />}
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function actionMatches(busyAction, action) {
  return busyAction === action;
}

const MemoUserRow = memo(UserRow);

export default function UsersPanel({ pageData, loading, query, setQuery, page, setPage, onSelect, onAction, actionId }) {
  // Keep typing instant for the user, but only push the search upstream
  // after they pause — avoids firing a request on every keystroke.
  const [localQuery, setLocalQuery] = useState(query || "");

  useEffect(() => {
    setLocalQuery(query || "");
  }, [query]);

  useEffect(() => {
    if (localQuery === query) return;
    const timer = setTimeout(() => {
      setQuery(localQuery);
      setPage(0); // a fresh search should land on the first page
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localQuery]);

  const rows = pageData?.content || [];
  const totalPages = Math.max(1, pageData?.totalPages || 1);
  const isLastPage = pageData?.last !== false;

  return (
    <div className="admin-section-stack">
      <SectionHeader title="User directory" description="Search by name or email, inspect activity and manage account access." />
      <section className="admin-panel admin-table-panel">
        <header className="admin-users-header">
          <div className="admin-search">
            <Search size={16} />
            <input
              value={localQuery}
              onChange={(event) => setLocalQuery(event.target.value)}
              placeholder="Search email or name"
              aria-label="Search users"
            />
            {localQuery && (
              <button onClick={() => setLocalQuery("")} title="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
          <span>{formatNumber(pageData?.totalElements || 0)} accounts</span>
        </header>

        {loading ? (
          <LoadingState label="Loading users" />
        ) : (
          <>
            <div className="admin-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Joined</th>
                    <th>Role</th>
                    <th>Verification</th>
                    <th>Access</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((account) => {
                    const isRowBusy = actionId != null && actionId.startsWith(String(account.id));
                    const busyAction = isRowBusy ? actionId.slice(String(account.id).length) : null;
                    return (
                      <MemoUserRow
                        key={account.id}
                        account={account}
                        onSelect={onSelect}
                        onAction={onAction}
                        isRowBusy={isRowBusy}
                        busyAction={busyAction}
                      />
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && <EmptyState icon={Users} label="No matching users" />}
            </div>

            <footer className="admin-pagination">
              <button title="Previous page" disabled={page === 0} onClick={() => setPage(Math.max(0, page - 1))}>
                <ChevronLeft size={15} />
              </button>
              <span>Page {page + 1} of {totalPages}</span>
              <button title="Next page" disabled={isLastPage} onClick={() => setPage(page + 1)}>
                <ChevronRight size={15} />
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}