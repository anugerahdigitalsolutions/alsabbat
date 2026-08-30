import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Briefcase, Users } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Reveal } from '../../components/public/Reveal';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { usePageSeo } from '../../hooks/usePageSeo';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { staffPositionLabel } from '../../lib/staffStructure';

const POSITION_ORDER = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'];

const POSITION_LABEL = {
  GOALKEEPER: 'Penjaga Gawang',
  DEFENDER: 'Belakang',
  MIDFIELDER: 'Tengah',
  FORWARD: 'Depan',
};

export const PlayerCard = ({ player, testId }) => (
  <Link
    to={`/players/${player.id}`}
    className="als-card als-zoom als-lift als-focus group block overflow-hidden"
    data-testid={testId}
  >
    <div className="relative h-56 sm:h-64" style={{ backgroundColor: 'var(--club-tertiary)' }}>
      {player.photo ? (
        <img
          src={resolveMediaUrl(player.photo)}
          alt={player.display_name || player.full_name}
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
      ) : (
        <>
          <div className="als-stadium-glow absolute inset-0 opacity-70" aria-hidden="true" />
          <span
            className="als-jersey-ghost absolute inset-0 flex items-center justify-center text-6xl"
            aria-hidden="true"
          >
            {player.jersey_number ?? '—'}
          </span>
        </>
      )}
      <div
        className="absolute inset-x-0 bottom-0 h-24"
        style={{ backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.88) 100%)' }}
        aria-hidden="true"
      />
      <span
        className="font-display absolute left-3 top-3 rounded-md px-2 py-0.5 text-xs font-bold"
        style={{ backgroundColor: 'var(--club-primary)', color: 'var(--club-tertiary)' }}
      >
        #{player.jersey_number ?? '-'}
      </span>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p
          className="font-display truncate text-base font-bold leading-tight"
          style={{ color: 'var(--club-light)' }}
        >
          {player.display_name || player.full_name}
        </p>
        <p
          className="font-display mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--club-primary)' }}
        >
          {POSITION_LABEL[player.position] || player.position}
          {player.nationality ? ` · ${player.nationality}` : ''}
        </p>
      </div>
    </div>
  </Link>
);

export default function TeamDetailPage() {
  const { teamId } = useParams();
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  usePageSeo({
    title: team?.name || 'Tim',
    description: team?.description || 'Pemain dan staf AL SABBAT Football Club.',
    path: `/teams/${teamId}`,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [teamRes, playersRes, staffRes] = await Promise.all([
        api.get(`/teams/${teamId}`),
        api.get('/players', { params: { team_id: teamId, limit: 100 } }),
        api.get('/staff', { params: { team_id: teamId, limit: 60 } }),
      ]);
      setTeam(teamRes.data);
      setPlayers(playersRes.data?.items || []);
      setStaff(staffRes.data?.items || []);
    } catch (e) {
      setError(apiErrorMessage(e, 'Tim tidak ditemukan atau gagal dimuat.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const grouped = POSITION_ORDER.map((position) => ({
    position,
    list: players.filter((p) => p.position === position),
  })).filter((g) => g.list.length);

  return (
    <div data-testid="page-team-detail">
      <PublicPageHeader
        label="PEMAIN"
        title={team?.name || 'Detail Tim'}
        description={team?.description || 'Daftar pemain, posisi, dan staf pendukung.'}
        backgroundImage={team?.cover_image}
        imageAlt={team?.name}
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'PEMAIN', to: '/teams' }, { label: team?.name || 'Tim' }]}
        meta={
          loading ? null : (
            <span data-testid="team-detail-counts">
              {players.length} pemain · {staff.length} staf
            </span>
          )
        }
      />
      <div className="als-container py-10 sm:py-14">
        {loading ? (
          <LoadingState rows={4} testId="team-detail-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} testId="team-detail-error" />
        ) : (
          <Tabs defaultValue="squad">
            <TabsList data-testid="team-detail-tabs">
              <TabsTrigger value="squad" data-testid="team-tab-squad">Pemain</TabsTrigger>
              <TabsTrigger value="staff" data-testid="team-tab-staff">Staf</TabsTrigger>
            </TabsList>

            <TabsContent value="squad" className="mt-8">
              {players.length === 0 ? (
                <EmptyState icon={Users} title="Belum ada pemain" description="Daftar pemain belum diisi." testId="team-squad-empty" />
              ) : (
                <div className="space-y-12">
                  {grouped.map(({ position, list }) => (
                    <div key={position}>
                      <div className="mb-5">
                        <p className="als-section-label">{POSITION_LABEL[position] || position}</p>
                        <span className="als-gold-rule mt-2" aria-hidden="true" />
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {list.map((player, index) => (
                          <Reveal key={player.id} delay={Math.min(index, 6) * 60}>
                            <PlayerCard player={player} testId={`team-player-card-${player.id}`} />
                          </Reveal>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="staff" className="mt-8">
              {staff.length === 0 ? (
                <EmptyState icon={Briefcase} title="Belum ada staf" description="Staf tim ini belum diisi." testId="team-staff-empty" />
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {staff.map((member, index) => (
                    <Reveal key={member.id} delay={Math.min(index, 6) * 60} className="h-full">
                      <div
                        className="als-card als-lift flex h-full gap-4 p-5"
                        data-testid={`team-staff-card-${member.id}`}
                      >
                        {member.photo ? (
                          <img src={resolveMediaUrl(member.photo)} alt={member.name} className="h-16 w-16 shrink-0 rounded-[10px] object-cover" loading="lazy" />
                        ) : (
                          <span
                            className="font-display flex h-16 w-16 shrink-0 items-center justify-center rounded-[10px] text-lg font-bold"
                            style={{ backgroundColor: 'var(--club-secondary)', color: 'var(--club-light)' }}
                            aria-hidden="true"
                          >
                            {(member.name || 'S').slice(0, 1)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-display truncate text-base font-bold">{member.name}</p>
                          <p className="text-xs font-medium" style={{ color: 'var(--club-secondary)' }}>
                            {staffPositionLabel(member)}
                          </p>
                          {member.department ? (
                            <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                              {member.department}
                            </p>
                          ) : null}
                          {member.bio ? (
                            <p className="mt-2 line-clamp-3 text-xs" style={{ color: 'var(--muted-fg)' }}>
                              {member.bio}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </Reveal>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
