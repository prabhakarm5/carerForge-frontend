import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";

import AppRoutes from "./routes/AppRoutes";
import useAuthStore from "./store/authStore";

// ✅ FIX — banner ab CSS transition ke saath smoothly fade/slide in-out
// hota hai (pehle abruptly dikh/gayab ho jaata tha). Text ke aage
// "shrink-0" diya taaki chhote screens par dot text ko squish na kare,
// aur "whitespace-nowrap" + safe max-width diya taaki text kabhi
// screen edge ke bahar na jaaye ya wrap hoke overlap na kare —
// isi wajah se text "invisible" jaisa lag sakta tha.
function BackendReconnectingBanner() {
    const backendUnreachable = useAuthStore((state) => state.backendUnreachable);
    const isAuthenticated = useAuthStore(
        (state) => state.isAuthenticated ?? Boolean(state.user)
    );

    const show = backendUnreachable && isAuthenticated;

    return (
        <div
            className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full px-4 py-2 text-xs sm:text-sm font-semibold shadow-lg transition-all duration-300 ease-out max-w-[calc(100vw-2rem)]"
            style={{
                background: "#fbbf24",
                color: "#1a1105",
                opacity: show ? 1 : 0,
                transform: show ? "translateY(0)" : "translateY(10px)",
                pointerEvents: show ? "auto" : "none",
                visibility: show ? "visible" : "hidden",
            }}
            role="status"
            aria-hidden={!show}
        >
            <span
                className="h-2 w-2 rounded-full animate-pulse shrink-0"
                style={{ background: "rgba(0,0,0,0.55)" }}
            />
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">
                Reconnecting to server...
            </span>
        </div>
    );
}

function App() {
    const restoreSession = useAuthStore((state) => state.restoreSession);

    useEffect(() => {
        let hasStartedOnce = false;

        // ✅ FIX — pehle ye sirf ek baar (mount ke baad first visibility)
        // restoreSession() call karta tha, phir kabhi nahi — chahe backend
        // baad mein down ho jaaye aur user tab switch karke wapas aaye.
        // Ab: agar backend abhi bhi unreachable hai aur tab wapas visible
        // hui, to turant ek extra retry try karta hai (background timer ke
        // bharose baithne ke bajaye) — bina extra API spam kiye, kyunki
        // ye sirf visibility-change par fire hota hai, poll karke nahi.
        const handleVisibility = () => {
            if (document.visibilityState !== "visible") return;

            if (!hasStartedOnce) {
                hasStartedOnce = true;
                restoreSession();
                return;
            }

            if (useAuthStore.getState().backendUnreachable) {
                restoreSession();
            }
        };

        handleVisibility();
        document.addEventListener("visibilitychange", handleVisibility);
        document.documentElement.dataset.reduceMotion =
            localStorage.getItem("cf_reduce_motion") === "1" ? "true" : "false";

        const viewport = window.visualViewport;
        const syncViewportHeight = () => {
            const height = viewport?.height || window.innerHeight;
            document.documentElement.style.setProperty("--app-height", `${Math.round(height)}px`);
        };
        syncViewportHeight();
        viewport?.addEventListener("resize", syncViewportHeight);
        viewport?.addEventListener("scroll", syncViewportHeight);
        window.addEventListener("orientationchange", syncViewportHeight);
        return () => {
            document.removeEventListener("visibilitychange", handleVisibility);
            viewport?.removeEventListener("resize", syncViewportHeight);
            viewport?.removeEventListener("scroll", syncViewportHeight);
            window.removeEventListener("orientationchange", syncViewportHeight);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <BrowserRouter>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: "#120f1f",
                        color: "#ffffff",
                        border: "1px solid rgba(255,255,255,0.1)",
                        fontSize: "13px",
                        fontWeight: 500,
                        borderRadius: "12px",
                        padding: "12px 14px",
                    },
                    success: {
                        iconTheme: { primary: "#34d399", secondary: "#120f1f" },
                    },
                    error: {
                        iconTheme: { primary: "#f87171", secondary: "#120f1f" },
                    },
                }}
            />

            <BackendReconnectingBanner />

            <AppRoutes />
        </BrowserRouter>
    );
}

export default App;