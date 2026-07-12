import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import useAuthStore from "../store/authStore";

function ProtectedRoute({ children }) {
    const sessionChecked = useAuthStore((state) => state.sessionChecked);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const backendUnreachable = useAuthStore((state) => state.backendUnreachable);

    if (!sessionChecked) {
        return (
            <div className="grid min-h-[55vh] place-items-center px-5">
                <div className="w-full max-w-sm rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-elevated,var(--surface))] p-6 text-center shadow-[0_20px_60px_-30px_rgba(0,0,0,0.45)]">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#ff6b4a]" />
                    <p className="mt-4 text-sm font-bold text-[var(--text-primary)]">Checking your secure session</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">This usually takes a moment.</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;