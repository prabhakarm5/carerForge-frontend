import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import useAuthStore from "../store/authStore";

// ✅ FIX (real root cause) — ye loading screen pehle sirf card render
// karta tha aur assume karta tha ki peeche wala Layout/page dark
// background (#07060e) laga chuka hoga. Lekin session-check ke dauraan
// Layout render hi nahi hota (ProtectedRoute uski jagah ye loading
// dikhata hai), isliye browser ka default white background reh jaata
// tha — aur white text + white-ish card white background par
// PRACTICALLY INVISIBLE ho jaata tha. Ab is div par khud explicit
// dark background (#07060e) diya hai — chahe kahin bhi mount ho,
// hamesha dikhega.
function ProtectedRoute({ children }) {
    const sessionChecked = useAuthStore((state) => state.sessionChecked);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    const [showSlowNotice, setShowSlowNotice] = useState(false);

    useEffect(() => {
        if (sessionChecked) {
            setShowSlowNotice(false);
            return;
        }

        const timer = setTimeout(() => setShowSlowNotice(true), 3000);
        return () => clearTimeout(timer);
    }, [sessionChecked]);

    if (!sessionChecked) {
        return (
            <div
                className="grid place-items-center px-5 py-10"
                style={{
                    minHeight: "var(--app-height, 100vh)",
                    width: "100%",
                    background: "#07060e",
                }}
            >
                <style>{`
                    @keyframes cfFadeIn {
                        from { opacity: 0; transform: translateY(6px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .cf-session-card {
                        animation: cfFadeIn 0.3s ease-out;
                    }
                `}</style>
                <div
                    className="cf-session-card w-full max-w-sm rounded-2xl p-6 text-center"
                    style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                    }}
                >
                    <Loader2 className="mx-auto h-6 w-6 animate-spin shrink-0" style={{ color: "#d946ef" }} />
                    <p className="mt-4 text-sm font-bold" style={{ color: "#ffffff" }}>
                        Checking your secure session
                    </p>
                    <p
                        className="mt-1 text-xs leading-5 transition-opacity duration-300"
                        style={{ color: "rgba(255,255,255,0.7)" }}
                    >
                        {showSlowNotice
                            ? "Still connecting — hang tight, almost there."
                            : "This usually takes a moment."}
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