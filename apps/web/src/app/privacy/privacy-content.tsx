'use client';
import { useT } from '../../i18n';

// Split out of page.tsx so the route keeps its server-side `metadata` export
// while the body text follows the visitor's selected language.
export function PrivacyContent() {
  const t = useT();
  const sections = [
    { h: t('privacy.h1'), p: t('privacy.p1') },
    { h: t('privacy.h2'), p: t('privacy.p2') },
    { h: t('privacy.h3'), p: t('privacy.p3') },
    { h: t('privacy.h4'), p: t('privacy.p4') },
    { h: t('privacy.h5'), p: t('privacy.p5') },
    { h: t('privacy.h6'), p: t('privacy.p6') },
    { h: t('privacy.h7'), p: t('privacy.p7') },
    { h: t('privacy.h8'), p: t('privacy.p8') },
    { h: t('privacy.h9'), p: t('privacy.p9') },
    { h: t('privacy.h10'), p: t('privacy.p10') },
  ];

  return (
    <article className="container-narrow px-4 prose prose-invert prose-amber max-w-3xl mx-auto">
      <h1 className="text-4xl font-heading font-bold text-white mb-2">{t('privacy.title')}</h1>
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
