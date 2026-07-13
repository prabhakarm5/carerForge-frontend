import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import useAuthStore from "../store/authStore";

function ProtectedRoute({ children }) {
    const sessionChecked = useAuthStore((state) => state.sessionChecked);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    if (!sessionChecked) {
        return (
            <div className="grid min-h-[55vh] place-items-center px-5">
                <div
                    className="w-full max-w-sm rounded-2xl p-6 text-center"
                    style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                    }}
                >
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" style={{ color: "#d946ef" }} />
                    <p className="mt-4 text-sm font-bold" style={{ color: "#ffffff" }}>
                        Checking your secure session
                    </p>
                    <p className="mt-1 text-xs leading-5" style={{ color: "rgba(255,255,255,0.55)" }}>
                        This usually takes a moment.
                    </p>
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