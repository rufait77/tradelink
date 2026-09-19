import { Navbar } from '../../components/layout/navbar';
import { Footer } from '../../components/layout/footer';
import type { Metadata } from 'next';
import { TermsContent } from './terms-content';

export const metadata: Metadata = { title: 'Terms of Service' };

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <TermsContent />
      </main>
      <Footer />
    </>
  );
}
