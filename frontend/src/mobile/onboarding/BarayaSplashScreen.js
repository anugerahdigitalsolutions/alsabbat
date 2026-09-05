import React from 'react';
import { useClub } from '../../context/ClubContext';
import { brandText } from '../../lib/brand';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';

/** Official AL SABBAT crest bundled with the app (transparent, for dark UI). */
const OFFICIAL_LOGO = `${process.env.PUBLIC_URL || ''}/brand/alsabbat-logo-mark.png`;

/**
 * AL SABBAT mobile splash screen.
 *
 * Pure frontend — no backend endpoint, no database. Shows the logo uploaded in
 * the Admin Panel when `club.logo` is set, otherwise the official bundled crest.
 * The logo keeps its natural proportions (`object-fit: contain`) and is centred.
 */
export const BarayaSplashScreen = ({ exiting = false }) => {
  const { club, shortName } = useClub();
  const wordmark = brandText(shortName) || 'AL SABBAT';
  const logo = resolveMediaUrl(club?.logo) || OFFICIAL_LOGO;

  return (
    <div
      className={`brz-splash${exiting ? ' brz-splash--exit' : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Memuat ${wordmark}`}
      data-testid="baraya-splash"
    >
      <span className="brz-splash-glow" aria-hidden="true" />

      <div className="brz-splash-body">
        <span className="brz-splash-crest">
          <img
            src={logo}
            alt={`Logo ${wordmark}`}
            className="brz-splash-logo"
            data-testid="baraya-splash-crest"
          />
        </span>

        <div className="brz-splash-word">
          <span className="brz-splash-title" data-testid="baraya-splash-title">
            {wordmark}
          </span>
          <span className="brz-splash-sub">Football Club</span>
        </div>
      </div>

      <div className="brz-splash-footer">
        <span className="brz-splash-bar" aria-hidden="true">
          <span className="brz-splash-bar-fill" />
        </span>
        <span className="brz-splash-tag">Satu Klub. Satu Semangat.</span>
      </div>
    </div>
  );
};

export default BarayaSplashScreen;
