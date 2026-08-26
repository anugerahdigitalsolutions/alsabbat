import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { SiteBackgroundLayers } from './SiteBackgroundLayers';
import { useSiteBackground } from '../../lib/siteBackground';
import { trackPageView } from '../../lib/analytics';

export const PublicLayout = () => {
  const { pathname } = useLocation();
  const background = useSiteBackground();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    trackPageView(pathname);
  }, [pathname]);

  return (
    <div className="als-shell-bg" data-testid="public-layout">
      <SiteBackgroundLayers config={background} />
      <div className="als-frame als-app relative" data-testid="public-frame">
        <PublicHeader />
        <main className="flex-1">
          <div key={pathname} className="als-page-enter" data-testid="public-page-transition">
            <Outlet />
          </div>
        </main>
        <PublicFooter />
      </div>
    </div>
  );
};

export default PublicLayout;
