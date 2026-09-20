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
import { usePlatformSettings } from '../lib/useSettings';
import { MockDashboardSection } from '../components/landing/mock-dashboard-section';
import { useT, type TranslateFn } from '../i18n';

const TRADE_CATEGORIES = [
  { key: 'trade.Landscaping', icon: '🌿' },
  { key: 'trade.Roofing', icon: '🏠' },
  { key: 'trade.HVAC', icon: '❄️' },
  { key: 'trade.Plumbing', icon: '🔧' },
  { key: 'trade.Electrical', icon: '⚡' },
  { key: 'trade.Painting', icon: '🎨' },
  { key: 'trade.Carpentry', icon: '🪚' },
  { key: 'trade.Flooring', icon: '🪵' },
  { key: 'trade.PressureWashing', icon: '💦' },
  { key: 'trade.JunkRemoval', icon: '🚛' },
  { key: 'trade.WindowInstallation', icon: '🪟' },
  { key: 'trade.Siding', icon: '🏗️' },
  { key: 'trade.Masonry', icon: '🧱' },
  { key: 'trade.Clearing', icon: '🌲' },
  { key: 'trade.Welding', icon: '🔥' },
  { key: 'trade.Drywall', icon: '🪨' },
  { key: 'trade.Barber', icon: '💈' },
  { key: 'trade.Cosmetology', icon: '💅' },
  { key: 'trade.Esthetician', icon: '✨' },
  { key: 'trade.AutoMechanics', icon: '🔧' },
] as const;

function getFeatures(t: TranslateFn, commissionPct: number) {
  return [
    { icon: Shield, title: t('home.features.secure.title'), desc: t('home.features.secure.desc') },
    { icon: Clock, title: t('home.features.payouts.title'), desc: t('home.features.payouts.desc') },
    { icon: TrendingUp, title: t('home.features.passive.title'), desc: t('home.features.passive.desc', { pct: commissionPct }) },
    { icon: Wrench, title: t('home.features.trades.title'), desc: t('home.features.trades.desc') },
  ];
}

function getFAQ(t: TranslateFn, commissionPct: number, signupFee: string, subscriptionFee: string) {
  return [
    { q: t('home.faq.commission.q'), a: t('home.faq.commission.a', { pct: commissionPct }) },
    { q: t('home.faq.cost.q'), a: t('home.faq.cost.a', { signupFee, subscriptionFee }) },
    { q: t('home.faq.paid.q'), a: t('home.faq.paid.a') },
    { q: t('home.faq.trades.q'), a: t('home.faq.trades.a') },
    { q: t('home.faq.both.q'), a: t('home.faq.both.a') },
  ];
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' },
  }),
};

export default function HomePage() {
  const { commissionPct, signupFee, subscriptionFee } = usePlatformSettings();
  return (
    <>
      <Navbar />
      <main>
        <HeroSection commission={commissionPct} signupFee={signupFee} />
        <HowItWorksSection commission={commissionPct} />
        <MockDashboardSection />
        <TradeShowcase />
        <FeaturesSection commission={commissionPct} />
        <FAQSection commission={commissionPct} signupFee={signupFee} subscriptionFee={subscriptionFee} />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

function HeroSection({ commission, signupFee }: { commission: number; signupFee: string }) {
  const t = useT();
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
            {t('home.badge')}
          </div>
        </motion.div>

        <motion.h1
          className="text-4xl sm:text-5xl md:text-7xl font-heading font-extrabold text-white leading-tight tracking-tight mb-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.7 }}
        >
          {t('home.hero.titleLead')}{' '}
          <span className="gradient-text">{t('home.hero.titleAccent', { pct: commission })}</span>{' '}
          {t('home.hero.titleTrail')}
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl text-surface-muted max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
        >
          {t('home.hero.subtitle')}
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.6 }}
        >
          <Link href="/signup">
            <Button size="lg">
              {t('home.hero.ctaPrimary')} <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/how-it-works">
            <Button variant="outline" size="lg">{t('home.hero.ctaSecondary')}</Button>
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
            { value: `${commission}%`, label: t('home.hero.stat.commission') },
            { value: `$${signupFee}`, label: t('home.hero.stat.signup') },
            { value: '10+', label: t('home.hero.stat.trades') },
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

function HowItWorksSection({ commission }: { commission: number }) {
  const t = useT();
  const steps = [
    { icon: Send, title: t('home.steps.post.title'), desc: t('home.steps.post.desc') },
    { icon: UserCheck, title: t('home.steps.claim.title'), desc: t('home.steps.claim.desc') },
    { icon: DollarSign, title: t('home.steps.paid.title'), desc: t('home.steps.paid.desc', { pct: commission }) },
  ];

  return (
    <section className="section bg-navy-950">
      <div className="container-wide">
        <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            {t('home.steps.title')}
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-surface-muted max-w-2xl mx-auto">
            {t('home.steps.subtitle')}
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
                <div className="text-xs font-bold text-amber-500 mb-2">{t('home.steps.label', { n: i + 1 })}</div>
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
  const t = useT();
  return (
    <section className="section bg-navy-900/50">
      <div className="container-wide">
        <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            {t('home.trades.title')}
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-surface-muted max-w-2xl mx-auto">
            {t('home.trades.subtitle')}
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
              key={trade.key}
              className="glass-card p-5 text-center hover-lift cursor-pointer"
              variants={fadeUp}
              custom={i}
            >
              <span className="text-3xl mb-3 block">{trade.icon}</span>
              <p className="text-sm font-medium text-slate-200">{t(trade.key)}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function FeaturesSection({ commission }: { commission: number }) {
  const t = useT();
  return (
    <section className="section bg-navy-950">
      <div className="container-wide">
        <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            {t('home.features.title')}
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-surface-muted max-w-2xl mx-auto">
            {t('home.features.subtitle')}
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {getFeatures(t, commission).map((feat, i) => {
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

function FAQSection({ commission, signupFee, subscriptionFee }: { commission: number; signupFee: string; subscriptionFee: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const t = useT();

  return (
    <section className="section bg-navy-900/50">
      <div className="container-narrow">
        <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-heading font-bold text-white mb-4">
            {t('home.faq.title')}
          </motion.h2>
        </motion.div>

        <div className="space-y-3">
          {getFAQ(t, commission, signupFee, subscriptionFee).map((item, i) => (
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
  const t = useT();
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
              {t('home.cta.title')}
            </h2>
            <p className="text-surface-muted max-w-lg mx-auto mb-8">
              {t('home.cta.subtitle')}
            </p>
            <Link href="/signup">
              <Button size="lg">
                {t('home.cta.button')} <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
