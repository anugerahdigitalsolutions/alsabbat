import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Activity,
  Calendar,
  ClipboardList,
  Handshake,
  Images,
  LayoutDashboard,
  Newspaper,
  Shield,
  Swords,
  Trophy,
  Upload,
  User,
  UserCog,
  Users,
  Briefcase,
} from 'lucide-react';
import { ClubCrestMark } from '../shared/ClubCrestMark';

export const ADMIN_NAV = [
  {
    group: 'Overview',
    items: [{ id: 'dashboard', to: '/admin', label: 'Dashboard', Icon: LayoutDashboard, end: true }],
  },
  {
    group: 'Klub',
    items: [
      { id: 'club', to: '/admin/club', label: 'Club', Icon: Shield },
      { id: 'teams', to: '/admin/teams', label: 'Teams', Icon: Users },
      { id: 'players', to: '/admin/players', label: 'Players', Icon: User },
      { id: 'staff', to: '/admin/staff', label: 'Staff', Icon: Briefcase },
    ],
  },
  {
    group: 'Kompetisi',
    items: [
      { id: 'seasons', to: '/admin/seasons', label: 'Seasons', Icon: Calendar },
      { id: 'competitions', to: '/admin/competitions', label: 'Competitions', Icon: Trophy },
      { id: 'matches', to: '/admin/matches', label: 'Matches', Icon: Swords },
      { id: 'match-lineups', to: '/admin/match-lineups', label: 'Match Lineups', Icon: ClipboardList },
      { id: 'match-events', to: '/admin/match-events', label: 'Match Events', Icon: Activity },
    ],
  },
  {
    group: 'Media & Konten',
    items: [
      { id: 'content', to: '/admin/content', label: 'Content', Icon: Newspaper },
      { id: 'gallery', to: '/admin/gallery', label: 'Gallery', Icon: Images },
      { id: 'media', to: '/admin/media', label: 'Media', Icon: Upload },
      { id: 'sponsors', to: '/admin/sponsors', label: 'Sponsors', Icon: Handshake },
      { id: 'achievements', to: '/admin/achievements', label: 'Achievements', Icon: Trophy },
    ],
  },
  {
    group: 'Sistem',
    items: [
      { id: 'users', to: '/admin/users', label: 'Admin Users', Icon: UserCog },
      { id: 'system', to: '/admin/system', label: 'System Status', Icon: Activity },
    ],
  },
];

export const AdminSidebar = ({ onNavigate }) => (
  <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--club-tertiary)' }} data-testid="admin-sidebar">
    <div className="flex h-16 items-center gap-3 px-5" style={{ borderBottom: '1px solid rgba(254,254,254,0.10)' }}>
      <ClubCrestMark size={34} onDark testId="admin-sidebar-crest" />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-sm font-bold" style={{ color: 'var(--club-light)' }}>
          ALSABBAT
        </span>
        <span className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--club-primary)' }}>
          Admin Panel
        </span>
      </div>
    </div>

    <nav className="als-scroll-thin flex-1 overflow-y-auto py-4">
      {ADMIN_NAV.map((section) => (
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
      Fase 4 — Match Gallery & Media
    </div>
  </div>
);

export default AdminSidebar;
