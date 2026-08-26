import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, Search, UserRound } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { ClubCrestMark } from '../shared/ClubCrestMark';
import { SearchDialog } from './SearchDialog';
import { useClub } from '../../context/ClubContext';

export const PUBLIC_NAV = [
  { to: '/', label: 'Beranda', id: 'home' },
  { to: '/club', label: 'Klub', id: 'club' },
  { to: '/teams', label: 'Skuad', id: 'teams' },
  { to: '/matches', label: 'Pertandingan', id: 'matches' },
  { to: '/news', label: 'Berita', id: 'news' },
  { to: '/gallery', label: 'Galeri', id: 'gallery' },
  { to: '/merchandise', label: 'Merchandise', id: 'merchandise' },
  { to: '/contact', label: 'Kontak', id: 'contact' },
];

export const SECONDARY_NAV = [
  { to: '/achievements', label: 'Prestasi', id: 'achievements' },
  { to: '/sponsors', label: 'Sponsor', id: 'sponsors' },
  { to: '/order', label: 'Lacak Pesanan', id: 'order' },
];

export const PublicHeader = () => {
  const { clubName, shortName } = useClub();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur"
      style={{ backgroundColor: 'rgba(254,254,254,0.96)', boxShadow: '0 1px 0 rgba(0,0,0,0.06)' }}
      data-testid="public-header"
    >
      <div className="als-frame-inner flex h-[72px] items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" data-testid="public-header-logo">
          <ClubCrestMark size={40} testId="public-header-crest" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[19px] font-extrabold tracking-tight" style={{ color: 'var(--club-secondary)' }}>
              {shortName}
            </span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--muted-fg)' }}>
              Football Club
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 lg:flex" data-testid="public-header-primary-nav">
          {PUBLIC_NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === '/'}
              className="als-focus relative py-2 text-sm font-medium"
              data-testid={`public-nav-${item.id}`}
            >
              {({ isActive }) => (
                <span
                  className="relative inline-block transition-colors duration-200"
                  style={{ color: isActive ? 'var(--club-secondary)' : 'var(--muted-fg)' }}
                >
                  {item.label}
                  <span
                    className="absolute -bottom-1.5 left-0 h-[3px] w-full rounded-full transition-opacity duration-200"
                    style={{ backgroundColor: 'var(--club-primary)', opacity: isActive ? 1 : 0 }}
                  />
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="als-focus inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[color:rgba(1,40,145,0.07)]"
            aria-label="Cari di situs"
            data-testid="public-header-search"
          >
            <Search className="h-[18px] w-[18px]" style={{ color: 'var(--club-secondary)' }} />
          </button>

          <span
            className="hidden text-[11px] font-medium xl:inline"
            style={{ color: 'var(--muted-fg)' }}
            data-testid="public-header-baraya-caption"
          >
            Login untuk Baraya ALSABBAT
          </span>

          <Link
            to="/login"
            className="als-focus font-display inline-flex min-h-[40px] items-center gap-2 rounded-full px-3.5 text-xs font-bold transition-transform duration-200 hover:-translate-y-0.5 sm:px-4"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            title="Login untuk Baraya ALSABBAT"
            aria-label="Login untuk Baraya ALSABBAT"
            data-testid="public-header-baraya-login"
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            Login
          </Link>

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Buka menu" data-testid="public-header-mobile-menu-button">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm bg-white" data-testid="public-mobile-nav">
              <div className="mb-6 flex items-center gap-3">
                <ClubCrestMark size={40} testId="public-mobile-crest" />
                <span className="font-display text-sm font-bold">{clubName}</span>
              </div>
              <div className="flex flex-col">
                {[...PUBLIC_NAV, ...SECONDARY_NAV].map((item) => (
                  <NavLink
                    key={item.id}
                    to={item.to}
                    end={item.to === '/'}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      [
                        'rounded-[var(--radius-sm)] px-3 py-3 text-base font-medium transition-colors duration-200',
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
                <Link
                  to="/login"
                  onClick={() => setOpen(false)}
                  className="font-display mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-sm font-bold"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid="public-mobile-baraya-login"
                >
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  Login untuk Baraya ALSABBAT
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
};

export default PublicHeader;
