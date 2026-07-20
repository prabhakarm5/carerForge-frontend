import { Link } from "react-router-dom";
import { LegalLayout, Section } from "./Legallayout";
import { supportDestination } from "./legal/contact";

export default function DeliveryPolicy() {
  return (
    <LegalLayout title="Digital Delivery Policy" lastUpdated="20 July 2026">
      <p>CareerForge AI sells digital plans and credits only. No physical goods are shipped and no shipping address is collected for a digital-credit purchase.</p>
      <Section number="1" title="Delivery timing"><p>Credits are added to the account after server-side payment verification. In most cases this is immediate. If the browser is closed, connectivity drops, or the server is restarting, the pending order is reconciled from signed payment events and updated when confirmed.</p></Section>
      <Section number="2" title="Where delivery appears"><p>Delivered credits, plan details, and payment status appear in the signed-in wallet and payment history. You should keep the order ID for your records.</p></Section>
      <Section number="3" title="Delivery problems"><p>If payment is marked successful by your bank or payment provider but credits are not visible after a reasonable reconciliation period, <a className="font-semibold text-cyan-300" href={supportDestination()}>contact the Support Center</a> with your order ID. See the <Link className="font-semibold text-cyan-300" to="/payment-policy">Payment, Cancellation & Refund Policy</Link> for failed-payment and refund handling.</p></Section>
    </LegalLayout>
  );
}