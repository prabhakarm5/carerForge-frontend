import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getAdminSystemStatus } from "../../../services/adminService";
import SystemPanel from "../components/SystemPanel";
import { requestError } from "../components/AdminUi";

export default function AdminSystemPage() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setStatus(await getAdminSystemStatus()); }
    catch (error) { toast.error(requestError(error, "Could not check platform services")); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  return <SystemPanel status={status} loading={loading} onRefresh={load} />;
}
