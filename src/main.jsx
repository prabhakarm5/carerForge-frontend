import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";

import "./index.css";

// ✅ FIX — pehle koi bhi component render-error (jaise undefined ki
// property padhna, ya kisi page mein bug) seedha poori white/blank
// screen bana deta tha, kyuki React ka default behavior top se leke
// neeche tak poora tree unmount kar deta hai jab tak koi Error Boundary
// na ho. User ko sirf khaali page dikhta tha, na koi error, na koi
// "wapas jao" ka option.
//
// Ab: ye ErrorBoundary poore <App /> ko wrap karta hai. Agar kahin bhi
// render ke dauraan crash hota hai, to:
//   1. Console mein poora error + component stack print hota hai
//      (dev debugging ke liye — "kaun sa page/component fail hua").
//   2. User ko crash ki jagah ek clean "Something went wrong" screen
//      dikhti hai, jisme "Reload" aur "Go home" button hai — user kabhi
//      poori tarah stuck/blank screen pe nahi rahega.
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Dev ke liye: exact component jahan crash hua, wahan ka stack
        console.error("[ErrorBoundary] App crashed:", error);
        console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        minHeight: "100vh",
                        width: "100%",
                        display: "grid",
                        placeItems: "center",
                        background: "#07060e",
                        padding: "20px",
                    }}
                >
                    <div
                        style={{
                            maxWidth: "380px",
                            width: "100%",
                            textAlign: "center",
                            borderRadius: "20px",
                            padding: "28px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.1)",
                        }}
                    >
                        <div
                            style={{
                                width: "48px",
                                height: "48px",
                                margin: "0 auto 16px",
                                borderRadius: "14px",
                                display: "grid",
                                placeItems: "center",
                                background: "linear-gradient(135deg, #fbbf24, #d946ef 55%, #7c3aed)",
                                fontSize: "22px",
                            }}
                        >
                            ⚠️
                        </div>
                        <h1 style={{ color: "#ffffff", fontSize: "17px", fontWeight: 800, margin: 0 }}>
                            Something went wrong
                        </h1>
                        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "8px", lineHeight: 1.6 }}>
                            This page ran into an unexpected error. You can try reloading, or head back to the homepage.
                        </p>
                        <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    flex: 1,
                                    padding: "10px 0",
                                    borderRadius: "10px",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    background: "rgba(255,255,255,0.06)",
                                    color: "#ffffff",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                Reload
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                style={{
                                    flex: 1,
                                    padding: "10px 0",
                                    borderRadius: "10px",
                                    border: "none",
                                    background: "linear-gradient(135deg, #fbbf24, #d946ef 55%, #7c3aed)",
                                    color: "#ffffff",
                                    fontSize: "13px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                }}
                            >
                                Go home
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>
);