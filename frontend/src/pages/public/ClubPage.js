import React from 'react';
import { CalendarDays, MapPin, Shield, Users } from 'lucide-react';
import { useClub } from '../../context/ClubContext';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { useResourceList } from '../../hooks/useResourceList';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { ClubCrestMark } from '../../components/shared/ClubCrestMark';
import { usePageSeo } from '../../hooks/usePageSeo';

export default function ClubPage() {
  usePageSeo({ title: 'Profil Klub', description: 'Profil resmi ALSABBAT Football Club.', path: '/club' });
  const { club, clubName, loading, error, reload } = useClub();
  const teams = useResourceList('/teams', { status: 'ACTIVE', limit: 20 });

  const facts = [
    { id: 'founded', label: 'Didirikan', value: club?.founded_date || 'Belum diatur', Icon: CalendarDays },
    { id: 'location', label: 'Lokasi', value: club?.location || 'Belum diatur', Icon: MapPin },
    { id: 'stadium', label: 'Markas', value: club?.stadium || 'Belum diatur', Icon: Shield },
    { id: 'teams', label: 'Jumlah Tim', value: teams.loading ? '—' : String(teams.total), Icon: Users },
  ];

  return (
    <div data-testid="page-club">
      <PublicPageHeader label="Tentang Klub" title="This Is ALSABBAT" description="Identitas, nilai, dan perjalanan resmi klub." />
      <div className="als-container py-10">
        {loading ? (
          <LoadingState variant="text" testId="club-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testId="club-error" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <div className="als-card p-6">
              <div className="flex items-center gap-4">
                <ClubCrestMark size={64} testId="club-page-crest" />
                <div>
                  <h2 className="font-display text-xl font-semibold">{club?.name}</h2>
                  <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                    {club?.short_name}
                  </p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <p className="als-section-label">Warna Resmi Klub</p>
                <div className="flex gap-3" data-testid="club-brand-colors">
                  {[
                    ['primary_color', 'Primary'],
                    ['secondary_color', 'Secondary'],
                    ['tertiary_color', 'Tertiary'],
                    ['light_color', 'Light'],
                  ].map(([key, label]) => (
                    <div key={key} className="flex-1 text-center">
                      <span
                        className="block h-12 w-full rounded-[var(--radius-sm)]"
                        style={{
                          backgroundColor: club?.[key],
                          border: '1px solid var(--border-soft)',
                        }}
                        data-testid={`club-color-${key}`}
                      />
                      <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--muted-fg)' }}>
                        {label}
                      </p>
                      <p className="text-[10px] font-mono" style={{ color: 'var(--muted-fg)' }}>
                        {club?.[key]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="als-card p-6">
                <h3 className="font-display mb-3 text-lg font-semibold">Profil Singkat</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }} data-testid="club-description">
                  {club?.description || 'Deskripsi klub belum diatur.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {facts.map(({ id, label, value, Icon }) => (
                  <div key={id} className="als-card p-5" data-testid={`club-fact-${id}`}>
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
                      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                        {label}
                      </p>
                    </div>
                    <p className="font-display text-base font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              <div className="als-card p-6">
                <h3 className="font-display mb-4 text-lg font-semibold">Tim Klub</h3>
                {teams.loading ? (
                  <LoadingState variant="table" rows={2} testId="club-teams-loading" />
                ) : teams.items.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="club-teams-empty">
                    Belum ada tim yang terdaftar.
                  </p>
                ) : (
                  <ul className="space-y-2" data-testid="club-teams-list">
                    {teams.items.map((team) => (
                      <li
                        key={team.id}
                        className="flex items-center justify-between rounded-[var(--radius-sm)] px-3 py-2"
                        style={{ backgroundColor: 'var(--surface-2)' }}
                        data-testid={`club-team-${team.id}`}
                      >
                        <span className="text-sm font-medium">{team.name}</span>
                        <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                          {team.category}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
