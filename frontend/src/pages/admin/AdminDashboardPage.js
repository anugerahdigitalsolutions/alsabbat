import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Database,
  HardDrive,
  Handshake,
  Images,
  Newspaper,
  Swords,
  Trophy,
  Upload,
  User,
  Users,
} from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { StatCard } from '../../components/admin/StatCard';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../context/AuthContext';
import { useClub } from '../../context/ClubContext';

const CARDS = [
  { key: 'teams', label: 'Teams', Icon: Users, to: '/admin/teams' },
  { key: 'players', label: 'Players', Icon: User, to: '/admin/players' },
  { key: 'matches', label: 'Matches', Icon: Swords, to: '/admin/matches' },
  { key: 'posts', label: 'Posts', Icon: Newspaper, to: '/admin/content' },
  { key: 'gallery_albums', label: 'Gallery Albums', Icon: Images, to: '/admin/gallery' },
  { key: 'media', label: 'Media Items', Icon: Upload, to: '/admin/media' },
  { key: 'seasons', label: 'Seasons', Icon: Calendar, to: '/admin/seasons' },
  { key: 'competitions', label: 'Competitions', Icon: Trophy, to: '/admin/competitions' },
  { key: 'sponsors', label: 'Sponsors', Icon: Handshake, to: '/admin/sponsors' },
];

export default function AdminDashboardPage() {
  const { user, hasPermission } = useAuth();
  const { clubName } = useClub();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    if (!hasPermission('system:read')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/system/status');
      setStatus(data);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-7" data-testid="page-admin-dashboard">
      <div>
        <p className="als-section-label mb-2">Dashboard</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl" data-testid="dashboard-greeting">
          Selamat datang, {user?.name}
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
          Ringkasan data {clubName}. Fase 1 fokus pada arsitektur, keamanan, dan kesiapan deployment.
        </p>
      </div>

      {!hasPermission('system:read') ? (
        <div
          className="als-card p-6 text-sm"
          style={{ color: 'var(--muted-fg)' }}
          data-testid="dashboard-no-system-permission"
        >
          Role Anda tidak memiliki permission <span className="font-mono">system:read</span>, sehingga ringkasan
          sistem tidak ditampilkan. Gunakan menu di samping untuk mengelola modul sesuai akses Anda.
        </div>
      ) : loading ? (
        <LoadingState rows={6} testId="dashboard-loading" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} testId="dashboard-error" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="dashboard-stat-cards">
            {CARDS.map(({ key, label, Icon, to }) => (
              <StatCard
                key={key}
                label={label}
                value={status?.counts?.[key] ?? 0}
                Icon={Icon}
                to={to}
                testId={`dashboard-stat-${key}`}
              />
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div className="als-card p-5" data-testid="dashboard-system-panel">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">System Status</h2>
                <Link to="/admin/system" className="text-xs font-semibold" style={{ color: 'var(--club-secondary)' }}>
                  Detail
                </Link>
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <Database className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
                    MongoDB
                  </span>
                  <Badge
                    variant="outline"
                    style={{
                      backgroundColor: status?.database?.connected ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                      color: status?.database?.connected ? '#166534' : '#991B1B',
                      borderColor: status?.database?.connected ? 'rgba(22,163,74,0.22)' : 'rgba(220,38,38,0.22)',
                    }}
                    data-testid="system-status-health-badge"
                  >
                    {status?.database?.connected ? (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    ) : (
                      <AlertCircle className="mr-1 h-3 w-3" />
                    )}
                    {status?.database?.connected ? 'Connected' : 'Unavailable'}
                  </Badge>
                </li>
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <HardDrive className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
                    Media Storage
                  </span>
                  <span className="font-mono text-xs" style={{ color: 'var(--muted-fg)' }}>
                    {status?.media_storage?.provider}
                  </span>
                </li>
                <li className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2">
                    <Activity className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
                    Environment
                  </span>
                  <span className="font-mono text-xs" style={{ color: 'var(--muted-fg)' }}>
                    {status?.environment} · v{status?.version}
                  </span>
                </li>
              </ul>
            </div>

            <div className="als-card p-5" data-testid="dashboard-scope-panel">
              <h2 className="font-display mb-4 text-lg font-semibold">Cakupan Fase 1</h2>
              <p className="mb-3 text-sm" style={{ color: 'var(--muted-fg)' }}>
                Modul yang dibangun sebagai fondasi:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {['Club', 'Teams', 'Players', 'Staff', 'Seasons', 'Competitions', 'Matches', 'Content', 'Gallery', 'Media', 'Sponsors', 'Auth & RBAC'].map(
                  (item) => (
                    <Badge
                      key={item}
                      variant="outline"
                      style={{ backgroundColor: 'rgba(1,40,145,0.05)', borderColor: 'var(--border-soft)' }}
                    >
                      {item}
                    </Badge>
                  )
                )}
              </div>
              <p className="mt-4 text-xs" style={{ color: 'var(--muted-fg)' }}>
                Sengaja belum dibangun: merchandise, cart, checkout, payment, order, membership, ticketing,
                statistik lanjutan, live match, dan social/YouTube auto publishing.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
