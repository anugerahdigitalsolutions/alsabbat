import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  Calendar,
  Handshake,
  Images,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  Newspaper,
  Shield,
  Swords,
  Smartphone,
  ShoppingBag,
  Receipt,
  Tags,
  Layers,
  Trophy,
  Upload,
  User,
  UserCog,
  Users,
  Briefcase,
} from 'lucide-react';
import { ClubCrestMark } from '../shared/ClubCrestMark';
import { useAuth } from '../../context/AuthContext';

export const ADMIN_NAV = [
  {
    group: 'Overview',
    items: [
      { id: 'dashboard', to: '/admin', label: 'Dashboard', Icon: LayoutDashboard, end: true },
      { id: 'readiness', to: '/admin/readiness', label: 'Persiapan Konten', Icon: ListChecks, permission: 'club:read' },
    ],
  },
  {
    group: 'Klub',
    items: [
      { id: 'club', to: '/admin/club', label: 'Club', Icon: Shield, permission: 'club:write' },
      { id: 'teams', to: '/admin/teams', label: 'Teams', Icon: Users, permission: 'team:write' },
      { id: 'players', to: '/admin/players', label: 'Players', Icon: User, permission: 'player:write' },
      { id: 'staff', to: '/admin/staff', label: 'Staff', Icon: Briefcase, permission: 'staff:write' },
    ],
  },
  {
    group: 'Kompetisi',
    items: [
      { id: 'seasons', to: '/admin/seasons', label: 'Seasons', Icon: Calendar, permission: 'season:write' },
      { id: 'competitions', to: '/admin/competitions', label: 'Competitions', Icon: Trophy, permission: 'competition:write' },
      { id: 'matches', to: '/admin/matches', label: 'Matches', Icon: Swords, permission: 'match:write' },
      { id: 'match-events', to: '/admin/match-events', label: 'Match Events', Icon: Activity, permission: 'event:write' },
      { id: 'player-stats', to: '/admin/player-stats', label: 'Statistik Pemain', Icon: Activity, permission: 'event:write' },
    ],
  },
  {
    group: 'Media & Konten',
    items: [
      { id: 'home-content', to: '/admin/home-content', label: 'Konten Halaman', Icon: LayoutTemplate, permission: 'content:write' },
      { id: 'content', to: '/admin/content', label: 'Content', Icon: Newspaper, permission: 'content:write' },
      { id: 'gallery', to: '/admin/gallery', label: 'Gallery', Icon: Images, permission: 'gallery:write' },
      { id: 'media', to: '/admin/media', label: 'Media', Icon: Upload, permission: 'media:write' },
      { id: 'sponsors', to: '/admin/sponsors', label: 'Sponsors', Icon: Handshake, permission: 'sponsor:write' },
      { id: 'achievements', to: '/admin/achievements', label: 'Achievements', Icon: Trophy, permission: 'achievement:write' },
      { id: 'social', to: '/admin/social', label: 'Aplikasi Mobile', Icon: Smartphone, permission: 'club:write' },
    ],
  },
  {
    group: 'Merchandise',
    items: [
      { id: 'products', to: '/admin/products', label: 'Produk', Icon: ShoppingBag, permission: 'merchandise:write' },
      { id: 'product-categories', to: '/admin/product-categories', label: 'Kategori Produk', Icon: Tags, permission: 'merchandise:write' },
      { id: 'product-variants', to: '/admin/product-variants', label: 'Varian Produk', Icon: Layers, permission: 'merchandise:write' },
      { id: 'orders', to: '/admin/orders', label: 'Orders', Icon: Receipt, permission: 'order:read' },
    ],
  },
  {
    group: 'Sistem',
    items: [
      { id: 'users', to: '/admin/users', label: 'Admin Users', Icon: UserCog, permission: 'user:write' },
      { id: 'baraya', to: '/admin/baraya', label: 'Baraya AL SABBAT', Icon: UserCog, permission: 'member:read' },
      { id: 'system', to: '/admin/system', label: 'System Status', Icon: Activity, permission: 'system:read' },
    ],
  },
];

/** Permission yang wajib dimiliki untuk membuka sebuah route admin (dipakai AdminShell). */
export const ADMIN_ROUTE_PERMISSIONS = ADMIN_NAV.flatMap((section) => section.items)
  .filter((item) => item.permission)
  .map((item) => ({ to: item.to, permission: item.permission }));

export const AdminSidebar = ({ onNavigate }) => {
  const { hasPermission } = useAuth();
  const sections = ADMIN_NAV.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((section) => section.items.length > 0);

  return (
  <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--club-tertiary)' }} data-testid="admin-sidebar">
    <div className="flex h-16 items-center gap-3 px-5" style={{ borderBottom: '1px solid rgba(254,254,254,0.10)' }}>
      <ClubCrestMark size={34} onDark testId="admin-sidebar-crest" />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-sm font-bold" style={{ color: 'var(--club-light)' }}>
          AL SABBAT
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--club-primary)' }}>
          Admin Panel
        </span>
      </div>
    </div>

    <nav className="als-scroll-thin flex-1 overflow-y-auto py-4">
      {sections.map((section) => (
        <div key={section.group} className="mb-5">
          <p
            className="mb-2 px-5 text-[10px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: 'rgba(254,254,254,0.42)' }}
          >
            {section.group}
          </p>
          {section.items.map(({ id, to, label, Icon, end }) => (
            <NavLink
              key={id}
              to={to}
              end={end}
              onClick={onNavigate}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-colors duration-200',
                  isActive ? 'border-l-4' : 'border-l-4 border-transparent',
                ].join(' ')
              }
              style={({ isActive }) => ({
                color: isActive ? 'var(--club-light)' : 'rgba(254,254,254,0.68)',
                backgroundColor: isActive ? 'rgba(254,254,254,0.08)' : 'transparent',
                borderLeftColor: isActive ? 'var(--club-primary)' : 'transparent',
              })}
              data-testid={`admin-sidebar-nav-item-${id}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>

    <div className="px-5 py-4 text-[11px]" style={{ borderTop: '1px solid rgba(254,254,254,0.10)', color: 'rgba(254,254,254,0.45)' }}>
      AL SABBAT Football Club · Admin
    </div>
  </div>
  );
};

export default AdminSidebar;
