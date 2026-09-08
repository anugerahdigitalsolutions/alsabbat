import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';
import { SiteBackgroundLayers } from './SiteBackgroundLayers';
import { useSiteBackground } from '../../lib/siteBackground';
import { trackPageView } from '../../lib/analytics';
import { useIsMobileViewport } from '../../mobile/hooks/useIsMobileViewport';
import { hasMobileScreen } from '../../mobile/shellPaths';
import { BarayaMobileShell } from '../../mobile/components/BarayaMobileShell';
import { BarayaAppBoot } from '../../mobile/onboarding/BarayaAppBoot';
import { useMaintenanceStatus } from '../../lib/maintenance';
import MaintenancePage from '../../pages/public/MaintenancePage';

export const PublicLayout = () => {
  const { pathname } = useLocation();
  const background = useSiteBackground();
  const isMobileViewport = useIsMobileViewport();
  // BARAYA AL SABBAT mobile experience: only below 768px AND only on routes
  // that already have a mobile screen. Everything else keeps the existing
  // desktop layout untouched on every viewport.
  const mobileMode = isMobileViewport && hasMobileScreen(pathname);
  // Saat background kustom aktif, paint default `.als-shell-bg` (warna abu +
  // radial-gradient) dimatikan agar pilihan Admin tidak tertimpa. Bila OFF,
  // background default AL SABBAT tetap dipakai sebagai fallback.
  const customBackground = !!background?.enabled;
  // Maintenance Mode global: hanya menutup area publik. Rute /admin tidak
  // melewati layout ini, jadi admin tetap bisa login & mematikan maintenance.
  const maintenance = useMaintenanceStatus();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    trackPageView(pathname);
  }, [pathname]);

  if (maintenance.loading) {
    return <div className="min-h-screen" style={{ backgroundColor: '#012891' }} data-testid="maintenance-loading" />;
  }

  if (maintenance.enabled) {
    return <MaintenancePage />;
  }

  if (mobileMode) {
    return (
      <BarayaMobileShell>
        <div key={pathname} className="brz-enter">
          <Outlet />
        </div>
        <BarayaAppBoot />
      </BarayaMobileShell>
    );
  }

  return (
    <div
      className="als-shell-bg"
      data-testid="public-layout"
      data-background={customBackground ? 'custom' : 'default'}
      style={customBackground ? { backgroundColor: 'transparent', backgroundImage: 'none' } : undefined}
    >
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
      {/* Splash/onboarding still applies to mobile visitors on routes that keep
          the desktop layout. Never rendered from 768px upwards. */}
      {isMobileViewport ? <BarayaAppBoot /> : null}
    </div>
  );
};

export default PublicLayout;
