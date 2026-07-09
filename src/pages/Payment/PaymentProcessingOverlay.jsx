import { Loader2, ShieldCheck, LockKeyhole, Sparkles } from "lucide-react";

export default function PaymentProcessingOverlay({ visible }) {

    if (!visible) return null;

    return (

        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 999999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                background:
                    "linear-gradient(rgba(8,10,18,.88), rgba(8,10,18,.92))",
                backdropFilter: "blur(14px)",
                animation: "fadeIn .25s ease",
            }}
        >

            <div
                style={{
                    width: "100%",
                    maxWidth: 430,
                    borderRadius: 28,
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,.08)",
                    background:
                        "linear-gradient(180deg,#171827,#11121d)",
                    boxShadow:
                        "0 30px 80px rgba(0,0,0,.45)",
                }}
            >

                {/* Top Gradient */}

                <div
                    style={{
                        height: 5,
                        background:
                            "linear-gradient(90deg,#7c3aed,#4f46e5,#06b6d4)",
                    }}
                />

                <div
                    style={{
                        padding: 36,
                        textAlign: "center",
                    }}
                >

                    {/* Loader */}

                    <div
                        style={{

                            width: 84,
                            height: 84,

                            margin: "0 auto 26px",

                            borderRadius: "50%",

                            display: "flex",

                            alignItems: "center",

                            justifyContent: "center",

                            background:
                                "rgba(124,58,237,.14)",

                            border:
                                "1px solid rgba(124,58,237,.25)",

                        }}
                    >

                        <Loader2

                            size={36}

                            color="#A78BFA"

                            className="animate-spin"

                        />

                    </div>

                    {/* Badge */}

                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "8px 16px",
                            borderRadius: 999,
                            background:
                                "rgba(16,185,129,.12)",
                            border:
                                "1px solid rgba(16,185,129,.25)",
                            color: "#6EE7B7",
                            fontSize: 13,
                            fontWeight: 600,
                            marginBottom: 18,
                        }}
                    >

                        <ShieldCheck size={16} />

                        Secure Payment

                    </div>

                    <h2
                        style={{
                            color: "#fff",
                            fontSize: 24,
                            fontWeight: 700,
                            margin: 0,
                        }}
                    >
                        Processing your payment
                    </h2>

                    <p
                        style={{
                            color: "#94A3B8",
                            lineHeight: 1.8,
                            fontSize: 14,
                            marginTop: 14,
                            marginBottom: 28,
                        }}
                    >
                        Please wait while we securely verify your
                        transaction with our payment gateway.
                    </p>
                                        {/* Animated Progress */}

                    <div
                        style={{
                            width: "100%",
                            height: 8,
                            borderRadius: 999,
                            background: "rgba(255,255,255,.06)",
                            overflow: "hidden",
                            marginBottom: 30,
                        }}
                    >
                        <div
                            style={{
                                width: "70%",
                                height: "100%",
                                borderRadius: 999,
                                background:
                                    "linear-gradient(90deg,#7C3AED,#4F46E5,#06B6D4)",
                                animation:
                                    "paymentProgress 1.6s ease-in-out infinite alternate",
                            }}
                        />
                    </div>

                    {/* Security Card */}

                    <div
                        style={{
                            textAlign: "left",
                            background: "rgba(255,255,255,.03)",
                            border: "1px solid rgba(255,255,255,.08)",
                            borderRadius: 18,
                            padding: 18,
                            marginBottom: 20,
                        }}
                    >

                        <div
                            style={{
                                display: "flex",
                                gap: 14,
                                alignItems: "flex-start",
                            }}
                        >

                            <div
                                style={{
                                    width: 42,
                                    height: 42,
                                    borderRadius: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    background:
                                        "rgba(34,197,94,.12)",
                                }}
                            >

                                <LockKeyhole
                                    size={20}
                                    color="#4ADE80"
                                />

                            </div>

                            <div>

                                <h3
                                    style={{
                                        margin: 0,
                                        color: "#F8FAFC",
                                        fontSize: 15,
                                        fontWeight: 600,
                                    }}
                                >
                                    Bank-Level Encryption
                                </h3>

                                <p
                                    style={{
                                        marginTop: 6,
                                        color: "#94A3B8",
                                        fontSize: 13,
                                        lineHeight: 1.7,
                                    }}
                                >
                                    Your payment is securely encrypted and
                                    verified using Razorpay's secure payment
                                    infrastructure.
                                </p>

                            </div>

                        </div>

                    </div>

                    {/* Warning */}

                    <div
                        style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "flex-start",
                            textAlign: "left",
                            padding: 16,
                            borderRadius: 16,
                            border:
                                "1px solid rgba(251,191,36,.25)",
                            background:
                                "rgba(251,191,36,.08)",
                            marginBottom: 24,
                        }}
                    >

                        <ShieldCheck
                            size={20}
                            color="#FBBF24"
                            style={{
                                flexShrink: 0,
                                marginTop: 2,
                            }}
                        />

                        <div>

                            <div
                                style={{
                                    color: "#FBBF24",
                                    fontWeight: 700,
                                    fontSize: 13,
                                    marginBottom: 6,
                                }}
                            >
                                Please don't close this page
                            </div>

                            <div
                                style={{
                                    color: "#CBD5E1",
                                    fontSize: 13,
                                    lineHeight: 1.7,
                                }}
                            >
                                Refreshing, closing this tab or switching
                                devices during payment may interrupt the
                                transaction.
                            </div>

                        </div>

                    </div>

                    {/* Footer */}

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 8,
                            color: "#64748B",
                            fontSize: 12,
                        }}
                    >

                        <Sparkles
                            size={14}
                            color="#A78BFA"
                        />

                        Powered by CareerForge AI • Razorpay Secure Checkout

                    </div>

                </div>

            </div>

            <style>{`

                @keyframes paymentProgress{

                    0%{

                        width:25%;

                    }

                    100%{

                        width:92%;

                    }

                }

                @keyframes fadeIn{

                    from{

                        opacity:0;

                    }

                    to{

                        opacity:1;

                    }

                }

                @media (max-width:640px){

                    h2{

                        font-size:20px !important;

                    }

                }

            `}</style>

        </div>

    );

}