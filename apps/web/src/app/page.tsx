'use client';
import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import { Navbar } from '../components/layout/navbar';
import { Footer } from '../components/layout/footer';
import { Button } from '../components/ui/button';
import {
  Zap, ArrowRight, Send, UserCheck, DollarSign,
  Shield, Clock, TrendingUp, Wrench, ChevronDown,
} from 'lucide-react';
import { useState } from 'react';

const TRADE_CATEGORIES = [
  { name: 'Landscaping', icon: '🌿' },
  { name: 'Roofing', icon: '🏠' },
  { name: 'HVAC', icon: '❄️' },
  { name: 'Plumbing', icon: '🔧' },
  { name: 'Electrical', icon: '⚡' },
  { name: 'Painting', icon: '🎨' },
  { name: 'Carpentry', icon: '🪚' },
  { name: 'Flooring', icon: '🪵' },
  { name: 'Pressure Washing', icon: '💦' },
  { name: 'Junk Removal', icon: '🚛' },
  { name: 'Window Installation', icon: '🪟' },
  { name: 'Siding', icon: '🏗️' },
  { name: 'Masonry', icon: '🧱' },
  { name: 'Clearing', icon: '🌲' },
];

const FEATURES = [
  { icon: Shield, title: 'Secure Payments', desc: 'Stripe-powered escrow ensures you always get paid for completed work.' },
  { icon: Clock, title: 'Quick Payouts', desc: 'Commissions deposited directly to your bank within 2-3 business days.' },
  { icon: TrendingUp, title: 'Passive Income', desc: 'Earn 20% on jobs you refer — even while you sleep.' },
  { icon: Wrench, title: 'All Trades Welcome', desc: 'From HVAC to landscaping — every licensed contractor can join.' },
];

const FAQ = [
  { q: 'How does the referral commission work?', a: 'When you refer a job and another contractor completes it, you earn 20% of the job\'s total value. Payment is processed automatically through Stripe.' },
  { q: 'What does it cost to join?', a: 'There is a one-time signup fee of $29.99 plus a monthly subscription of $9.99 to access the full platform.' },
  { q: 'How do I get paid?', a: 'Commissions are deposited directly into your bank account via Stripe Connect within 2-3 business days of job completion.' },
  { q: 'What trades are supported?', a: 'We support all major trade categories including Landscaping, Roofing, HVAC, Plumbing, Electrical, Painting, Carpentry, Flooring, Masonry, Cleaning, Pressure Washing, Junk Removal, Window Installation, Siding, Clearing, and General Contracting.' },
  { q: 'Can I both refer and claim jobs?', a: 'Absolutely! You can post referral jobs for leads you can\'t handle, and claim jobs from other contractors that match your skills.' },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
};

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <TradeShowcase />
        <FeaturesSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background glow */}
      <div className="absolute inset-0 bg-hero-glow" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/5 blur-[120px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            The Contractor Referral Platform
          </div>
        </motion.div>

        <motion.h1
          className="text-4xl sm:text-5xl md:text-7xl font-heading font-extrabold text-white leading-tight tracking-tight mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
        >
          Refer a Job.{' '}
          <span className="gradient-text">Earn 20%</span>{' '}
          Commission.
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl text-surface-muted max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          Turn every lead you can&apos;t handle into cash. Post a referral, let another contractor complete the job, and get paid automatically.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          <Link href="/signup">
            <Button size="lg">
              Start Earning Today <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button variant="outline" size="lg">See How It Works</Button>
          </Link>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
        >
          {[
            { value: '20%', label: 'Commission Rate' },
            { value: '$29.99', label: 'One-Time Signup' },
            { value: '10+', label: 'Trade Categories' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-heading font-bold gradient-text">{stat.value}</p>
              <p className="text-xs text-surface-muted mt-1">{stat.label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { icon: Send, title: 'Post a Referral', desc: 'Got a lead you can\'t take? Post it as a referral with budget, trade type, and location.' },
    { icon: UserCheck, title: 'Another Contractor Claims It', desc: 'A qualified contractor in the right area claims the job and completes the work.' },
    { icon: DollarSign, title: 'You Get Paid', desc: 'Once the job is marked complete, you earn a 20% commission — deposited directly to your bank.' },
  ];

  return (
    <section className="section bg-navy-950">
      <div className="container-wide">
        <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            How It Works
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-surface-muted max-w-2xl mx-auto">
            Three simple steps to start earning commissions on referrals
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.title}
                className="glass-card p-8 text-center hover-lift"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center mx-auto mb-5">
                  <Icon className="w-7 h-7 text-navy-950" />
                </div>
                <div className="text-xs font-bold text-amber-500 mb-2">Step {i + 1}</div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-sm text-surface-muted leading-relaxed">{step.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function TradeShowcase() {
  return (
    <section className="section bg-navy-900/50">
      <div className="container-wide">
        <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            All Trades, One Platform
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-surface-muted max-w-2xl mx-auto">
            Whatever your trade, Tradelink has referral opportunities waiting
          </motion.p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {TRADE_CATEGORIES.map((trade, i) => (
            <motion.div
              key={trade.name}
              className="glass-card p-5 text-center hover-lift cursor-pointer"
              variants={fadeUp}
              custom={i}
            >
              <span className="text-3xl mb-3 block">{trade.icon}</span>
              <p className="text-sm font-medium text-slate-200">{trade.name}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  return (
    <section className="section bg-navy-950">
      <div className="container-wide">
        <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            Built for Contractors
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-surface-muted max-w-2xl mx-auto">
            Everything you need to monetize your network
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map((feat, i) => {
            const Icon = feat.icon;
            return (
              <motion.div
                key={feat.title}
                className="glass-card p-8 flex gap-5 hover-lift"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
              >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Icon className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">{feat.title}</h3>
                  <p className="text-sm text-surface-muted leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="section bg-navy-900/50">
      <div className="container-narrow">
        <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            Frequently Asked Questions
          </motion.h2>
        </motion.div>

        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <motion.div
              key={i}
              className="glass-card overflow-hidden"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
            >
              <button
                className="w-full flex items-center justify-between p-5 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <span className="text-sm font-medium text-slate-200 pr-4">{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-surface-muted shrink-0 transition-transform ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-surface-muted leading-relaxed">{item.a}</p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="section">
      <motion.div
        className="container-narrow"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7 }}
      >
        <div className="glass-card p-12 sm:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
              Ready to Start Earning?
            </h2>
            <p className="text-surface-muted max-w-lg mx-auto mb-8">
              Join Tradelink today and turn every lead you can&apos;t handle into passive income.
            </p>
            <Link href="/signup">
              <Button size="lg">
                Create Your Account <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
