import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { Badge } from '../../components/ui/badge';
import { usePageSeo } from '../../hooks/usePageSeo';

export default function PlayerDetailPage() {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  usePageSeo({
    title: player?.full_name || 'Profil Pemain',
    description: player?.bio || 'Profil pemain ALSABBAT Football Club.',
    image: player?.photo,
    path: `/players/${playerId}`,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/players/${playerId}`);
      setPlayer(data);
      if (data?.team_id) {
        try {
          const teamRes = await api.get(`/teams/${data.team_id}`);
          setTeam(teamRes.data);
        } catch (e) {
          setTeam(null);
        }
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'Pemain tidak ditemukan.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  const facts = [
    ['Posisi', player?.position],
    ['Nomor Punggung', player?.jersey_number],
    ['Kebangsaan', player?.nationality],
    ['Tanggal Lahir', player?.date_of_birth],
    ['Tinggi', player?.height_cm ? `${player.height_cm} cm` : null],
    ['Berat', player?.weight_kg ? `${player.weight_kg} kg` : null],
  ];

  return (
    <div data-testid="page-player-detail">
      <PublicPageHeader label="Player Profile" title={player?.full_name || 'Profil Pemain'} description={team?.name} />
      <div className="als-container py-10">
        {loading ? (
          <LoadingState variant="text" testId="player-detail-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} testId="player-detail-error" />
        ) : (
          <>
            <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
              <div className="als-card overflow-hidden">
                <div className="relative h-80" style={{ backgroundColor: 'var(--club-tertiary)' }}>
                  {player?.photo ? (
                    <img src={player.photo} alt={player.full_name} className="h-full w-full object-cover" />
                  ) : (
                    <span
                      className="font-display absolute inset-0 flex items-center justify-center text-7xl font-extrabold"
                      style={{ color: 'rgba(252,207,43,0.85)' }}
                    >
                      {player?.jersey_number ?? '—'}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <Badge variant="outline" style={{ backgroundColor: 'rgba(252,207,43,0.16)', borderColor: 'rgba(252,207,43,0.55)' }} data-testid="player-status">
                    {player?.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {facts
                    .filter(([, value]) => value !== null && value !== undefined && value !== '')
                    .map(([label, value]) => (
                      <div key={label} className="als-card p-4" data-testid={`player-fact-${label}`}>
                        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                          {label}
                        </p>
                        <p className="font-display mt-1 text-base font-bold">{value}</p>
                      </div>
                    ))}
                </div>

                <div className="als-card p-6">
                  <h2 className="font-display mb-3 text-lg font-bold">Biografi</h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }} data-testid="player-bio">
                    {player?.bio || 'Biografi pemain belum tersedia.'}
                  </p>
                </div>

                {team ? (
                  <Link
                    to={`/teams/${team.id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold"
                    style={{ color: 'var(--club-secondary)' }}
                    data-testid="player-team-link"
                  >
                    <ArrowLeft className="h-4 w-4" /> Kembali ke {team.name}
                  </Link>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
