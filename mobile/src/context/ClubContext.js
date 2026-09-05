/**
 * Club identity + public site content (crest, names, contact) from the
 * existing endpoints `/api/club/active` and `/api/site-content/public`.
 */
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

import * as endpoints from '../api/endpoints';
import { resolveMediaUrl } from '../api/client';

const ClubContext = createContext({ club: null, loading: true, siteContent: {} });

export function ClubProvider({ children }) {
  const [club, setClub] = useState(null);
  const [siteContent, setSiteContent] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [clubResult, contentResult] = await Promise.allSettled([
        endpoints.getActiveClub(),
        endpoints.getSiteContent(),
      ]);
      if (!alive) return;
      if (clubResult.status === 'fulfilled') {
        const payload = clubResult.value;
        setClub(payload?.club || payload || null);
      }
      if (contentResult.status === 'fulfilled') {
        const value = contentResult.value;
        setSiteContent(value?.items ? value.items : value || {});
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      club,
      siteContent,
      loading,
      clubName: club?.name || 'AL SABBAT Football Club',
      shortName: club?.short_name || 'AL SABBAT',
      clubLogo: resolveMediaUrl(club?.logo),
    }),
    [club, siteContent, loading]
  );

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

export const useClub = () => useContext(ClubContext);

export default ClubContext;
