import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Globe, Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { ClubCrestMark } from '../shared/ClubCrestMark';
import { useClub } from '../../context/ClubContext';
import { PUBLIC_NAV } from './PublicHeader';
import { useBaraya } from '../../context/BarayaAuthContext';
const SOCIALS = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
  { key: 'website', label: 'Website', Icon: Globe },
];

const GooglePlayGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0" aria-hidden="true">
    <path d="M3.7 2.2 14 12 3.7 21.8A1.8 1.8 0 0 1 3 20.4V3.6c0-.55.27-1.06.7-1.4Z" fill="#00D2FF" />
    <path d="M16.6 9.2 14 12 4.1 2.1l.35-.2L16.6 9.2Z" fill="#00F076" />
    <path d="M16.6 14.8 4.45 22.1l-.35-.2L14 12l2.6 2.8Z" fill="#FF3A44" />
    <path d="M20.7 10.7c1.07.62 1.07 2 0 2.62L16.6 15.7 14 12l2.6-3.7 4.1 2.4Z" fill="#FFCE00" />
  </svg>
);

const AppleGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0" fill="#FFFFFF" aria-hidden="true">
    <path d="M16.4 12.7c0-2.2 1.8-3.25 1.88-3.3-1.03-1.5-2.62-1.7-3.18-1.72-1.34-.1-2.6.78-3.28.78-.68 0-1.72-.76-2.83-.74-1.45.02-2.8.85-3.54 2.15-1.5 2.62-.38 6.5 1.09 8.63.72 1.04 1.58 2.2 2.71 2.16 1.09-.04 1.5-.7 2.81-.7 1.31 0 1.68.7 2.82.68 1.16-.02 1.9-1.05 2.61-2.1.82-1.2 1.16-2.36 1.18-2.42-.03-.01-2.27-.87-2.27-3.42Z" />
    <path d="M14.62 6.2c.58-.7.96-1.68.86-2.65-.85.04-1.88.57-2.49 1.28-.54.63-1.01 1.63-.88 2.59.95.07 1.93-.48 2.51-1.22Z" />
  </svg>
);

/** Badge store resmi bergaya HITAM (teks putih), proporsi tetap, tidak terdistorsi. */
const StoreBadge = ({ href, glyph, caption, name, testId }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="als-focus inline-flex h-[48px] w-[152px] shrink-0 items-center gap-2.5 px-3 transition-transform duration-200 hover:-translate-y-px"
    style={{
      backgroundColor: '#000000',
      border: '1px solid rgba(254,254,254,0.45)',
      borderRadius: '8px',
      boxShadow: '0 10px 20px -16px rgba(0,0,0,0.9)',
    }}
    data-testid={testId}
  >
    {glyph}
    <span className="flex flex-col items-start leading-none">
      <span
        className="text-[8px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: 'rgba(255,255,255,0.78)' }}
      >
        {caption}
      </span>
      <span className="font-display mt-[3px] text-[12.5px] font-bold" style={{ color: '#FFFFFF' }}>
        {name}
      </span>
    </span>
  </a>
);

export const PublicFooter = () => {
  const { club, clubName } = useClub();
  const social = club?.social_media || {};
  const contact = club?.contact || {};
  // Fase 4A — tautan Galeri hanya untuk Pemain & Staf.
  const { canViewGallery } = useBaraya();
  const footerNav = PUBLIC_NAV.filter((item) => item.id !== 'gallery' || canViewGallery);
  // Fase 4 — ikon toko aplikasi hanya tampil bila diaktifkan Admin DAN URL https terisi.
  const safeStoreUrl = (value) =>
    typeof value === 'string' && /^https:\/\/[^\s]+$/i.test(value.trim()) ? value.trim() : '';
  const playstoreUrl = club?.app_playstore_enabled ? safeStoreUrl(club?.app_playstore_url) : '';
  const appstoreUrl = club?.app_appstore_enabled ? safeStoreUrl(club?.app_appstore_url) : '';

  return (
    <footer
      className="mt-6"
      style={{ backgroundColor: 'var(--club-light)', color: 'var(--fg)', borderTop: '1px solid var(--border-soft)' }}
      data-testid="public-footer"
    >
      <div className="als-frame-inner grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ClubCrestMark size={44} testId="footer-crest" />
            <span className="font-display text-base font-extrabold" style={{ color: 'var(--club-secondary)' }}>
              {clubName}
            </span>
          </div>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            {club?.description || 'Platform digital resmi klub sepak bola AL SABBAT.'}
          </p>
        </div>

        <div>
          <h4 className="font-display mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--club-secondary)' }}>
            Tautan Cepat
          </h4>
          <div className="grid grid-cols-2 gap-x-4">
            <ul className="space-y-2">
              {footerNav.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    className="text-sm transition-colors duration-200 hover:text-[color:var(--club-secondary)]"
                    style={{ color: 'var(--muted-fg)' }}
                    data-testid={`footer-nav-${item.id}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="space-y-2">
              {footerNav.slice(5).map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.to}
                    className="text-sm transition-colors duration-200 hover:text-[color:var(--club-secondary)]"
                    style={{ color: 'var(--muted-fg)' }}
                    data-testid={`footer-nav-${item.id}`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h4 className="font-display mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--club-secondary)' }}>
            Hubungi Kami
          </h4>
          <ul className="space-y-3 text-sm" style={{ color: 'var(--muted-fg)' }}>
            <li className="flex items-start gap-2" data-testid="footer-contact-location">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--club-secondary)' }} />
              <span>{club?.location || contact.address || 'Lokasi belum diatur'}</span>
            </li>
            <li className="flex items-start gap-2" data-testid="footer-contact-email">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--club-secondary)' }} />
              <span>{contact.email || 'Email belum diatur'}</span>
            </li>
            <li className="flex items-start gap-2" data-testid="footer-contact-phone">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--club-secondary)' }} />
              <span>{contact.phone || 'Telepon belum diatur'}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--club-secondary)' }}>
            Ikuti Kami
          </h4>
          <div className="flex flex-wrap gap-2" data-testid="footer-social-links">
            {SOCIALS.filter((s) => social[s.key]).map(({ key, label, Icon }) => (
              <a
                key={key}
                href={social[key]}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)] transition-colors"
                style={{ backgroundColor: 'rgba(1,40,145,0.07)', color: 'var(--club-secondary)' }}
                data-testid={`footer-social-${key}`}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
            {SOCIALS.every((s) => !social[s.key]) ? (
              <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="footer-social-empty">
                Tautan media sosial belum diatur.
              </p>
            ) : null}
          </div>

          {/* Badge aplikasi — tampil hanya bila dikonfigurasi di Admin → Media Sosial. */}
          {playstoreUrl || appstoreUrl ? (
            <div className="mt-5">
              <p
                className="font-display mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
                style={{ color: 'rgba(0,0,0,0.45)' }}
              >
                Aplikasi
              </p>
              <div className="flex flex-wrap gap-2" data-testid="footer-app-badges">
                {playstoreUrl ? (
                  <StoreBadge
                    href={playstoreUrl}
                    glyph={<GooglePlayGlyph />}
                    caption="Unduh di"
                    name="Google Play"
                    testId="footer-app-badge-google-play"
                  />
                ) : null}
                {appstoreUrl ? (
                  <StoreBadge
                    href={appstoreUrl}
                    glyph={<AppleGlyph />}
                    caption="Unduh di"
                    name="App Store"
                    testId="footer-app-badge-app-store"
                  />
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border-soft)' }}>
        <div className="als-frame-inner flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span style={{ color: 'var(--muted-fg)' }}>
            &copy; {new Date().getFullYear()} {clubName}. Seluruh hak cipta dilindungi.
          </span>
          <Link
            to="/admin/login"
            className="transition-colors duration-200 hover:text-[color:var(--club-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ color: 'rgba(0,0,0,0.38)', '--tw-ring-color': 'var(--focus-ring)' }}
            data-testid="footer-staff-access"
          >
            Staff Access
          </Link>
        </div>
      </div>

    </footer>
  );
};

export default PublicFooter;
