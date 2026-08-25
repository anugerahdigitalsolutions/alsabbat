import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { ClubCrestMark } from '../shared/ClubCrestMark';
import { useClub } from '../../context/ClubContext';

export const PUBLIC_NAV = [
  { to: '/', label: 'Beranda', id: 'home' },
  { to: '/club', label: 'Klub', id: 'club' },
  { to: '/teams', label: 'Tim', id: 'teams' },
  { to: '/news', label: 'Berita', id: 'news' },
  { to: '/matches', label: 'Pertandingan', id: 'matches' },
  { to: '/gallery', label: 'Galeri', id: 'gallery' },
  { to: '/achievements', label: 'Prestasi', id: 'achievements' },
  { to: '/sponsors', label: 'Sponsor', id: 'sponsors' },
  { to: '/contact', label: 'Kontak', id: 'contact' },
];

export const PublicHeader = () => {
  const { clubName, shortName } = useClub();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const linkClasses = ({ isActive }) =>
    [
      'relative px-1 py-2 text-sm font-medium transition-colors duration-200',
      isActive ? 'text-[color:var(--club-secondary)]' : 'text-[color:var(--muted-fg)] hover:text-[color:var(--fg)]',
    ].join(' ');

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur"
      style={{ borderColor: 'var(--border-soft)', backgroundColor: 'rgba(254,254,254,0.88)' }}
      data-testid="public-header"
    >
      <div className="als-container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3" data-testid="public-header-logo">
          <ClubCrestMark size={38} testId="public-header-crest" />
          <span className="flex flex-col leading-tight">
            <span className="font-display text-sm font-bold tracking-tight" style={{ color: 'var(--fg)' }}>
              {shortName}
            </span>
            <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--muted-fg)' }}>
              Football Club
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" data-testid="public-header-primary-nav">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === '/'}
              className={linkClasses}
              data-testid={`public-nav-${item.id}`}
            >
              {({ isActive }) => (
                <span className="inline-flex flex-col">
                  {item.label}
                  <span
                    className="mt-1 block h-[2px] rounded-full transition-opacity duration-200"
                    style={{
                      backgroundColor: 'var(--club-primary)',
                      opacity: isActive ? 1 : 0,
                    }}
                  />
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="lg:hidden"
                aria-label="Buka menu"
                data-testid="public-header-mobile-menu-button"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm bg-white" data-testid="public-mobile-nav">
              <div className="mb-6 flex items-center gap-3">
                <ClubCrestMark size={40} testId="public-mobile-crest" />
                <span className="font-display text-sm font-bold">{clubName}</span>
              </div>
              <div className="flex flex-col">
                {PUBLIC_NAV.map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      [
                        'rounded-[var(--radius-sm)] px-3 py-3 text-base font-medium transition-colors',
                        isActive
                          ? 'bg-[color:rgba(252,207,43,0.16)] text-[color:var(--club-secondary)]'
                          : 'text-[color:var(--fg)] hover:bg-[color:rgba(1,40,145,0.05)]',
                      ].join(' ')
                    }
                    data-testid={`public-mobile-nav-${item.id}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <span className="sr-only">{location.pathname}</span>
    </header>
  );
};

export default PublicHeader;
