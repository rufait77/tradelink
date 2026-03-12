'use client';
import { Navbar } from '../../components/layout/navbar';
import { Footer } from '../../components/layout/footer';
import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../../components/ui/button';
import { useEffect, useState } from 'react';
import api from '../../lib/api';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

export default function PricingPage() {
  const [signup, setSignup] = useState('29.99');
  const [monthly, setMonthly] = useState('9.99');
  const [commission, setCommission] = useState('20');

  useEffect(() => {
    api.get('/settings/public').then((res) => {
      const d = res.data.data;
      if (d.signupFee) setSignup(String(d.signupFee));
      if (d.subscriptionFee) setMonthly(String(d.subscriptionFee));
      if (d.commissionPct) setCommission(String(d.commissionPct));
    }).catch(() => {});
  }, []);

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container-narrow px-4">
          <motion.div className="text-center mb-16" initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} custom={0} className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">
              Simple, Transparent Pricing
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-surface-muted max-w-xl mx-auto">
              No hidden fees. Values shown are live from the admin dashboard.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Signup Fee */}
            <motion.div className="glass-card p-8 hover-lift" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">One-Time</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-heading font-bold text-white">${signup}</span>
              </div>
              <p className="text-sm text-surface-muted mb-6">Signup Fee — paid once when you create your account</p>
              <ul className="space-y-3">
                {['Create contractor profile', 'Access job board', 'Basic platform features'].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Monthly Subscription */}
            <motion.div className="glass-card p-8 hover-lift relative overflow-hidden" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={1}>
              <div className="absolute top-0 right-0 px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-navy-950 text-xs font-bold rounded-bl-xl">
                POPULAR
              </div>
              <p className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Monthly</p>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-heading font-bold text-white">${monthly}</span>
                <span className="text-sm text-surface-muted">/mo</span>
              </div>
              <p className="text-sm text-surface-muted mb-6">Full platform access + referral earning capability</p>
              <ul className="space-y-3">
                {[
                  'Post unlimited referrals',
                  'Claim available jobs',
                  `Earn ${commission}% commission on referrals`,
                  'In-app messaging',
                  'Earnings dashboard',
                  'Priority customer support',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>

          {/* Commission breakdown */}
          <motion.div
            className="glass-card p-8 mt-8 max-w-3xl mx-auto"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            <h3 className="text-lg font-semibold text-white mb-4">Commission Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-navy-950 rounded-xl p-4 text-center">
                <p className="text-2xl font-heading font-bold gradient-text">{commission}%</p>
                <p className="text-xs text-surface-muted mt-1">Your Referral Commission</p>
              </div>
              <div className="bg-navy-950 rounded-xl p-4 text-center">
                <p className="text-2xl font-heading font-bold text-white">5%</p>
                <p className="text-xs text-surface-muted mt-1">Platform Fee</p>
              </div>
              <div className="bg-navy-950 rounded-xl p-4 text-center">
                <p className="text-2xl font-heading font-bold text-emerald-400">75%</p>
                <p className="text-xs text-surface-muted mt-1">Hired Contractor Receives</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link href="/signup">
              <Button size="lg">Get Started <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
