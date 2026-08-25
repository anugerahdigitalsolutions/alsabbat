import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Globe, Instagram, Mail, MapPin, Phone, Youtube } from 'lucide-react';
import { ClubCrestMark } from '../shared/ClubCrestMark';
import { useClub } from '../../context/ClubContext';
import { PUBLIC_NAV } from './PublicHeader';

const SOCIALS = [
  { key: 'instagram', label: 'Instagram', Icon: Instagram },
  { key: 'facebook', label: 'Facebook', Icon: Facebook },
  { key: 'youtube', label: 'YouTube', Icon: Youtube },
  { key: 'website', label: 'Website', Icon: Globe },
];

export const PublicFooter = () => {
  const { club, clubName } = useClub();
  const social = club?.social_media || {};
  const contact = club?.contact || {};

  return (
    <footer
      className="mt-16 als-pitch-lines"
      style={{ backgroundColor: 'var(--club-tertiary)', color: 'var(--club-light)' }}
      data-testid="public-footer"
    >
      <div className="als-container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <ClubCrestMark size={44} onDark testId="footer-crest" />
            <span className="font-display text-base font-bold">{clubName}</span>
          </div>
          <p className="text-sm" style={{ color: 'rgba(254,254,254,0.72)' }}>
            {club?.description || 'Platform digital resmi klub sepak bola ALSABBAT.'}
          </p>
        </div>

        <div>
          <h4 className="font-display mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--club-primary)' }}>
            Navigasi
          </h4>
          <ul className="space-y-2">
            {PUBLIC_NAV.slice(0, 6).map((item) => (
              <li key={item.id}>
                <Link
                  to={item.to}
                  className="text-sm transition-colors hover:text-[color:var(--club-primary)]"
                  style={{ color: 'rgba(254,254,254,0.78)' }}
                  data-testid={`footer-nav-${item.id}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="font-display mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--club-primary)' }}>
            Kontak
          </h4>
          <ul className="space-y-3 text-sm" style={{ color: 'rgba(254,254,254,0.78)' }}>
            <li className="flex items-start gap-2" data-testid="footer-contact-location">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--club-primary)' }} />
              <span>{club?.location || contact.address || 'Lokasi belum diatur'}</span>
            </li>
            <li className="flex items-start gap-2" data-testid="footer-contact-email">
              <Mail className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--club-primary)' }} />
              <span>{contact.email || 'Email belum diatur'}</span>
            </li>
            <li className="flex items-start gap-2" data-testid="footer-contact-phone">
              <Phone className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--club-primary)' }} />
              <span>{contact.phone || 'Telepon belum diatur'}</span>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-display mb-4 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: 'var(--club-primary)' }}>
            Media Sosial
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
                style={{ backgroundColor: 'rgba(254,254,254,0.10)', color: 'var(--club-light)' }}
                data-testid={`footer-social-${key}`}
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
            {SOCIALS.every((s) => !social[s.key]) ? (
              <p className="text-sm" style={{ color: 'rgba(254,254,254,0.6)' }} data-testid="footer-social-empty">
                Tautan media sosial belum diatur.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(254,254,254,0.12)' }}>
        <div className="als-container flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <span style={{ color: 'rgba(254,254,254,0.6)' }}>
            &copy; {new Date().getFullYear()} {clubName}. Seluruh hak cipta dilindungi.
          </span>
          <Link
            to="/admin/login"
            className="transition-colors duration-200 hover:text-[color:var(--club-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ color: 'rgba(254,254,254,0.42)', '--tw-ring-color': 'var(--focus-ring)' }}
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
