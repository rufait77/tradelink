import { Navbar } from '../../components/layout/navbar';
import { Footer } from '../../components/layout/footer';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <article className="container-narrow px-4 prose prose-invert prose-amber max-w-3xl mx-auto">
          <h1 className="text-4xl font-heading font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-surface-muted text-sm mb-8">Last updated: March 2026</p>

          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly: name, email, profile details, service area, and payment information (processed securely by Stripe). We also collect usage data such as pages visited, features used, and device information.</p>

          <h2>2. How We Use Your Information</h2>
          <p>Your information is used to: operate and improve the Platform; process payments and commissions; send transactional emails; personalize your experience; and ensure platform security.</p>

          <h2>3. Information Sharing</h2>
          <p>We do not sell your personal information. We share data with: Stripe (payments), Resend (emails), and as required by law. Your public contractor profile is visible to other Tradelink users.</p>

          <h2>4. Data Security</h2>
          <p>We use industry-standard security measures including encryption, secure servers, and access controls. Passwords are hashed using bcrypt. Payment data is handled entirely by Stripe; we never store card numbers.</p>

          <h2>5. Cookies</h2>
          <p>We use essential cookies for authentication (httpOnly refresh tokens) and analytics cookies to understand platform usage.</p>

          <h2>6. Data Retention</h2>
          <p>We retain your data for as long as your account is active. You may request account deletion by contacting support@tradelink.com.</p>

          <h2>7. Your Rights</h2>
          <p>You have the right to: access your personal data; request correction or deletion; opt out of marketing emails; and export your data.</p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>Tradelink is not intended for users under 18. We do not knowingly collect information from minors.</p>

          <h2>9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification.</p>

          <h2>10. Contact</h2>
          <p>For privacy-related inquiries, contact us at support@tradelink.com.</p>
        </article>
      </main>
      <Footer />
    </>
  );
}
