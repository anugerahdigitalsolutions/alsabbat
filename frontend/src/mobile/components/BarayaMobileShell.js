import React, { useEffect } from 'react';
import { BarayaBottomNav } from './BarayaBottomNav';
import '../theme/baraya.css';

/**
 * BARAYA AL SABBAT mobile shell.
 *
 * Wraps the mobile screens with the dark themed surface and the floating
 * bottom navigation. The Admin Panel and the desktop site never mount this.
 *
 * `palette`:
 *   'club'  → reference structure on the official AL SABBAT brand colours
 *   'pitch' → the literal reference palette (dark green-teal + mint)
 */
export const PALETTE = 'club';

export const BarayaMobileShell = ({ children, palette = PALETTE }) => {
  // Keep the browser UI (status bar / address bar) in sync with the dark shell.
  useEffect(() => {
    const tag = document.querySelector('meta[name="theme-color"]');
    const previous = tag?.getAttribute('content');
    if (tag) tag.setAttribute('content', palette === 'pitch' ? '#071310' : '#04091a');
    document.documentElement.setAttribute('data-baraya-mobile', 'true');
    return () => {
      if (tag && previous) tag.setAttribute('content', previous);
      document.documentElement.removeAttribute('data-baraya-mobile');
    };
  }, [palette]);

  return (
    <div className="baraya-app" data-brz-palette={palette} data-testid="baraya-mobile-shell">
      {children}
      <BarayaBottomNav />
    </div>
  );
};

export default BarayaMobileShell;
