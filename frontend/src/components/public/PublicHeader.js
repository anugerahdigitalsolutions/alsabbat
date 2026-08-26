import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, UserRound, LogOut, Receipt, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useBaraya } from '../../context/BarayaAuthContext';
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { ClubCrestMark } from '../shared/ClubCrestMark';
import { SearchDialog } from './SearchDialog';
import { useClub } from '../../context/ClubContext';

export const PUBLIC_NAV = [
  { to: '/', label: 'BERANDA', id: 'home' },
  { to: '/club', label: 'KLUB', id: 'club' },
  { to: '/teams', label: 'PEMAIN', id: 'teams' },
  { to: '/matches', label: 'PERTANDINGAN', id: 'matches' },
  { to: '/news', label: 'BERITA', id: 'news' },
  { to: '/gallery', label: 'GALERI', id: 'gallery' },
  { to: '/merchandise', label: 'MERCHANDISE', id: 'merchandise' },
  { to: '/contact', label: 'KONTAK', id: 'contact' },
];

export const SECONDARY_NAV = [
  { to: '/achievements', label: 'PRESTASI', id: 'achievements' },
  { to: '/sponsors', label: 'SPONSOR', id: 'sponsors' },
  { to: '/order', label: 'LACAK PESANAN', id: 'order' },
];

/** Menus always visible when horizontal space is tight (1024px–1279px). */
const PRIORITY_IDS = ['home', 'club', 'teams', 'matches', 'news', 'gallery'];
const PRIORITY_NAV = PUBLIC_NAV.filter((item) => PRIORITY_IDS.includes(item.id));
const OVERFLOW_NAV = PUBLIC_NAV.filter((item) => !PRIORITY_IDS.includes(item.id));

const NavItem = ({ item, testIdPrefix }) => (
  <NavLink
    key={item.id}
    to={item.to}
    end={item.to === '/'}
    className="als-focus relative py-2 text-[12.5px] font-semibold tracking-[0.05em]"
    data-testid={`${testIdPrefix}-${item.id}`}
  >
    {({ isActive }) => (
      <span
        className="relative inline-block whitespace-nowrap transition-colors duration-200"
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
);

export const PublicHeader = () => {
  const { clubName, shortName } = useClub();
  const { customer, logout } = useBaraya();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goFromDrawer = (to) => {
    setOpen(false);
    // biarkan animasi drawer selesai dulu, baru page transition dimulai
    setTimeout(() => navigate(to), 180);
  };

  const overflowActive = OVERFLOW_NAV.some((item) => pathname.startsWith(item.to));

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur transition-shadow duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(254,254,254,0.92)' : 'rgba(254,254,254,0.96)',
        boxShadow: scrolled ? '0 10px 30px rgba(0,0,0,0.10)' : '0 1px 0 rgba(0,0,0,0.06)',
      }}
      data-testid="public-header"
      data-scrolled={scrolled ? 'true' : 'false'}
    >
      <div className="als-frame-inner flex h-[72px] items-center justify-between gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" data-testid="public-header-logo">
          <ClubCrestMark size={40} testId="public-header-crest" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[19px] font-extrabold tracking-tight" style={{ color: '#000000' }}>
              {shortName}
            </span>
            <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--muted-fg)' }}>
              Football Club
            </span>
          </span>
        </Link>

        {/* ≥1280px — semua menu utama tampil langsung */}
        <nav className="hidden items-center gap-5 xl:flex" data-testid="public-header-primary-nav">
          {PUBLIC_NAV.map((item) => (
            <NavItem key={item.id} item={item} testIdPrefix="public-nav" />
          ))}
        </nav>

        {/* 1024px–1279px — 6 menu prioritas + dropdown LAINNYA */}
        <nav className="hidden items-center gap-5 lg:flex xl:hidden" data-testid="public-header-compact-nav">
          {PRIORITY_NAV.map((item) => (
            <NavItem key={item.id} item={item} testIdPrefix="public-nav-compact" />
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="als-focus relative py-2 text-[12.5px] font-semibold tracking-[0.05em]"
                aria-label="Menu lainnya"
                data-testid="public-nav-more-trigger"
              >
                <span
                  className="relative inline-flex items-center gap-1 whitespace-nowrap transition-colors duration-200"
                  style={{ color: overflowActive ? 'var(--club-secondary)' : 'var(--muted-fg)' }}
                >
                  LAINNYA
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  <span
                    className="absolute -bottom-1.5 left-0 h-[3px] w-full rounded-full transition-opacity duration-200"
                    style={{ backgroundColor: 'var(--club-primary)', opacity: overflowActive ? 1 : 0 }}
                  />
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-white" data-testid="public-nav-more-content">
              {OVERFLOW_NAV.map((item) => (
                <DropdownMenuItem key={item.id} asChild>
                  <Link
                    to={item.to}
                    className="text-[12.5px] font-semibold tracking-[0.05em]"
                    data-testid={`public-nav-more-${item.id}`}
                  >
                    {item.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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

          {customer ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="als-focus font-display inline-flex min-h-[40px] max-w-[190px] items-center gap-2 rounded-full px-3.5 text-xs font-bold transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid="public-header-baraya-menu"
                >
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="truncate">{customer.full_name?.split(' ')[0] || 'Baraya'}</span>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white" data-testid="public-header-baraya-dropdown">
                <DropdownMenuItem asChild>
                  <Link to="/akun" data-testid="baraya-menu-account">
                    <UserRound className="mr-2 h-4 w-4" aria-hidden="true" /> Akun Saya
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/akun/pesanan" data-testid="baraya-menu-orders">
                    <Receipt className="mr-2 h-4 w-4" aria-hidden="true" /> Pesanan Saya
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} data-testid="baraya-menu-logout">
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <span
                className="hidden text-[11px] font-medium 2xl:inline"
                style={{ color: 'var(--muted-fg)' }}
                data-testid="public-header-baraya-caption"
              >
                Login untuk Baraya ALSABBAT
              </span>

              <Link
                to="/login"
                className="als-focus font-display inline-flex min-h-[40px] items-center gap-2 rounded-full px-3.5 text-xs font-bold tracking-[0.05em] transition-transform duration-200 hover:-translate-y-0.5 sm:px-4"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                title="Login untuk Baraya ALSABBAT"
                aria-label="Login untuk Baraya ALSABBAT"
                data-testid="public-header-baraya-login"
              >
                <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                LOGIN
              </Link>
            </>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Buka menu" data-testid="public-header-mobile-menu-button">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[86vw] max-w-sm overflow-y-auto bg-white" data-testid="public-mobile-nav">
              <SheetTitle className="sr-only">Menu Navigasi</SheetTitle>
              <SheetDescription className="sr-only">Navigasi utama website {clubName}</SheetDescription>
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
                    onClick={(e) => {
                      e.preventDefault();
                      goFromDrawer(item.to);
                    }}
                    className={({ isActive }) =>
                      [
                        'rounded-[var(--radius-sm)] px-3 py-3 text-sm font-semibold tracking-[0.05em] transition-colors duration-200',
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
                  to={customer ? '/akun' : '/login'}
                  onClick={(e) => {
                    e.preventDefault();
                    goFromDrawer(customer ? '/akun' : '/login');
                  }}
                  className="font-display mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 text-sm font-bold tracking-[0.04em]"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid="public-mobile-baraya-login"
                >
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                  {customer ? 'AKUN SAYA' : 'LOGIN'}
                </Link>
                <span className="mt-2 text-center text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                  Login untuk Baraya ALSABBAT
                </span>
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
