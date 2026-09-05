import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useClub } from '../../context/ClubContext';
import { useBaraya } from '../../context/BarayaAuthContext';
import { BarayaSplashScreen } from './BarayaSplashScreen';
import { BarayaOnboarding } from './BarayaOnboarding';
import {
  completeOnboarding,
  isOnboardingDone,
  isSplashSeen,
  markSplashSeen,
  resetOnboarding,
} from './onboardingStore';
import '../theme/baraya.css';

const MIN_SPLASH_MS = 1200;
const MAX_SPLASH_MS = 2600;
const EXIT_MS = 420;

/**
 * Boots the BARAYA AL SABBAT mobile experience: splash → onboarding → app.
 *
 * Rules:
 *  - mobile viewports only (the caller mounts it only below 768px)
 *  - never inside the Admin Panel
 *  - never on the authentication callback route (OAuth must not be interrupted)
 *  - splash once per browser session, onboarding once per browser (localStorage)
 *  - already-authenticated Baraya accounts are not sent through onboarding
 */
export const BarayaAppBoot = () => {
  const { pathname } = useLocation();
  const { loading: clubLoading } = useClub();
  const { isBaraya, loading: authLoading } = useBaraya();

  const blocked = pathname.startsWith('/admin') || pathname.startsWith('/auth/');

  const [phase, setPhase] = useState(() => {
    if (typeof window === 'undefined') return 'done';
    return isSplashSeen() ? 'gate' : 'splash';
  });
  const [exiting, setExiting] = useState(false);

  // Expose a QA helper without touching production behaviour.
  useEffect(() => {
    window.__barayaResetOnboarding = () => {
      resetOnboarding();
      window.location.reload();
    };
    return () => {
      delete window.__barayaResetOnboarding;
    };
  }, []);

  // Splash: hold until the club configuration resolves, within sane bounds.
  useEffect(() => {
    if (phase !== 'splash' || blocked) return undefined;
    const startedAt = Date.now();
    let exitTimer = null;

    const leave = () => {
      setExiting(true);
      exitTimer = setTimeout(() => {
        markSplashSeen();
        setExiting(false);
        setPhase('gate');
      }, EXIT_MS);
    };

    const elapsed = Date.now() - startedAt;
    const ready = !clubLoading;
    const wait = ready ? Math.max(MIN_SPLASH_MS - elapsed, 0) : MAX_SPLASH_MS;
    const timer = setTimeout(leave, wait);

    return () => {
      clearTimeout(timer);
      if (exitTimer) clearTimeout(exitTimer);
    };
  }, [phase, clubLoading, blocked]);

  // Gate: decide between onboarding and the app.
  useEffect(() => {
    if (phase !== 'gate') return;
    if (authLoading) return;
    if (isOnboardingDone()) {
      setPhase('done');
      return;
    }
    if (isBaraya) {
      // Existing members are never forced through onboarding.
      completeOnboarding();
      setPhase('done');
      return;
    }
    setPhase('onboarding');
  }, [phase, authLoading, isBaraya]);

  const finishOnboarding = useCallback(() => {
    completeOnboarding();
    setPhase('done');
    // Stay on the route the visitor actually asked for (e.g. a shared /news/... link
    // or /login) — onboarding must never hijack navigation or authentication.
  }, []);

  if (blocked || phase === 'done' || phase === 'gate') return null;

  return (
    <div className="baraya-app brz-overlay-root" data-brz-palette="club" data-testid="baraya-app-boot">
      {phase === 'splash' ? <BarayaSplashScreen exiting={exiting} /> : null}
      {phase === 'onboarding' ? <BarayaOnboarding onFinish={finishOnboarding} /> : null}
    </div>
  );
};

export default BarayaAppBoot;
