import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useEffect } from "react";

import AppRoutes from "./routes/AppRoutes";
import useAuthStore from "./store/authStore";

// Small, non-blocking indicator. Only reacts to "backendUnreachable"
// (an info flag) — never blocks any route/page. Just a small pill in
// the bottom-right corner while the backend is unreachable.
function BackendReconnectingBanner() {
    const backendUnreachable = useAuthStore((state) => state.backendUnreachable);

    if (!backendUnreachable) return null;

    return (
        <div
            className="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-xs sm:text-sm font-medium text-black shadow-lg"
            role="status"
        >
            <span className="h-2 w-2 rounded-full bg-black/70 animate-pulse" />
            Reconnecting to server...
        </div>
    );
}

// ✅ FIX — the old full-screen "sessionChecked" gate was removed. It used
// to block the entire app (every page, every route) behind a spinner
// until sessionChecked flipped to true, but when the backend was down it
// just spun forever without ever actually resolving — no page rendered,
// no API calls fired, nothing. Routes now render immediately on mount;
// restoreSession() runs in the background and updates the store once it
// resolves (whether that's "logged in", "logged out", or "backend down").
// ProtectedRoute is the one responsible for handling the brief window
// before sessionChecked flips, not App.
function App() {
    const restoreSession = useAuthStore((state) => state.restoreSession);

    useEffect(() => {
        restoreSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <BrowserRouter>
            <Toaster position="top-right" />
            {/* Small, non-blocking indicator in the corner — never sits
                on top of a page or blocks a route */}
            <BackendReconnectingBanner />
            <AppRoutes />
        </BrowserRouter>
    );
}

export default App;