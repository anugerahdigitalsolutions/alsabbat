import React from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Facebook,
  Globe,
  Handshake,
  Instagram,
  Mail,
  MapPin,
  Music2,
  Phone,
  Youtube,
} from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { Badge } from '../../components/ui/badge';
import { usePageSeo } from '../../hooks/usePageSeo';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';

const externalHref = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('@')) return null;
  return `https://${raw}`;
};

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'tiktok', label: 'TikTok', Icon: Music2 },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
];

const DetailRow = ({ Icon, label, value, href, testId }) => (
  <div className="flex items-start gap-3" data-testid={testId}>
    <span
      className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
      style={{ backgroundColor: 'rgba(1,40,145,0.07)', color: 'var(--club-secondary)' }}
    >
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted-fg)' }}>
        {label}
      </span>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="break-words text-sm font-semibold hover:underline"
          style={{ color: 'var(--club-secondary)' }}
        >
          {value}
        </a>
      ) : (
        <span className="block break-words text-sm">{value}</span>
      )}
    </span>
  </div>
);

export default function SponsorDetailPage() {
  const { sponsorId } = useParams();
  const [sponsor, setSponsor] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // `sponsorId` boleh slug baru ATAU id sponsor lama (backward compatible).
      const { data } = await api.get(`/sponsors/by-slug/${encodeURIComponent(sponsorId)}`);
      setSponsor(data);
    } catch (e) {
      setError(apiErrorMessage(e, 'Sponsor tidak ditemukan.'));
    } finally {
      setLoading(false);
    }
  }, [sponsorId]);

  React.useEffect(() => {
    load();
  }, [load]);

  usePageSeo({
    title: sponsor?.name ? `Sponsor ${sponsor.name}` : 'Profil Sponsor',
    description: sponsor?.description || 'Profil sponsor resmi AL SABBAT Football Club.',
    image: resolveMediaUrl(sponsor?.logo),
    path: `/sponsors/${sponsorId}`,
  });

  if (loading) {
    return (
      <div className="als-container py-12" data-testid="page-sponsor-detail">
        <LoadingState rows={4} testId="sponsor-detail-loading" />
      </div>
    );
  }

  if (error || !sponsor) {
    return (
      <div className="als-container py-12" data-testid="page-sponsor-detail">
        <ErrorState message={error || 'Sponsor tidak ditemukan.'} onRetry={load} testId="sponsor-detail-error" />
        <Link
          to="/sponsors"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--club-secondary)' }}
          data-testid="sponsor-detail-back-error"
        >
          <ArrowLeft className="h-4 w-4" />
          Semua sponsor
        </Link>
      </div>
    );
  }

  const contact = sponsor.contact || {};
  const social = sponsor.social_media || {};
  const websiteHref = externalHref(sponsor.website || social.website);
  const socialItems = SOCIALS.map(({ key, label, Icon }) => ({
    key,
    label,
    Icon,
    value: social[key],
    href: externalHref(social[key]),
  })).filter((item) => item.value);
  const hasDetails =
    websiteHref || contact.address || contact.phone || contact.whatsapp || contact.email || socialItems.length;

  return (
    <div data-testid="page-sponsor-detail">
      <section
        className="relative overflow-hidden py-12 sm:py-14"
        style={{ backgroundColor: 'var(--club-secondary)' }}
        data-testid="sponsor-detail-header"
      >
        <span className="als-stadium-glow absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="als-container relative flex flex-col gap-6 sm:flex-row sm:items-center">
          <div
            className="flex h-28 w-full max-w-[240px] shrink-0 items-center justify-center rounded-[var(--radius-md)] px-5 py-4"
            style={{ backgroundColor: 'var(--club-light)' }}
            data-testid="sponsor-detail-logo-frame"
          >
            {sponsor.logo ? (
              <img
                src={resolveMediaUrl(sponsor.logo)}
                alt={sponsor.name}
                className="max-h-20 w-auto max-w-full object-contain"
                data-testid="sponsor-detail-logo"
              />
            ) : (
              <Handshake className="h-8 w-8" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
            )}
          </div>
          <div className="min-w-0">
            <p
              className="font-display mb-2 text-xs font-semibold uppercase tracking-[0.22em]"
              style={{ color: 'var(--club-primary)' }}
            >
              Profil Sponsor
            </p>
            <h1
              className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
              style={{ color: 'var(--club-light)' }}
              data-testid="sponsor-detail-name"
            >
              {sponsor.name}
            </h1>
            {sponsor.tier ? (
              <Badge
                variant="outline"
                className="mt-3"
                style={{ backgroundColor: 'rgba(252,207,43,0.18)', borderColor: 'rgba(252,207,43,0.5)', color: 'var(--club-light)' }}
                data-testid="sponsor-detail-tier"
              >
                {sponsor.tier}
              </Badge>
            ) : null}
          </div>
        </div>
      </section>

      <div className="als-container py-10">
        <Link
          to="/sponsors"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold hover:underline"
          style={{ color: 'var(--club-secondary)' }}
          data-testid="sponsor-detail-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Semua sponsor
        </Link>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          <article className="als-card p-6 sm:p-7">
            <p className="als-section-label mb-3">Tentang Sponsor</p>
            {sponsor.description ? (
              <p className="als-prose whitespace-pre-line text-sm sm:text-base" data-testid="sponsor-detail-description">
                {sponsor.description}
              </p>
            ) : (
              <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="sponsor-detail-description-empty">
                Deskripsi sponsor belum tersedia.
              </p>
            )}
          </article>

          {hasDetails ? (
            <aside className="als-card space-y-5 p-6" data-testid="sponsor-detail-info">
              <p className="als-section-label">Informasi</p>
              {websiteHref ? (
                <DetailRow
                  Icon={Globe}
                  label="Website"
                  value={sponsor.website || social.website}
                  href={websiteHref}
                  testId="sponsor-detail-website"
                />
              ) : null}
              {contact.address ? (
                <DetailRow Icon={MapPin} label="Alamat" value={contact.address} testId="sponsor-detail-address" />
              ) : null}
              {contact.phone ? (
                <DetailRow
                  Icon={Phone}
                  label="Telepon"
                  value={contact.phone}
                  href={`tel:${String(contact.phone).replace(/\s+/g, '')}`}
                  testId="sponsor-detail-phone"
                />
              ) : null}
              {contact.email ? (
                <DetailRow
                  Icon={Mail}
                  label="Email"
                  value={contact.email}
                  href={`mailto:${contact.email}`}
                  testId="sponsor-detail-email"
                />
              ) : null}
              {socialItems.length ? (
                <div data-testid="sponsor-detail-socials">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted-fg)' }}>
                    Media Sosial
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {socialItems.map(({ key, label, Icon, value, href }) =>
                      href ? (
                        <a
                          key={key}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="als-focus inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                          style={{ backgroundColor: 'rgba(1,40,145,0.07)', color: 'var(--club-secondary)' }}
                          data-testid={`sponsor-detail-social-${key}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {label}
                        </a>
                      ) : (
                        <span
                          key={key}
                          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                          style={{ backgroundColor: 'rgba(1,40,145,0.07)', color: 'var(--club-secondary)' }}
                          data-testid={`sponsor-detail-social-${key}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {value}
                        </span>
                      )
                    )}
                  </div>
                </div>
              ) : null}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
