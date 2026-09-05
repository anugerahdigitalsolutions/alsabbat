import React from 'react';
import { Link } from 'react-router-dom';
import { Images, Newspaper, ShieldHalf, ShoppingBag, Swords, Trophy, Users } from 'lucide-react';

/**
 * Quick-access chip rail (reference "category chips").
 * Every destination is an EXISTING AL SABBAT route — this is also where the
 * merchandise store is surfaced instead of taking a bottom-nav slot.
 */
const LINKS = [
  { to: '/matches', label: 'Pertandingan', icon: Swords },
  { to: '/news', label: 'Berita', icon: Newspaper },
  { to: '/gallery', label: 'Media', icon: Images },
  { to: '/teams', label: 'Skuad', icon: Users },
  { to: '/merchandise', label: 'Toko', icon: ShoppingBag },
  { to: '/achievements', label: 'Prestasi', icon: Trophy },
  { to: '/club', label: 'Klub', icon: ShieldHalf },
];

export const BrzQuickLinks = () => (
  <div className="brz-hscroll -mx-4 py-1" data-testid="brz-quick-links">
    {LINKS.map(({ to, label, icon: Icon }) => (
      <Link key={to} to={to} className="brz-chip" data-testid={`brz-quick-${to.slice(1)}`}>
        <Icon size={15} aria-hidden="true" />
        {label}
      </Link>
    ))}
  </div>
);

export default BrzQuickLinks;
