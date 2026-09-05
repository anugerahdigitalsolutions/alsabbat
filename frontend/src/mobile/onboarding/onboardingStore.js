/**
 * Onboarding / splash persistence for AL SABBAT.
 *
 * Browser storage only — no collection, no API, no backend (as specified).
 * All access is wrapped because Safari private mode can throw on access.
 */
const ONBOARDING_KEY = 'baraya.onboarding.v1';
const SPLASH_KEY = 'baraya.splash.session.v1';

const safeGet = (store, key) => {
  try {
    return window[store]?.getItem(key) ?? null;
  } catch (e) {
    return null;
  }
};

const safeSet = (store, key, value) => {
  try {
    window[store]?.setItem(key, value);
  } catch (e) {
    /* storage unavailable — onboarding simply shows again next time */
  }
};

/** Returning users never see the onboarding again. */
export const isOnboardingDone = () => safeGet('localStorage', ONBOARDING_KEY) === 'done';

export const completeOnboarding = () => safeSet('localStorage', ONBOARDING_KEY, 'done');

/** Splash shows once per browser session, not on every route change. */
export const isSplashSeen = () => safeGet('sessionStorage', SPLASH_KEY) === 'seen';

export const markSplashSeen = () => safeSet('sessionStorage', SPLASH_KEY, 'seen');

/** Exposed for manual QA: `window.__barayaResetOnboarding()`. */
export const resetOnboarding = () => {
  try {
    window.localStorage?.removeItem(ONBOARDING_KEY);
    window.sessionStorage?.removeItem(SPLASH_KEY);
  } catch (e) {
    /* noop */
  }
};
