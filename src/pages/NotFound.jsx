import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

// ✅ Registered as the catch-all route in AppRoutes.jsx:
//   <Route path="*" element={<NotFound />} />
// This must stay the LAST route in the <Routes> list.
//
// Note: page title is handled automatically by AutoPageTitle inside
// AppRoutes.jsx (via the ROUTE_TITLES map) — this component does NOT
// need to call any title hook itself.

function NotFound() {
    return (
        <div
            className="grid min-h-screen w-full place-items-center px-5"
            style={{ background: "#07060e" }}
        >
            <div
                className="w-full max-w-sm rounded-2xl p-7 text-center"
                style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                }}
            >
                <div
                    className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl"
                    style={{ background: "linear-gradient(135deg, #fbbf24, #d946ef 55%, #7c3aed)" }}
                >
                    <Compass size={20} color="#ffffff" />
                </div>

                <p className="mt-5 text-[38px] font-black leading-none" style={{ color: "#ffffff" }}>
                    404
                </p>
                <h1 className="mt-2 text-[16px] font-bold" style={{ color: "#ffffff" }}>
                    Page not found
                </h1>
                <p className="mt-1.5 text-[13px] leading-5" style={{ color: "rgba(255,255,255,0.55)" }}>
                    The page you're looking for doesn't exist or may have moved.
                </p>

                <Link
                    to="/"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-xl py-2.5 text-[13px] font-bold"
                    style={{
                        background: "linear-gradient(135deg, #fbbf24, #d946ef 55%, #7c3aed)",
                        color: "#ffffff",
                    }}
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );
}

export default NotFound;