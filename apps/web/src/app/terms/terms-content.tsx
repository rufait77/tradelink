'use client';
import { useT } from '../../i18n';

// Split out of page.tsx so the route keeps its server-side `metadata` export
// while the body text follows the visitor's selected language.
export function TermsContent() {
  const t = useT();
  const sections = [
    { h: t('terms.h1'), p: t('terms.p1') },
    { h: t('terms.h2'), p: t('terms.p2') },
    { h: t('terms.h3'), p: t('terms.p3') },
    { h: t('terms.h4'), p: t('terms.p4') },
    { h: t('terms.h5'), p: t('terms.p5') },
    { h: t('terms.h6'), p: t('terms.p6') },
    { h: t('terms.h7'), p: t('terms.p7') },
    { h: t('terms.h8'), p: t('terms.p8') },
    { h: t('terms.h9'), p: t('terms.p9') },
    { h: t('terms.h10'), p: t('terms.p10') },
  ];

  return (
    <article className="container-narrow px-4 prose prose-invert prose-amber max-w-3xl mx-auto">
      <h1 className="text-4xl font-heading font-bold text-white mb-2">{t('terms.title')}</h1>
      <p className="text-surface-muted text-sm mb-8">{t('legal.lastUpdated')}</p>

      {sections.map((section) => (
        <div key={section.h}>
          <h2>{section.h}</h2>
          <p>{section.p}</p>
        </div>
      ))}
    </article>
  );
}
