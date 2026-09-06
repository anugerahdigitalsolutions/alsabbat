import React from 'react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { usePageSeo } from '../../hooks/usePageSeo';
import { LEGAL_UPDATED_AT } from '../../lib/legalContent';

/** Halaman dokumen legal publik (Syarat & Ketentuan / Kebijakan Privasi). */
export const LegalDocumentPage = ({ doc, path, testId }) => {
  usePageSeo({
    title: doc.title,
    description: doc.intro,
    path,
  });

  return (
    <div data-testid={testId}>
      <PublicPageHeader
        label="Legal"
        title={doc.heading}
        description={`Terakhir diperbarui: ${LEGAL_UPDATED_AT}`}
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: doc.title }]}
      />
      <div className="als-container py-10">
        <div className="als-card mx-auto max-w-3xl p-6 sm:p-8">
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            {doc.intro}
          </p>
          <div className="mt-8 space-y-8">
            {doc.sections.map((section) => (
              <section key={section.title} data-testid={`legal-section-${section.title.split('.')[0]}`}>
                <h2 className="font-display text-base font-bold">{section.title}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                    {paragraph}
                  </p>
                ))}
                {section.bullets ? (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                    {section.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalDocumentPage;
