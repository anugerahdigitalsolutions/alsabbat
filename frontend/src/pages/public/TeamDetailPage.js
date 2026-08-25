import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Briefcase, Users } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { usePageSeo } from '../../hooks/usePageSeo';

const POSITION_ORDER = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'];

export const PlayerCard = ({ player, testId }) => (
  <Link
    to={`/players/${player.id}`}
    className="als-card overflow-hidden transition-shadow hover:shadow-[var(--shadow-md)]"
    data-testid={testId}
  >
    <div className="relative h-44" style={{ backgroundColor: 'var(--club-tertiary)' }}>
      {player.photo ? (
        <img src={player.photo} alt={player.full_name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span
          className="font-display absolute inset-0 flex items-center justify-center text-5xl font-extrabold"
          style={{ color: 'rgba(252,207,43,0.85)' }}
        >
          {player.jersey_number ?? '—'}
        </span>
      )}
      <span
        className="font-display absolute right-2 top-2 rounded-md px-2 py-0.5 text-xs font-bold"
        style={{ backgroundColor: 'var(--club-primary)', color: 'var(--club-tertiary)' }}
      >
        #{player.jersey_number ?? '-'}
      </span>
    </div>
    <div className="p-4">
      <p className="truncate text-sm font-semibold">{player.display_name || player.full_name}</p>
      <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
        {player.position}
        {player.nationality ? ` · ${player.nationality}` : ''}
      </p>
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
    description: team?.description || 'Skuad dan staf tim ALSABBAT Football Club.',
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
        label="Tim"
        title={team?.name || 'Detail Tim'}
        description={team?.description || 'Skuad, posisi, dan staf pendukung tim.'}
      />
      <div className="als-container py-10">
        {loading ? (
          <LoadingState rows={4} testId="team-detail-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} testId="team-detail-error" />
        ) : (
          <>
            <div className="als-card mb-8 flex flex-wrap items-center gap-4 p-5">
              <Badge variant="outline" style={{ backgroundColor: 'rgba(1,40,145,0.05)' }} data-testid="team-detail-category">
                {team?.category}
              </Badge>
              <span className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                {players.length} pemain · {staff.length} staf
              </span>
            </div>

            <Tabs defaultValue="squad">
              <TabsList data-testid="team-detail-tabs">
                <TabsTrigger value="squad" data-testid="team-tab-squad">Skuad</TabsTrigger>
                <TabsTrigger value="staff" data-testid="team-tab-staff">Staf</TabsTrigger>
              </TabsList>

              <TabsContent value="squad" className="mt-6">
                {players.length === 0 ? (
                  <EmptyState icon={Users} title="Belum ada pemain" description="Skuad tim ini belum diisi." testId="team-squad-empty" />
                ) : (
                  <div className="space-y-8">
                    {grouped.map(({ position, list }) => (
                      <div key={position}>
                        <p className="als-section-label mb-3">{position}</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                          {list.map((player) => (
                            <PlayerCard key={player.id} player={player} testId={`team-player-card-${player.id}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="staff" className="mt-6">
                {staff.length === 0 ? (
                  <EmptyState icon={Briefcase} title="Belum ada staf" description="Staf tim ini belum diisi." testId="team-staff-empty" />
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {staff.map((member) => (
                      <div key={member.id} className="als-card flex gap-4 p-5" data-testid={`team-staff-card-${member.id}`}>
                        {member.photo ? (
                          <img src={member.photo} alt={member.name} className="h-16 w-16 rounded-[10px] object-cover" loading="lazy" />
                        ) : (
                          <span
                            className="font-display flex h-16 w-16 items-center justify-center rounded-[10px] text-lg font-bold"
                            style={{ backgroundColor: 'var(--club-secondary)', color: 'var(--club-light)' }}
                          >
                            {(member.name || 'S').slice(0, 1)}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="font-display truncate text-base font-bold">{member.name}</p>
                          <p className="text-xs font-medium" style={{ color: 'var(--club-secondary)' }}>
                            {member.role_label || member.role}
                          </p>
                          {member.bio ? (
                            <p className="mt-2 line-clamp-3 text-xs" style={{ color: 'var(--muted-fg)' }}>
                              {member.bio}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
