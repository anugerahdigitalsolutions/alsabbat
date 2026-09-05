import React from 'react';
import { useClub } from '../../context/ClubContext';
import { ClubCrestMark } from '../../components/shared/ClubCrestMark';

/**
 * BARAYA AL SABBAT splash screen.
 *
 * Pure frontend — no backend endpoint, no database. The crest comes from
 * `ClubCrestMark`, which automatically switches to the official uploaded logo
 * as soon as `club.logo` is configured in the Admin Panel.
 */
export const BarayaSplashScreen = ({ exiting = false }) => {
  const { shortName } = useClub();

  return (
    <div
      className={`brz-splash${exiting ? ' brz-splash--exit' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Memuat Baraya AL SABBAT"
      data-testid="baraya-splash"
    >
      <span className="brz-splash-glow" aria-hidden="true" />

      <div className="brz-splash-body">
        <span className="brz-splash-crest">
          <ClubCrestMark size={92} onDark testId="baraya-splash-crest" />
        </span>

        <div className="brz-splash-word">
          <span className="brz-splash-kicker">BARAYA</span>
          <span className="brz-splash-title">{shortName || 'AL SABBAT'}</span>
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
