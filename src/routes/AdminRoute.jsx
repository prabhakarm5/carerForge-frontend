import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import useAuthStore from "../store/authStore";

export default function AdminRoute({ children }) {
  const sessionChecked = useAuthStore((state) => state.sessionChecked);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const role = useAuthStore((state) => state.user?.role);

  if (!sessionChecked) {
    return (
      <div className="admin-route-loader">
        <Loader2 size={24} className="animate-spin" />
        <span>Checking admin session</span>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  if (role !== "ROLE_ADMIN") return <Navigate to="/dashboard" replace />;
  return children;
}
