import React from 'react';
import { useClub } from '../../context/ClubContext';
import { brandText } from '../../lib/brand';
import { ClubCrestMark } from '../../components/shared/ClubCrestMark';

/**
 * AL SABBAT mobile splash screen.
 *
 * Pure frontend — no backend endpoint, no database. The crest comes from
 * `ClubCrestMark`, which automatically switches to the official uploaded logo
 * as soon as `club.logo` is configured in the Admin Panel.
 */
export const BarayaSplashScreen = ({ exiting = false }) => {
  const { shortName } = useClub();
  const wordmark = brandText(shortName) || 'AL SABBAT';

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
          <ClubCrestMark size={92} onDark testId="baraya-splash-crest" />
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
