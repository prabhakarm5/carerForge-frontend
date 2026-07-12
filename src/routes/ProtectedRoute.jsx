import { Navigate } from "react-router-dom";
import { Loader2, WifiOff } from "lucide-react";

import useAuthStore from "../store/authStore";

function ProtectedRoute({ children }) {
    const sessionChecked = useAuthStore((state) => state.sessionChecked);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const backendUnreachable = useAuthStore((state) => state.backendUnreachable);

    // ✅ FIX — `backendUnreachable` pehle store se import to ho raha tha,
    // lekin kahin use nahi hota tha. Matlab agar backend hi down hota,
    // to user ko wahi "Checking your secure session" wala loader
    // hamesha ke liye dikhta rehta (kyuki session-check kabhi complete
    // hi nahi ho pata) — user ko lagta app hang ho gaya.
    //
    // Ab: agar backend unreachable hai, ek clear "can't reach server"
    // state dikhti hai, session-check ke stuck-loader ki jagah.
    if (backendUnreachable) {
        return (
            <div className="grid min-h-[55vh] place-items-center px-5">
                <div
                    className="w-full max-w-sm rounded-2xl p-6 text-center"
                    style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                    }}
                >
                    <div
                        className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl"
                        style={{ background: "rgba(239,68,68,0.15)" }}
                    >
                        <WifiOff className="h-5 w-5" style={{ color: "#fca5a5" }} />
                    </div>
                    <p className="mt-4 text-sm font-bold" style={{ color: "#ffffff" }}>
                        Can't reach the server
                    </p>
                    <p className="mt-1 text-xs leading-5" style={{ color: "rgba(255,255,255,0.55)" }}>
                        Check your connection and try again in a moment.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 w-full rounded-xl py-2.5 text-[13px] font-bold"
                        style={{
                            background: "linear-gradient(135deg, #fbbf24, #d946ef 55%, #7c3aed)",
                            color: "#ffffff",
                        }}
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

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