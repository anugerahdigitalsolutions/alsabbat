import React from 'react';
import { Globe, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { useClub } from '../../context/ClubContext';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useSiteText } from '../../lib/siteContent';

export default function ContactPage() {
  const { club, clubName, shortName, loading, error, reload } = useClub();
  const t = useSiteText({ club: shortName || clubName || 'AL SABBAT' });
  usePageSeo({ title: 'Kontak', description: `Informasi kontak resmi ${clubName}.`, path: '/contact' });

  const contact = club?.contact || {};
  const social = club?.social_media || {};

  const rows = [
    { id: 'address', label: 'Alamat', value: contact.address || club?.location, Icon: MapPin },
    { id: 'email', label: 'Email', value: contact.email, Icon: Mail, href: contact.email ? `mailto:${contact.email}` : null },
    { id: 'phone', label: 'Telepon', value: contact.phone, Icon: Phone, href: contact.phone ? `tel:${contact.phone}` : null },
    { id: 'whatsapp', label: 'WhatsApp', value: contact.whatsapp, Icon: MessageCircle },
    { id: 'website', label: 'Website Resmi', value: club?.official_website, Icon: Globe, href: club?.official_website },
  ];

  return (
    <div data-testid="page-contact">
      <PublicPageHeader
        label={t('contact.header.label')}
        title={t('contact.header.title')}
        description={t('contact.header.description')}
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: t('contact.header.label') }]}
      />
      <div className="als-container py-10">
        {loading ? (
          <LoadingState variant="text" testId="contact-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testId="contact-error" />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="als-card p-6">
              <h2 className="font-display mb-5 text-lg font-bold">{t('contact.info.title')}</h2>
              <ul className="space-y-4">
                {rows.map(({ id, label, value, Icon, href }) => (
                  <li key={id} className="flex items-start gap-3" data-testid={`contact-${id}`}>
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                      style={{ backgroundColor: 'rgba(1,40,145,0.07)' }}
                    >
                      <Icon className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                        {label}
                      </p>
                      {value ? (
                        href ? (
                          <a href={href} className="break-words text-sm font-semibold underline" style={{ color: 'var(--club-secondary)' }}>
                            {value}
                          </a>
                        ) : (
                          <p className="break-words text-sm font-semibold">{value}</p>
                        )
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                          Belum diatur
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="als-card p-6">
              <h2 className="font-display mb-5 text-lg font-bold">{t('contact.social.title')}</h2>
              <div className="flex flex-wrap gap-2" data-testid="contact-social">
                {Object.entries(social).filter(([, v]) => !!v).length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="contact-social-empty">
                    Tautan media sosial belum diatur.
                  </p>
                ) : (
                  Object.entries(social)
                    .filter(([, v]) => !!v)
                    .map(([key, value]) => (
                      <a
                        key={key}
                        href={value}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full px-4 py-2 text-xs font-semibold capitalize"
                        style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                        data-testid={`contact-social-${key}`}
                      >
                        {key}
                      </a>
                    ))
                )}
              </div>
              <p className="mt-6 text-xs" style={{ color: 'var(--muted-fg)' }}>
                {t('contact.note')}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
