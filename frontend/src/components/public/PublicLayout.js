import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { trackPageView } from '../../lib/analytics';

export const PublicLayout = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    trackPageView(pathname);
  }, [pathname]);

  return (
    <div className="als-shell-bg" data-testid="public-layout">
      <div className="als-frame als-app" data-testid="public-frame">
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
