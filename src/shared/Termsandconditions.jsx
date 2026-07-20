import { Link } from "react-router-dom";
import { LegalLayout, Section } from "./Legallayout";
import { supportDestination } from "./legal/contact";

export default function TermsAndConditions() {
  return (
    <LegalLayout title="Terms & Conditions" lastUpdated="20 July 2026">
      <p>These Terms govern your use of CareerForge AI. By creating an account or using the Platform, you agree to these Terms and the linked policies.</p>
      <Section number="1" title="Account responsibility"><p>Keep your account credentials confidential and provide accurate registration information. Use the Support Center immediately if you suspect unauthorized access.</p></Section>
      <Section number="2" title="AI-assisted services"><p>CareerForge AI provides tools for chat, resumes, interview practice, job exploration, and image generation. AI output is a starting point only. You remain responsible for reviewing information before relying on it for applications, interviews, or professional decisions.</p></Section>
      <Section number="3" title="Acceptable use"><p>Do not use the Platform unlawfully, bypass credit or rate limits, upload malicious content, impersonate another person, or attempt to compromise the service.</p></Section>
      <Section number="4" title="Your content"><p>You retain ownership of documents and content you upload. You give CareerForge AI a limited permission to process that content solely to provide the requested feature, operate the service, and protect it from abuse.</p></Section>
      <Section number="5" title="Credits and payments"><p>Paid usage, cancellations, payment verification, and refund review are governed by the <Link className="font-semibold text-cyan-300" to="/payment-policy">Payment, Cancellation & Refund Policy</Link>.</p></Section>
      <Section number="6" title="Privacy"><p>Data handling is described in the <Link className="font-semibold text-cyan-300" to="/privacy-policy">Privacy Policy</Link>.</p></Section>
      <Section number="7" title="Suspension and changes"><p>We may suspend accounts involved in fraud, abuse, or a material breach of these Terms. We may update these Terms; continued use after an effective update means you accept the revised Terms.</p></Section>
      <Section number="8" title="Contact"><p><a className="font-semibold text-cyan-300" href={supportDestination()}>Contact CareerForge AI support</a> for questions about these Terms.</p></Section>
    </LegalLayout>
  );
}