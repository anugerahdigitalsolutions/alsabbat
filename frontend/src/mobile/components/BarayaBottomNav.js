import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Images, Newspaper, Swords, User } from 'lucide-react';

/**
 * BARAYA AL SABBAT bottom navigation.
 *
 * Floating docked pill bar; the active tab expands into a gradient pill with
 * its label, inactive tabs stay icon-only — matching the UI reference.
 * All five destinations reuse EXISTING AL SABBAT routes (no duplicates).
 */
const TABS = [
  { to: '/', label: 'Home', icon: Home, testId: 'brz-nav-home' },
  { to: '/matches', label: 'Match', icon: Swords, testId: 'brz-nav-match' },
  { to: '/news', label: 'News', icon: Newspaper, testId: 'brz-nav-news' },
  { to: '/gallery', label: 'Media', icon: Images, testId: 'brz-nav-media' },
  { to: '/akun', label: 'Profile', icon: User, testId: 'brz-nav-profile' },
];

const isTabActive = (pathname, to) => {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(`${to}/`);
};

export const BarayaBottomNav = () => {
  const { pathname } = useLocation();

  return (
    <nav className="brz-nav" aria-label="Navigasi utama Baraya AL SABBAT" data-testid="baraya-bottom-nav">
      {TABS.map(({ to, label, icon: Icon, testId }) => {
        const active = isTabActive(pathname, to);
        return (
          <NavLink
            key={to}
            to={to}
            className={`brz-nav-item${active ? ' brz-nav-item--active' : ''}`}
            aria-current={active ? 'page' : undefined}
            aria-label={label}
            data-testid={testId}
            data-active={active ? 'true' : 'false'}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
            {active ? <span className="brz-nav-label">{label}</span> : null}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default BarayaBottomNav;
