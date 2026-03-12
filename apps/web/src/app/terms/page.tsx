import { Navbar } from '../../components/layout/navbar';
import { Footer } from '../../components/layout/footer';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <article className="container-narrow px-4 prose prose-invert prose-amber max-w-3xl mx-auto">
          <h1 className="text-4xl font-heading font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-surface-muted text-sm mb-8">Last updated: March 2026</p>

          <h2>1. Acceptance of Terms</h2>
          <p>By accessing or using Tradelink ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.</p>

          <h2>2. Eligibility</h2>
          <p>You must be at least 18 years old and a legal resident of the United States to use Tradelink. By registering, you represent that you are a licensed contractor or have the authority to refer contracting jobs.</p>

          <h2>3. Account Registration</h2>
          <p>You agree to provide accurate, current information during registration. You are responsible for maintaining the confidentiality of your password and for all activities under your account.</p>

          <h2>4. Fees & Payments</h2>
          <p>Tradelink charges a one-time signup fee and a recurring monthly subscription fee. All fees are non-refundable except where required by law. Commission rates, platform fees, and subscription prices are set by the platform and may be adjusted with notice.</p>

          <h2>5. Referral Commissions</h2>
          <p>Referral commissions are earned when a job you post as a referral is claimed by another contractor and marked as completed. Commissions are paid via Stripe Connect to your connected bank account within 2-3 business days.</p>

          <h2>6. Prohibited Conduct</h2>
          <p>You may not: post fraudulent or misleading job listings; manipulate the referral system; harass other users; or violate any applicable laws.</p>

          <h2>7. Termination</h2>
          <p>We reserve the right to suspend or terminate your account at any time for violation of these Terms or for any other reason at our sole discretion.</p>

          <h2>8. Disclaimer & Liability</h2>
          <p>Tradelink is provided "as is." We make no warranties regarding the platform's availability, accuracy, or fitness for a particular purpose. Our liability is limited to the fees you have paid in the preceding 12 months.</p>

          <h2>9. Changes to Terms</h2>
          <p>We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new Terms.</p>

          <h2>10. Contact</h2>
          <p>For questions about these Terms, contact us at support@tradelink.com.</p>
        </article>
      </main>
      <Footer />
    </>
  );
}
