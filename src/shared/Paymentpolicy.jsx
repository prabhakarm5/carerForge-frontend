import { LegalLayout, Section } from "./Legallayout";

function PaymentPolicy() {
    return (
        <LegalLayout title="Payment & Credits Policy" lastUpdated="9 July 2026">

            <p>
                This policy explains how credits, paid plans, and payments work on CareerForge
                AI, and is part of our{" "}
                <span className="text-amber-300 font-semibold">Terms & Conditions</span>. By
                registering and later purchasing any paid plan, you agree to the terms below.
            </p>

            <Section number="1" title="Free credits">
                <p>
                    Every new account receives <strong className="text-white">100 free credits</strong>{" "}
                    at signup, at no cost and with no payment details required. Free credits are
                    for evaluating the Platform and may expire or be adjusted; any change to the
                    free allocation will be announced in advance and will not retroactively
                    reduce credits you've already received.
                </p>
            </Section>

            <Section number="2" title="What credits are used for">
                <p>
                    Credits are consumed when you use metered features — for example AI chat
                    responses, resume generation, ATS scoring, or image generation. Different
                    features may consume credits at different rates; current rates are shown in
                    the app before you use a feature.
                </p>
            </Section>

            <Section number="3" title="Paid plans and top-ups">
                <p>
                    Once free credits are used, you may choose to purchase a paid plan or a
                    one-time credit top-up to continue using metered features. Pricing for each
                    plan is shown on our <span className="text-white">[Pricing page]</span> before
                    checkout. Nothing is charged automatically — a purchase only happens when you
                    take a separate, explicit action at checkout.
                </p>
            </Section>

            <Section number="4" title="How payments are processed">
                <p>
                    All payments are processed through <strong className="text-white">Razorpay</strong>,
                    a third-party payment gateway. We do not store your full card, UPI, or bank
                    details on our servers — Razorpay handles that data under its own security
                    and privacy standards. By making a purchase, you also agree to Razorpay's
                    applicable terms.
                </p>
            </Section>

            <Section number="5" title="Subscriptions and renewal">
                <p>
                    If a plan is subscription-based, it will clearly state the billing interval
                    (e.g. monthly) and price before you subscribe. You can cancel future renewals
                    at any time from account settings; cancelling stops the next billing cycle
                    but does not retroactively refund the current cycle unless Section 6 applies.
                </p>
            </Section>

            <Section number="6" title="Refunds">
                <p>
                    Because credits are consumed immediately on use, purchases are generally
                    non-refundable once credits from that purchase have been used. If a payment
                    was charged in error, was duplicated, or a paid feature failed to work as
                    described, contact{" "}
                    <span className="text-white">[support@yourdomain.com]</span> within{" "}
                    <span className="text-white">[7]</span> days of the charge and we will review
                    it in good faith. Approved refunds are returned to the original payment
                    method via Razorpay within the timeframe their system allows.
                </p>
            </Section>

            <Section number="7" title="Failed or disputed payments">
                <p>
                    If a payment fails, no credits are added and you can retry. If you raise a
                    chargeback or payment dispute with your bank/card issuer without first
                    contacting us, we may suspend the associated account while the dispute is
                    investigated.
                </p>
            </Section>

            <Section number="8" title="Taxes">
                <p>
                    Displayed prices are inclusive/exclusive of applicable taxes as shown at
                    checkout (e.g. GST, where applicable). You are responsible for any taxes
                    associated with your purchase beyond what we collect at checkout.
                </p>
            </Section>

            <Section number="9" title="Changes to pricing">
                <p>
                    We may change credit costs or plan pricing going forward. Changes apply only
                    to purchases made after the change takes effect — credits or plans you've
                    already purchased keep the terms they were bought under.
                </p>
            </Section>

            <Section number="10" title="Contact">
                <p>
                    Billing questions can be sent to{" "}
                    <span className="text-white">[support@yourdomain.com]</span>.
                </p>
            </Section>
        </LegalLayout>
    );
}

export default PaymentPolicy;