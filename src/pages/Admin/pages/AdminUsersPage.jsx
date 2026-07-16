import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  deleteAdminUser,
  getAdminUserActivity,
  getAdminUsers,
  updateAdminUser,
} from "../../../services/adminService";
import { requestError } from "../components/AdminUi";
import UserDrawer from "../components/UserDrawer";
import UsersPanel from "../components/UsersPanel";

export default function AdminUsersPage() {
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [activity, setActivity] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try { setPageData(await getAdminUsers(page, 20, query)); }
    catch (error) { toast.error(requestError(error, "Could not load users")); }
    finally { setLoading(false); }
  }, [page, query]);

  const loadActivity = useCallback(async (id) => {
    setDrawerLoading(true);
    try { setActivity(await getAdminUserActivity(id)); }
    catch (error) { toast.error(requestError(error, "Could not load user activity")); }
    finally { setDrawerLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadUsers, 0);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (selectedUserId) loadActivity(selectedUserId);
      else setActivity(null);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedUserId, loadActivity]);

  async function actOnUser(account, action) {
    if (action === "delete" && !window.confirm(`Delete ${account.email}? This cannot be undone.`)) return;
    setActionId(account.id + action);
    try {
      if (action === "delete") await deleteAdminUser(account.id);
      else await updateAdminUser(account.id, action);
      toast.success(`User ${action} completed`);
      await loadUsers();
      if (action === "delete") setSelectedUserId(null);
      else if (selectedUserId === account.id) await loadActivity(account.id);
    } catch (error) {
      toast.error(requestError(error, "Admin action failed"));
    } finally {
      setActionId(null);
    }
  }

  return <>
    <UsersPanel pageData={pageData} loading={loading} query={query} setQuery={setQuery} page={page} setPage={setPage} onSelect={(account) => setSelectedUserId(account.id)} onAction={actOnUser} actionId={actionId} />
    {selectedUserId && <UserDrawer activity={activity} loading={drawerLoading} onClose={() => setSelectedUserId(null)} onAction={actOnUser} onRefresh={() => loadActivity(selectedUserId)} />}
  </>;
}
