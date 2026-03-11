import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Tradelink — Earn Commissions on Every Referral',
    template: '%s | Tradelink',
  },
  description:
    'Tradelink is the contractor referral platform that pays you. Refer a job, earn 20% commission when it's completed. Built for US contractors.',
  keywords: ['contractor', 'referral', 'commission', 'landscaping', 'roofing', 'HVAC', 'plumbing'],
  openGraph: {
    title: 'Tradelink — Earn Commissions on Every Referral',
    description: 'The contractor referral platform that pays you 20% commission on every completed job.',
    url: 'https://tradelink.rufaitlabs.cloud',
    siteName: 'Tradelink',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
