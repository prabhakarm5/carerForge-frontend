import { Navigate } from "react-router-dom";

import useAuthStore from "../store/authStore";

// ✅ FIX — App.jsx no longer waits for sessionChecked before mounting
// routes, so ProtectedRoute now has to handle that brief window itself.
// Before restoreSession() resolves (sessionChecked === false),
// isAuthenticated is still at its default value — redirecting to
// /login right away would wrongly kick out an already-logged-in user
// on every refresh, even when the backend is fine. So: while the check
// is still in flight, render a small inline loader instead of a
// redirect. Once sessionChecked flips (login, logout, or backend-down
// fallback), the real isAuthenticated check below decides.
function ProtectedRoute({ children }) {
    const sessionChecked = useAuthStore((state) => state.sessionChecked);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!sessionChecked) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <svg className="h-6 w-6 animate-spin text-[#ff6b4a]" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;