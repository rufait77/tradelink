'use client';
import { Navbar } from '../../components/layout/navbar';
import { Footer } from '../../components/layout/footer';
import { motion, type Variants } from 'framer-motion';
import { Send, UserCheck, DollarSign, FileText, CreditCard, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../../components/ui/button';

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: 'easeOut' },
  }),
};

const STEPS = [
  {
    icon: FileText, step: '01', title: 'Create Your Account',
    desc: 'Sign up with your email, pay the one-time $29.99 signup fee, and verify your email address.',
    details: ['Complete contractor profile', 'Select your trade specialties', 'Set your service area'],
  },
  {
    icon: CreditCard, step: '02', title: 'Activate Subscription',
    desc: 'Subscribe for $9.99/month to unlock full access to the job board and referral platform.',
    details: ['Access entire job board', 'Post unlimited referrals', 'Connect your bank via Stripe'],
  },
  {
    icon: Send, step: '03', title: 'Post a Referral',
    desc: 'Got a lead you can\'t take? Post it with budget, trade type, location, and any client notes.',
    details: ['Set budget range', 'Choose trade category', 'Add client details'],
  },
  {
    icon: UserCheck, step: '04', title: 'Contractor Claims the Job',
    desc: 'A qualified contractor in the area sees your referral, claims it, and starts the work.',
    details: ['Verified contractors only', 'Real-time notifications', 'In-app messaging'],
  },
  {
    icon: DollarSign, step: '05', title: 'Get Paid Automatically',
    desc: 'When the job is marked complete, you receive a 20% commission deposited straight to your bank.',
    details: ['2-3 day bank deposit', 'Track all earnings', 'Commission history dashboard'],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20">
        <div className="container-wide px-4">
          <motion.div className="text-center mb-20" initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} custom={0} className="text-4xl sm:text-5xl font-heading font-bold text-white mb-4">
              How Tradelink Works
            </motion.h1>
            <motion.p variants={fadeUp} custom={1} className="text-lg text-surface-muted max-w-2xl mx-auto">
              From sign-up to payout in five simple steps
            </motion.p>
          </motion.div>

          <div className="space-y-8 max-w-3xl mx-auto">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  className="glass-card p-8 flex gap-6 hover-lift"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                  custom={i}
                >
                  <div className="shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                      <Icon className="w-7 h-7 text-navy-950" />
                    </div>
                    <p className="text-xs font-bold text-amber-500 text-center mt-2">{step.step}</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                    <p className="text-sm text-surface-muted mb-3 leading-relaxed">{step.desc}</p>
                    <ul className="space-y-1">
                      {step.details.map((d) => (
                        <li key={d} className="text-xs text-slate-400 flex items-center gap-2">
                          <span className="w-1 h-1 rounded-full bg-amber-500" /> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            className="text-center mt-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <Link href="/signup">
              <Button size="lg">Get Started Now <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
