import { Link } from "react-router-dom";
import { LegalLayout, Section } from "./Legallayout";
import { supportDestination, supportEmail } from "./legal/contact";

export default function ContactPage() {
  return (
    <LegalLayout title="Contact & Support" lastUpdated="20 July 2026">
      <p>CareerForge AI provides account, billing, credit, and technical support through the in-app Support Center. Every ticket stays connected to the signed-in account and relevant order history.</p>
      <Section number="1" title="Get help">
        <p><a className="font-semibold text-cyan-300" href={supportDestination()}>Open the Support Center</a> to create a ticket, follow progress, or reply to the support team.</p>
      </Section>
      <Section number="2" title="Payment and refund queries">
        <p>Include your CareerForge order ID, payment date, and the issue you saw. Payment records are reconciled against signed Razorpay events before credits are changed. Review the <Link className="font-semibold text-cyan-300" to="/payment-policy">Payment & Credits Policy</Link> before purchasing.</p>
      </Section>
      <Section number="3" title="Contact address">
        <p>{supportEmail ? <>You can also email <a className="font-semibold text-cyan-300" href={`mailto:${supportEmail}`}>{supportEmail}</a>.</> : "Set VITE_SUPPORT_EMAIL to a monitored business mailbox before requesting payment-gateway website approval. Until then, use the signed-in Support Center."}</p>
      </Section>
    </LegalLayout>
  );
}