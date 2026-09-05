import React from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useClub } from '../../context/ClubContext';
import { useBaraya } from '../../context/BarayaAuthContext';
import { ClubCrestMark } from '../../components/shared/ClubCrestMark';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { BarayaTopBar } from './BarayaTopBar';
import { BarayaNotificationButton } from './BarayaNotificationButton';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 19) return 'Selamat Sore';
  return 'Selamat Malam';
};

const firstName = (customer) => {
  const name = customer?.full_name || customer?.name || '';
  return name.split(/\s+/)[0] || '';
};

/**
 * Home greeting header (reference screen 2).
 * Avatar = the Baraya profile photo when logged in, otherwise the official
 * club crest (which automatically uses `club.logo` once configured).
 */
export const BarayaGreetingHeader = ({ onSearch }) => {
  const { shortName } = useClub();
  const { customer, isBaraya } = useBaraya();
  const photo = resolveMediaUrl(customer?.photo_url);

  return (
    <BarayaTopBar
      testId="baraya-home-header"
      left={
        <Link to={isBaraya ? '/akun' : '/login'} className="flex min-w-0 items-center gap-3" data-testid="baraya-home-identity">
          {photo ? (
            <img src={photo} alt="" className="brz-avatar" style={{ width: 42, height: 42 }} />
          ) : (
            <span className="brz-avatar" style={{ width: 42, height: 42 }}>
              <ClubCrestMark size={42} onDark testId="baraya-home-crest" />
            </span>
          )}
          <span className="min-w-0">
            <span className="brz-clamp-1 block text-[15px] font-semibold leading-tight">
              {isBaraya ? greeting() : `Baraya ${shortName || 'AL SABBAT'}`}
            </span>
            <span className="brz-clamp-1 block text-[12px] leading-tight" style={{ color: 'var(--brz-text-muted)' }}>
              {isBaraya ? firstName(customer) || 'Baraya' : 'Masuk untuk pengalaman penuh'}
            </span>
          </span>
        </Link>
      }
      actions={
        <>
          <BarayaNotificationButton />
          <button
            type="button"
            className="brz-icon-btn"
            onClick={onSearch}
            aria-label="Cari"
            data-testid="baraya-home-search"
          >
            <Search size={18} aria-hidden="true" />
          </button>
        </>
      }
    />
  );
};

export default BarayaGreetingHeader;
