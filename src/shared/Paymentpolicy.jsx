import { Link } from "react-router-dom";
import { LegalLayout, Section } from "./Legallayout";
import { supportDestination } from "./legal/contact";

export default function PaymentPolicy() {
  return (
    <LegalLayout title="Payment, Cancellation & Refund Policy" lastUpdated="20 July 2026">
      <p>This policy explains how CareerForge AI credits, paid plans, payment verification, cancellation, and support work.</p>
      <Section number="1" title="Credits and pricing"><p>New verified accounts receive the free credits displayed at signup. Metered AI features consume credits at the rate shown in the product. Plan price, credit quantity, and any eligible promo discount are displayed before checkout.</p></Section>
      <Section number="2" title="Payment processing"><p>Payments are processed by Razorpay. CareerForge AI does not store full card, UPI, or bank credentials. A browser success screen alone does not add credits: the backend verifies the payment signature or a signed Razorpay webhook before settling the wallet.</p></Section>
      <Section number="3" title="Failed or delayed payments"><p>If payment fails, credits are not added. If the browser closes or the server is temporarily unavailable after a successful payment, the backend reconciles the pending order with signed gateway data when it becomes available. Payment history records pending, successful, cancelled, and failed outcomes with an understandable reason.</p></Section>
      <Section number="4" title="Cancellation"><p>You can close the checkout before completing payment. A cancelled payment does not add credits. A completed digital-credit purchase cannot be cancelled after its credits have been used.</p></Section>
      <Section number="5" title="Refund review"><p>Because credits are delivered immediately, purchases are generally non-refundable after use. Report duplicate charges, accidental charges, or a paid feature that failed as described within seven days. Each request is reviewed against the order and payment records. Approved refunds return to the original payment method within the payment provider's applicable processing time.</p></Section>
      <Section number="6" title="Support"><p><a className="font-semibold text-cyan-300" href={supportDestination()}>Contact the Support Center</a> with your order ID and payment date for a billing or refund query. See also the <Link className="font-semibold text-cyan-300" to="/privacy-policy">Privacy Policy</Link>.</p></Section>
    </LegalLayout>
  );
}