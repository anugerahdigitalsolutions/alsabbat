import React, { useMemo } from 'react';
import { Users } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Reveal } from '../../components/public/Reveal';
import { SquadShowcase } from '../../components/public/home/SquadShowcase';
import { PlayerSpotlight, pickSpotlightPlayer } from '../../components/public/PlayerSpotlight';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { useResourceList } from '../../hooks/useResourceList';
import { usePageSeo } from '../../hooks/usePageSeo';

const GROUPS = [
  ['GOALKEEPER', 'Penjaga Gawang'],
  ['DEFENDER', 'Belakang'],
  ['MIDFIELDER', 'Tengah'],
  ['FORWARD', 'Depan'],
];

/** ALSABBAT has exactly one squad — this page lists that squad directly. */
export default function TeamsPage() {
  usePageSeo({ title: 'Squad', description: 'Skuad resmi ALSABBAT Football Club — satu klub, satu skuad.', path: '/teams' });
  const players = useResourceList('/players', { status: 'ACTIVE', limit: 60 });
  const staff = useResourceList('/staff', { status: 'ACTIVE', limit: 30 });
  const spotlight = useMemo(() => pickSpotlightPlayer(players.items), [players.items]);

  const grouped = GROUPS.map(([position, label]) => [
    label,
    players.items.filter((p) => p.position === position),
  ]).filter(([, list]) => list.length);
  const others = players.items.filter((p) => !GROUPS.some(([position]) => position === p.position));

  return (
    <div data-testid="page-teams">
      <PublicPageHeader
        label="Squad"
        title="One Squad. One Family."
        description="Satu klub, satu skuad — para pemain dan staf yang membela lambang ALSABBAT."
        breadcrumb={[{ label: 'Home', to: '/' }, { label: 'Squad' }]}
        meta={
          players.total ? (
            <>
              <span>{players.total} pemain</span>
              {staff.total ? <span>{staff.total} staf</span> : null}
            </>
          ) : null
        }
      />

      <div className="als-container py-12 sm:py-16">
        {players.loading ? (
          <LoadingState rows={4} testId="squad-loading" />
        ) : players.error ? (
          <ErrorState message={players.error} onRetry={players.reload} testId="squad-error" />
        ) : !players.items.length ? (
          <EmptyState
            icon={Users}
            title="Skuad belum tersedia"
            description="Profil pemain akan tampil di sini setelah skuad dilengkapi pada Admin Panel."
            testId="teams-empty"
          />
        ) : (
          <div className="space-y-14">
            {spotlight ? (
              <Reveal>
                <p className="als-row-label mb-4">Player Spotlight</p>
                <PlayerSpotlight player={spotlight} />
              </Reveal>
            ) : null}

            {[...grouped, ...(others.length ? [['Lainnya', others]] : [])].map(([label, list], index) => (
              <Reveal key={label} delay={Math.min(index, 4) * 70}>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <p className="als-row-label">{label}</p>
                  <span className="text-xs font-semibold" style={{ color: 'var(--muted-fg)' }}>
                    {list.length} pemain
                  </span>
                </div>
                <SquadShowcase players={list} limit={60} />
              </Reveal>
            ))}
          </div>
        )}

        {staff.items.length ? (
          <Reveal className="mt-16">
            <p className="als-row-label mb-4">Tim Pendukung</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {staff.items.map((member) => (
                <article key={member.id} className="als-card als-lift p-5" data-testid={`staff-card-${member.id}`}>
                  <p className="font-display text-sm font-bold">{member.full_name || member.name}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--club-secondary)' }}>
                    {member.role || member.position || 'Staf'}
                  </p>
                </article>
              ))}
            </div>
          </Reveal>
        ) : null}
      </div>
    </div>
  );
}
