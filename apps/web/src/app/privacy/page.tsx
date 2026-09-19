import { Navbar } from '../../components/layout/navbar';
import { Footer } from '../../components/layout/footer';
import type { Metadata } from 'next';
import { PrivacyContent } from './privacy-content';

export const metadata: Metadata = { title: 'Privacy Policy' };

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <PrivacyContent />
      </main>
      <Footer />
    </>
  );
}
