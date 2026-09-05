import { matchPath } from 'react-router-dom';

/**
 * Routes that have a AL SABBAT mobile screen.
 *
 * Only these paths swap to the mobile shell (top bar + bottom nav) below
 * 768px. Every other public route keeps the existing desktop PublicLayout on
 * all viewports, so nothing that has not been redesigned yet can break.
 *
 * The list grows one phase at a time.
 */
export const MOBILE_SHELL_PATHS = [
  '/', // Home
  '/matches', // Match
  '/matches/:matchId', // Match detail (Pusat Pertandingan)
  '/news', // News
  '/news/:slug', // News detail
  '/gallery', // Media
  '/gallery/:albumId', // Album detail
  '/teams', // Squad
  '/players/:playerId', // Player detail
  '/akun', // Profile
];

/** True when the given pathname has a mobile screen implementation. */
export function hasMobileScreen(pathname) {
  if (!pathname) return false;
  // The Admin Panel is never part of the mobile user experience.
  if (pathname.startsWith('/admin')) return false;
  return MOBILE_SHELL_PATHS.some((pattern) => matchPath({ path: pattern, end: true }, pathname));
}

/** Tab roots used by the bottom navigation for active-state matching. */
export const BOTTOM_NAV_ROOTS = ['/', '/matches', '/news', '/gallery', '/akun'];

export default MOBILE_SHELL_PATHS;
