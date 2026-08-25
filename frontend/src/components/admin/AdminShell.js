import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { ExternalLink, LogOut, Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
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
import { AdminSidebar, ADMIN_NAV } from './AdminSidebar';
import { useAuth } from '../../context/AuthContext';

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  CONTENT_ADMIN: 'Content Admin',
  GALLERY_ADMIN: 'Gallery Admin',
  SOCIAL_MEDIA_ADMIN: 'Social Media Admin',
  STORE_ADMIN: 'Store Admin',
  ORDER_ADMIN: 'Order Admin',
};

export const AdminShell = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const current = ADMIN_NAV.flatMap((s) => s.items).find((i) =>
    i.end ? pathname === i.to : pathname.startsWith(i.to)
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--surface-2)' }} data-testid="admin-shell">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[264px] lg:block">
        <AdminSidebar />
      </aside>

      <div className="lg:pl-[264px]">
        <header
          className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b px-4 backdrop-blur sm:px-6"
          style={{ borderColor: 'var(--border-soft)', backgroundColor: 'rgba(254,254,254,0.90)' }}
          data-testid="admin-topbar"
        >
          <div className="flex items-center gap-3">
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
              <SheetContent side="left" className="w-[280px] border-0 p-0" data-testid="admin-mobile-sidebar">
                <AdminSidebar onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
            <div className="flex flex-col leading-tight">
              <span className="font-display text-sm font-semibold" data-testid="admin-topbar-title">
                {current?.label || 'Admin'}
              </span>
              <span className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                ALSABBAT Admin Panel
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/" target="_blank" rel="noreferrer" className="hidden sm:inline-flex" data-testid="admin-view-site-link">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-3.5 w-3.5" />
                Lihat Website
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" data-testid="admin-user-menu-button">
                  <span
                    className="font-display flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
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
        </header>

        <main className="als-admin-container py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
