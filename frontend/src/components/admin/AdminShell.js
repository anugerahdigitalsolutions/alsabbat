import React, { useCallback, useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ExternalLink, LogOut, Menu, ShieldCheck } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { AdminSidebar, ADMIN_NAV, ADMIN_ROUTE_PERMISSIONS } from './AdminSidebar';
import { AdminNotificationAlert } from './AdminNotificationAlert';
import { NotificationBell } from '../shared/NotificationBell';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  CLUB_ADMIN: 'Admin Klub',
  PLAYER_STAFF_ADMIN: 'Admin Pemain & Staff',
  MATCH_ADMIN: 'Admin Pertandingan',
  MEDIA_CONTENT_ADMIN: 'Admin Media & Konten',
  STORE_MANAGER: 'Admin Store',
  FINANCE_ADMIN: 'Admin Keuangan',
  IT_ADMIN: 'Admin IT / Developer',
  CONTENT_ADMIN: 'Content Admin',
  GALLERY_ADMIN: 'Gallery Admin',
  SOCIAL_MEDIA_ADMIN: 'Social Media Admin',
  STORE_ADMIN: 'Store Admin',
  ORDER_ADMIN: 'Order Admin',
};

const COLLAPSE_KEY = 'als_admin_sidebar_collapsed';

const AccessDenied = ({ permission }) => (
  <div className="als-card p-8" data-testid="admin-access-denied">
    <p className="als-section-label mb-2">Akses Ditolak</p>
    <h1 className="font-display text-2xl font-semibold tracking-tight">Halaman ini di luar akses role Anda</h1>
    <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--muted-fg)' }}>
      Role Anda tidak memiliki permission <span className="font-mono">{permission}</span>. Gunakan menu di samping
      untuk mengelola modul sesuai akses Anda, atau hubungi Super Admin bila akses ini memang dibutuhkan.
    </p>
  </div>
);

export const AdminShell = () => {
  const { user, logout, hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_KEY) === '1');
  const { pathname } = useLocation();
  // Fase 2 — data notifikasi dibagi dari NotificationBell ke popup alert
  // (satu sumber fetch, tidak ada polling ganda).
  const [notifications, setNotifications] = useState([]);
  const [refreshSignal, setRefreshSignal] = useState(0);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  const handleNotifications = useCallback((data) => {
    setNotifications(data?.items || []);
  }, []);

  const markNotificationRead = useCallback(async (item) => {
    if (!item || item.read) return;
    await api.patch(`/notifications/${item.id}/read`);
  }, []);

  const refreshNotifications = useCallback(() => setRefreshSignal((value) => value + 1), []);

  const currentSection = ADMIN_NAV.find((section) =>
    section.items.some((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to)))
  );
  const current = ADMIN_NAV.flatMap((s) => s.items).find((i) =>
    i.end ? pathname === i.to : pathname.startsWith(i.to)
  );

  // Guard route: backend tetap penjaga utama, ini mencegah halaman kosong/403 saat URL dibuka langsung.
  const blocked = ADMIN_ROUTE_PERMISSIONS.find(
    (route) => pathname.startsWith(route.to) && !hasPermission(route.permission)
  );

  const railWidth = collapsed ? 84 : 276;

  return (
    <div
      className="als-admin-canvas min-h-screen"
      data-admin-ui="true"
      style={{ '--adm-rail': `${railWidth}px` }}
      data-testid="admin-shell"
    >
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden lg:block"
        style={{ width: railWidth, transition: 'width 240ms var(--ease-out)' }}
      >
        <AdminSidebar collapsed={collapsed} />
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          className="absolute -right-3 top-[86px] hidden h-7 w-7 items-center justify-center rounded-full lg:flex"
          style={{
            backgroundColor: 'var(--club-primary)',
            color: '#0B1220',
            boxShadow: '0 8px 18px -8px rgba(2,6,23,0.45)',
          }}
          data-testid="admin-sidebar-collapse-toggle"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      <div className="als-admin-main">

        <header className="sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-4" data-testid="admin-topbar">
          <div
            className="flex h-16 items-center justify-between gap-3 px-3 sm:px-5"
            style={{
              backgroundColor: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(14px)',
              border: '1px solid var(--adm-border)',
              borderRadius: 'var(--adm-radius)',
              boxShadow: 'var(--adm-shadow)',
            }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Buka menu admin"
                    data-testid="admin-mobile-menu-button"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[288px] border-0 p-0" data-testid="admin-mobile-sidebar">
                  <SheetTitle className="sr-only">Menu Admin AL SABBAT</SheetTitle>
                  <AdminSidebar onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: 'rgba(1,40,145,0.55)' }}>
                  {currentSection?.group || 'Admin'}
                </p>
                <span className="font-display block truncate text-base font-semibold" data-testid="admin-topbar-title">
                  {current?.label || 'Admin'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/" target="_blank" rel="noreferrer" className="hidden sm:inline-flex" data-testid="admin-view-site-link">
                <Button variant="outline" size="sm" className="rounded-full">
                  <ExternalLink className="mr-2 h-3.5 w-3.5" />
                  Lihat Website
                </Button>
              </Link>

              <NotificationBell
                client={api}
                basePath="/notifications"
                countPath="/notifications/unread-count"
                activePollMs={12000}
                pollMs={60000}
                allowClearRead
                onLoad={handleNotifications}
                refreshSignal={refreshSignal}
                testId="admin-notification-bell"
                iconStyle={{ color: 'var(--club-secondary)' }}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-full" data-testid="admin-user-menu-button">
                    <span
                      className="font-display flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                    >
                      {(user?.name || 'A').slice(0, 1).toUpperCase()}
                    </span>
                    <span className="hidden max-w-[140px] truncate sm:inline">{user?.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 bg-white">
                  <DropdownMenuLabel>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm font-semibold">{user?.name}</span>
                      <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                        {user?.email}
                      </span>
                      <Badge
                        variant="outline"
                        className="mt-1 w-fit"
                        style={{
                          backgroundColor: 'rgba(252,207,43,0.14)',
                          borderColor: 'rgba(252,207,43,0.5)',
                          color: 'var(--fg)',
                        }}
                        data-testid="admin-user-role-badge"
                      >
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        {ROLE_LABELS[user?.role] || user?.role}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout} data-testid="admin-logout-button">
                    <LogOut className="mr-2 h-4 w-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="als-admin-container py-6 sm:py-8">
          <div key={pathname} className="als-page-enter">
            {blocked ? <AccessDenied permission={blocked.permission} /> : <Outlet />}
          </div>
        </main>

        <AdminNotificationAlert
          items={notifications}
          onRead={markNotificationRead}
          onHandled={refreshNotifications}
        />
      </div>
    </div>
  );
};

export default AdminShell;
