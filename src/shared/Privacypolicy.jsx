import { Link } from "react-router-dom";
import { LegalLayout, Section } from "./Legallayout";
import { supportDestination } from "./legal/contact";

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated="20 July 2026">
      <p>CareerForge AI processes only the data needed to provide secure career tools, manage your account, prevent abuse, and complete payments.</p>
      <Section number="1" title="Information we process">
        <p>We process account details you provide, including name, email address, optional profile details, and support requests. We also process resumes, job descriptions, messages, uploads, and feature usage only to provide the requested workspace result.</p>
      </Section>
      <Section number="2" title="How information is used">
        <p>Your information is used to authenticate your session, maintain conversation and project history, deliver purchased credits, detect abuse, troubleshoot service failures, and respond to support tickets. We do not sell personal data.</p>
      </Section>
      <Section number="3" title="Payments and service providers">
        <p>Payments are processed by Razorpay. Card, UPI, and bank credentials are entered with the payment gateway and are not stored by CareerForge AI. Selected AI and storage providers receive only the content necessary to complete a requested feature.</p>
      </Section>
      <Section number="4" title="Security and retention">
        <p>Access tokens stay in application memory and refresh credentials are stored in HttpOnly cookies. We retain account and billing records where needed for security, support, and legal obligations. You can request help with your data through the Support Center.</p>
      </Section>
      <Section number="5" title="Your choices">
        <p>You may update profile details, manage active sessions, and raise a support request from Settings after signing in. For billing rules, read the <Link className="font-semibold text-cyan-300" to="/payment-policy">Payment & Credits Policy</Link>.</p>
      </Section>
      <Section number="6" title="Contact">
        <p><a className="font-semibold text-cyan-300" href={supportDestination()}>Contact CareerForge AI support</a> for privacy questions or account assistance.</p>
      </Section>
    </LegalLayout>
  );
}