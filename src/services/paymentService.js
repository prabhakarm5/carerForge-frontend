//paymentService.js
import axiosInstance from "../utils/axiosInstance";
import { API } from "../config/api";

// ==========================================================
// RAZORPAY SDK LOADER
// ==========================================================
let razorpayScriptPromise = null;

export function loadRazorpayScript() {

    if (razorpayScriptPromise) {
        return razorpayScriptPromise;
    }

    razorpayScriptPromise = new Promise((resolve, reject) => {

        if (window.Razorpay) {
            resolve(true);
            return;
        }

        const script = document.createElement("script");

        script.src = "https://checkout.razorpay.com/v1/checkout.js";

        script.onload = () => resolve(true);

        script.onerror = () =>
            reject(new Error("Failed to load Razorpay SDK"));

        document.body.appendChild(script);
    });

    return razorpayScriptPromise;
}

// ==========================================================
// CREATE ORDER
// ==========================================================
export async function createOrder(planId, promoCode = null) {

    const response = await axiosInstance.post(

        API.PAYMENT.CREATE_ORDER,

        {
            planId,
            promoCode,
        }

    );

    return response.data;
}

// ==========================================================
// VERIFY PAYMENT
// ==========================================================
export async function verifyPayment(paymentData) {

    const response = await axiosInstance.post(

        API.PAYMENT.VERIFY,

        paymentData

    );

    return response.data;
}

// ==========================================================
// PAYMENT HISTORY
// ==========================================================
export async function getPaymentHistory() {

    const response = await axiosInstance.get(

        API.PAYMENT.HISTORY

    );

    return response.data;
}

// ==========================================================
// PAYMENT PAGE GUARD
// Browser refresh / close warning
// ==========================================================
function beforeUnloadHandler(event) {

    event.preventDefault();

    event.returnValue = "";

    return "";
}

export function enablePaymentGuard() {

    window.addEventListener(

        "beforeunload",

        beforeUnloadHandler

    );
}

export function disablePaymentGuard() {

    window.removeEventListener(

        "beforeunload",

        beforeUnloadHandler

    );
}

// ==========================================================
// START CHECKOUT
// ==========================================================
export function startCheckout({

    planId,

    promoCode,

    userName,

    userEmail,

    onDismiss,

    onProcessing,

}) {

    return new Promise((resolve, reject) => {

        (async () => {

            try {

                await loadRazorpayScript();

                const order = await createOrder(planId, promoCode);

                // Enable refresh protection
                enablePaymentGuard();

                // Show processing overlay
                onProcessing?.(true);

                const options = {

                    key: order.keyId,

                    amount: Math.round(order.amount * 100),

                    currency: order.currency || "INR",

                    name: "CareerForge AI",

                    description: "Wallet Recharge",

                    order_id: order.orderId,

                    prefill: {

                        name: userName || "",

                        email: userEmail || "",

                    },

                    theme: {

                        color: "#7c3aed",

                    },

                    handler: async function (response) {

                        try {

                            const result = await verifyPayment({

                                razorpayOrderId:
                                    response.razorpay_order_id,

                                razorpayPaymentId:
                                    response.razorpay_payment_id,

                                razorpaySignature:
                                    response.razorpay_signature,

                            });

                            disablePaymentGuard();

                            onProcessing?.(false);

                            resolve({

                                status: "success",

                                result,

                                raw: response,

                            });

                        }

                        catch (err) {

                            disablePaymentGuard();

                            onProcessing?.(false);

                            reject({

                                status: "failed",

                                reason: "verification_failed",

                                error: err,

                            });

                        }

                    },

                    modal: {

                        escape: false,

                        confirm_close: true,

                        ondismiss: function () {

                            disablePaymentGuard();

                            onProcessing?.(false);

                            onDismiss?.();

                            reject({

                                status: "cancelled",

                                reason: "User closed payment popup",

                            });

                        },

                    },

                };

                const razorpay = new window.Razorpay(options);

                razorpay.on(

                    "payment.failed",

                    function (response) {

                        disablePaymentGuard();

                        onProcessing?.(false);

                        reject({

                            status: "failed",

                            reason:

                                response.error?.description ??

                                "Payment Failed",

                            error: response.error,

                        });

                    }

                );

                razorpay.open();

            }

            catch (err) {

                disablePaymentGuard();

                onProcessing?.(false);

                reject({

                    status: "failed",

                    reason: "checkout_init_failed",

                    error: err,

                });

            }

        })();

    });

}