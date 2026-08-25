import React, { useEffect, useState } from 'react';
import { Activity, BarChart3, Database, HardDrive, Plug, ShieldCheck } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { RolePermissionMatrix } from '../../components/admin/RolePermissionMatrix';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { useAuth } from '../../context/AuthContext';
import { useClub } from '../../context/ClubContext';
import { ROBOTS_URL, SITEMAP_URL } from '../../lib/seo';

export default function AdminSystemPage() {
  const { hasPermission } = useAuth();
  const { meta } = useClub();
  const [status, setStatus] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusRes, analyticsRes] = await Promise.all([
        api.get('/system/status'),
        hasPermission('analytics:read') ? api.get('/analytics/summary', { params: { days: 30 } }) : Promise.resolve({ data: null }),
      ]);
      setStatus(statusRes.data);
      setAnalytics(analyticsRes.data);
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

  if (!hasPermission('system:read')) {
    return (
      <div className="als-card p-6 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="system-forbidden">
        Role Anda tidak memiliki permission <span className="font-mono">system:read</span>.
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-admin-system">
      <div>
        <p className="als-section-label mb-2">System</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">System Status</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
          Kesehatan layanan, konfigurasi media storage, role &amp; permission, SEO, dan fondasi analytics.
        </p>
      </div>

      {loading ? (
        <LoadingState rows={4} testId="system-loading" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} testId="system-error" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="als-card p-5" data-testid="system-card-database">
              <Database className="mb-3 h-5 w-5" style={{ color: 'var(--club-secondary)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                Database
              </p>
              <p className="font-display mt-1 text-lg font-semibold">{status?.database?.name}</p>
              <Badge
                variant="outline"
                className="mt-2"
                style={{
                  backgroundColor: status?.database?.connected ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                  color: status?.database?.connected ? '#166534' : '#991B1B',
                }}
              >
                {status?.database?.connected ? 'Connected' : 'Unavailable'}
              </Badge>
            </div>

            <div className="als-card p-5" data-testid="system-card-storage">
              <HardDrive className="mb-3 h-5 w-5" style={{ color: 'var(--club-secondary)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                Media Storage
              </p>
              <p className="font-display mt-1 text-lg font-semibold">{status?.media_storage?.provider}</p>
              <Badge variant="outline" className="mt-2">
                CDN {status?.media_storage?.cdn_enabled ? 'aktif' : 'belum diatur'}
              </Badge>
            </div>

            <div className="als-card p-5" data-testid="system-card-security">
              <ShieldCheck className="mb-3 h-5 w-5" style={{ color: 'var(--club-secondary)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                Security
              </p>
              <p className="font-display mt-1 text-lg font-semibold">
                {status?.security?.jwt_algorithm}
              </p>
              <Badge variant="outline" className="mt-2">
                Rate limit {status?.security?.rate_limiting ? 'aktif' : 'nonaktif'}
              </Badge>
            </div>

            <div className="als-card p-5" data-testid="system-card-runtime">
              <Activity className="mb-3 h-5 w-5" style={{ color: 'var(--club-secondary)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                Runtime
              </p>
              <p className="font-display mt-1 text-lg font-semibold">{status?.environment}</p>
              <Badge variant="outline" className="mt-2">
                v{status?.version} · Python {status?.python}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue="counts">
            <TabsList data-testid="system-tabs">
              <TabsTrigger value="counts" data-testid="system-tab-counts">Data</TabsTrigger>
              <TabsTrigger value="roles" data-testid="system-tab-roles">Role &amp; Permission</TabsTrigger>
              <TabsTrigger value="analytics" data-testid="system-tab-analytics">Analytics</TabsTrigger>
              <TabsTrigger value="seo" data-testid="system-tab-seo">SEO</TabsTrigger>
              <TabsTrigger value="integrations" data-testid="system-tab-integrations">Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="counts" className="mt-6">
              <div className="als-card overflow-x-auto p-1">
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: 'rgba(1,40,145,0.04)' }}>
                      <TableHead>Collection</TableHead>
                      <TableHead className="text-right">Jumlah Dokumen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(status?.counts || {}).map(([key, value]) => (
                      <TableRow key={key} data-testid={`system-count-${key}`}>
                        <TableCell className="font-mono text-xs">{key}</TableCell>
                        <TableCell className="text-right font-semibold tabular-nums">{value}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="roles" className="mt-6">
              <div className="als-card p-4">
                <RolePermissionMatrix roles={meta?.roles || []} />
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="als-card p-5" data-testid="system-analytics-panel">
                <div className="mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
                  <h3 className="font-display text-lg font-semibold">Analytics Foundation (30 hari)</h3>
                </div>
                {!analytics ? (
                  <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                    Role Anda tidak memiliki permission analytics:read.
                  </p>
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                        Total Event
                      </p>
                      <p className="font-display text-3xl font-bold tabular-nums">{analytics.total_events}</p>
                      <div className="mt-4 space-y-2">
                        {(analytics.by_event_type || []).map((row) => (
                          <div key={row.event_type} className="flex items-center justify-between text-sm">
                            <span className="font-mono text-xs">{row.event_type}</span>
                            <span className="font-semibold tabular-nums">{row.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                        Halaman Teratas
                      </p>
                      <div className="mt-3 space-y-2">
                        {(analytics.top_paths || []).length === 0 ? (
                          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                            Belum ada data page view.
                          </p>
                        ) : (
                          analytics.top_paths.map((row) => (
                            <div key={row.path} className="flex items-center justify-between text-sm">
                              <span className="truncate font-mono text-xs">{row.path}</span>
                              <span className="font-semibold tabular-nums">{row.count}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="seo" className="mt-6">
              <div className="als-card space-y-3 p-5" data-testid="system-seo-panel">
                <h3 className="font-display text-lg font-semibold">SEO Foundation</h3>
                <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                  Meta title, description, Open Graph, dan canonical URL dihasilkan dari konfigurasi klub.
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={SITEMAP_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold underline"
                    style={{ color: 'var(--club-secondary)' }}
                    data-testid="system-sitemap-link"
                  >
                    Lihat sitemap.xml
                  </a>
                  <a
                    href={ROBOTS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold underline"
                    style={{ color: 'var(--club-secondary)' }}
                    data-testid="system-robots-link"
                  >
                    Lihat robots.txt
                  </a>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="integrations" className="mt-6">
              <div className="als-card space-y-4 p-5" data-testid="system-integrations-panel">
                <div className="flex items-center gap-2">
                  <Plug className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
                  <h3 className="font-display text-lg font-semibold">Integrations (architecture ready)</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['instagram', 'tiktok', 'youtube'].map((key) => (
                    <Badge
                      key={key}
                      variant="outline"
                      style={{
                        backgroundColor: status?.integrations?.[key] ? 'rgba(22,163,74,0.12)' : 'var(--surface-2)',
                        color: status?.integrations?.[key] ? '#166534' : 'var(--muted-fg)',
                      }}
                      data-testid={`system-integration-${key}`}
                    >
                      {key}: {status?.integrations?.[key] ? 'configured' : 'not configured'}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                  {status?.integrations?.note}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
