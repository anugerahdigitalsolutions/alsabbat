import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useClub } from '../../context/ClubContext';
import { resolveMediaUrl } from '../public/gallery/mediaUtils';
import { useSiteText } from '../../lib/siteContent';

const formatJoined = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

const initials = (name) =>
  (name || 'B')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

/**
 * The one and only member card renderer (account page, member page, admin preview).
 * The QR only ever encodes the public verification URL — never tokens or credentials.
 */
export const MemberCard = React.forwardRef(({ card, design, testId = 'member-card' }, ref) => {
  const { clubName, shortName, club } = useClub();
  const t = useSiteText({ club: shortName || 'ALSABBAT' });
  const background = resolveMediaUrl(
    design?.background_url !== undefined ? design.background_url : t('member.card.background_url')
  );
  const cardLabel = t('member.card.label') || 'Kartu Member Digital';
  const tagline = t('member.card.tagline') || 'Satu Klub. Satu Tim.';
  const active = card?.status === 'ACTIVE';
  const verifyUrl = card?.member_code
    ? `${window.location.origin}/member/verifikasi/${card.member_code}`
    : '';
  const logo = resolveMediaUrl(club?.logo);

  return (
    <div
      ref={ref}
      className="als-card-enter relative w-full max-w-[440px] overflow-hidden rounded-[var(--radius-lg)] p-6 sm:p-7"
      style={{ backgroundColor: 'var(--club-secondary)', boxShadow: '0 24px 60px -28px rgba(1,40,145,0.65)' }}
      data-has-background={background ? 'true' : 'false'}
      data-testid={testId}
    >
      {background ? (
        <>
          <img
            src={background}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover"
            data-testid={`${testId}-background`}
          />
          <span
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(115deg, rgba(1,40,145,0.90) 0%, rgba(1,40,145,0.62) 46%, rgba(0,0,0,0.68) 100%)',
            }}
            aria-hidden="true"
          />
        </>
      ) : (
        <>
          <span className="als-pitch-lines absolute inset-0 opacity-60" aria-hidden="true" />
          <span
            className="absolute inset-0"
            style={{ background: 'radial-gradient(420px circle at 100% 0%, rgba(252,207,43,0.28), transparent 62%)' }}
            aria-hidden="true"
          />
        </>
      )}

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span
              className="font-display grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] text-sm font-extrabold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              aria-hidden="true"
            >
              {logo ? (
                <img src={logo} alt="" className="h-9 w-9 object-contain" />
              ) : (
                (shortName || 'ALS').slice(0, 3).toUpperCase()
              )}
            </span>
            <span className="min-w-0">
              <span
                className="font-display block text-[11px] font-extrabold uppercase tracking-[0.22em]"
                style={{ color: 'var(--club-primary)' }}
              >
                Baraya {shortName || 'ALSABBAT'}
              </span>
              <span className="block truncate text-[11px]" style={{ color: 'rgba(254,254,254,0.82)' }}>
                {cardLabel}
              </span>
            </span>
          </div>
          <span
            className="font-display shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider"
            style={
              active
                ? { backgroundColor: 'var(--club-primary)', color: '#000000' }
                : { backgroundColor: 'rgba(254,254,254,0.16)', color: '#FEFEFE' }
            }
            data-testid={`${testId}-status`}
          >
            {active ? 'Aktif' : 'Nonaktif'}
          </span>
        </div>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-[190px] items-center gap-4">
            {card?.photo_url ? (
              <img
                src={resolveMediaUrl(card.photo_url)}
                alt={card?.full_name || ''}
                className="h-20 w-20 shrink-0 rounded-[var(--radius-sm)] object-cover"
                style={{ border: '2px solid var(--club-primary)' }}
                data-testid={`${testId}-photo`}
              />
            ) : (
              <span
                className="font-display grid h-20 w-20 shrink-0 place-items-center rounded-[var(--radius-sm)] text-xl font-extrabold"
                style={{ backgroundColor: 'rgba(254,254,254,0.12)', color: 'var(--club-primary)', border: '2px solid rgba(252,207,43,0.5)' }}
                data-testid={`${testId}-initials`}
              >
                {initials(card?.full_name)}
              </span>
            )}
            <span className="min-w-0">
              <span
                className="font-display block truncate text-lg font-extrabold leading-tight sm:text-xl"
                style={{ color: 'var(--club-light)' }}
                data-testid={`${testId}-name`}
              >
                {card?.full_name || '—'}
              </span>
              <span
                className="mt-1 block whitespace-nowrap font-mono text-sm font-bold tracking-wider"
                style={{ color: 'var(--club-primary)' }}
                data-testid={`${testId}-number`}
              >
                {card?.member_number || '—'}
              </span>
              <span className="mt-1 block text-[11px]" style={{ color: 'rgba(254,254,254,0.82)' }}>
                Member sejak {formatJoined(card?.joined_at)}
              </span>
            </span>
          </div>

          <div className="ml-auto shrink-0 text-center">
            <span className="block rounded-[var(--radius-sm)] bg-white p-2" data-testid={`${testId}-qr`}>
              {verifyUrl ? (
                <QRCodeSVG value={verifyUrl} size={76} level="M" bgColor="#FEFEFE" fgColor="#012891" />
              ) : (
                <span className="block h-[76px] w-[76px]" />
              )}
            </span>
            <span className="mt-1.5 block text-[9px] uppercase tracking-wider" style={{ color: 'rgba(254,254,254,0.7)' }}>
              Pindai
            </span>
          </div>
        </div>

        <div
          className="mt-6 flex items-center justify-between gap-2 border-t pt-3 text-[10px] uppercase tracking-wider"
          style={{ borderColor: 'rgba(254,254,254,0.16)', color: 'rgba(254,254,254,0.66)' }}
        >
          <span className="truncate">{clubName || 'ALSABBAT Football Club'}</span>
          <span className="shrink-0">{tagline}</span>
        </div>
      </div>
    </div>
  );
});

MemberCard.displayName = 'MemberCard';

export default MemberCard;
