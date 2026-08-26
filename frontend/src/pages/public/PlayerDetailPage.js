import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Shirt } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { Reveal } from '../../components/public/Reveal';
import { PlayerSeasonStats } from '../../components/public/PlayerSeasonStats';
import { Badge } from '../../components/ui/badge';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useScrollReveal } from '../../hooks/useScrollReveal';

const POSITION_LABEL = {
  GOALKEEPER: 'Penjaga Gawang',
  DEFENDER: 'Belakang',
  MIDFIELDER: 'Tengah',
  FORWARD: 'Depan',
};

const PlayerHero = ({ player, team }) => {
  const [ref, shown] = useScrollReveal({ threshold: 0.01 });
  const revealClass = shown ? 'als-reveal-shown' : 'als-reveal-hidden';
  const step = (index) => ({ animationDelay: shown ? `${80 * index}ms` : undefined });

  return (
    <section
      ref={ref}
      className="relative overflow-hidden"
      style={{ backgroundColor: 'var(--club-tertiary)' }}
      data-testid="player-hero"
    >
      <div className="als-stadium-glow absolute inset-0 opacity-80" aria-hidden="true" />
      <div className="als-pitch-lines absolute inset-0" aria-hidden="true" />
      <span
        className="als-jersey-ghost pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[7rem] sm:right-10 sm:text-[13rem]"
        aria-hidden="true"
      >
        {player?.jersey_number ?? ''}
      </span>

      <div className="als-container relative py-10 sm:py-14">
        <nav
          className={`mb-6 flex flex-wrap items-center gap-1 text-xs ${revealClass}`}
          style={{ color: 'rgba(254,254,254,0.6)' }}
          aria-label="Breadcrumb"
        >
          <Link to="/" className="min-h-[24px] font-medium hover:text-[var(--club-primary)]">Beranda</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link to="/teams" className="min-h-[24px] font-medium hover:text-[var(--club-primary)]">Skuad</Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span>{player?.display_name || player?.full_name || 'Pemain'}</span>
        </nav>

        <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
          <div
            className={`als-card relative h-64 w-52 shrink-0 overflow-hidden sm:h-80 sm:w-64 ${revealClass}`}
            style={{ backgroundColor: 'rgba(254,254,254,0.05)', borderColor: 'rgba(252,207,43,0.28)', ...step(1) }}
          >
            {player?.photo ? (
              <img
                src={player.photo}
                alt={player.full_name}
                className="h-full w-full object-cover object-top"
                loading="eager"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                <Shirt className="h-16 w-16" style={{ color: 'rgba(252,207,43,0.5)' }} />
              </span>
            )}
          </div>

          <div className="min-w-0">
            <p
              className={`font-display text-[11px] font-semibold uppercase tracking-[0.26em] ${revealClass}`}
              style={{ color: 'var(--club-primary)', ...step(2) }}
            >
              Profil Pemain
            </p>
            <h1
              className={`font-display mt-3 text-3xl font-bold leading-[1.05] sm:text-5xl ${revealClass}`}
              style={{ color: 'var(--club-light)', ...step(3) }}
            >
              {player?.full_name || 'Profil Pemain'}
            </h1>
            <span className={`als-gold-rule mt-5 ${revealClass}`} style={step(4)} aria-hidden="true" />
            <div
              className={`mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm ${revealClass}`}
              style={{ color: 'rgba(254,254,254,0.8)', ...step(5) }}
              data-testid="player-hero-meta"
            >
              <span className="font-display text-2xl font-extrabold" style={{ color: 'var(--club-primary)' }}>
                #{player?.jersey_number ?? '-'}
              </span>
              {player?.position ? (
                <span className="font-display font-semibold uppercase tracking-[0.16em]">
                  {POSITION_LABEL[player.position] || player.position}
                </span>
              ) : null}
              {team ? (
                <Link
                  to={`/teams/${team.id}`}
                  className="min-h-[24px] font-semibold transition-colors duration-200 hover:text-[var(--club-primary)]"
                  data-testid="player-hero-team-link"
                >
                  {team.name}
                </Link>
              ) : null}
              {player?.nationality ? <span>{player.nationality}</span> : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

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
    ['Posisi', player?.position ? POSITION_LABEL[player.position] || player.position : null],
    ['Nomor Punggung', player?.jersey_number],
    ['Kebangsaan', player?.nationality],
    ['Tanggal Lahir', player?.date_of_birth],
    ['Tinggi', player?.height_cm ? `${player.height_cm} cm` : null],
    ['Berat', player?.weight_kg ? `${player.weight_kg} kg` : null],
  ].filter(([, value]) => value !== null && value !== undefined && value !== '');

  if (loading) {
    return (
      <div className="als-container py-12" data-testid="page-player-detail">
        <LoadingState variant="text" testId="player-detail-loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="als-container py-12" data-testid="page-player-detail">
        <ErrorState message={error} onRetry={load} testId="player-detail-error" />
        <Link
          to="/teams"
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--club-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Squad
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="page-player-detail">
      <PlayerHero player={player} team={team} />

      <div className="als-container py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            {facts.length ? (
              <Reveal className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {facts.map(([label, value]) => (
                  <div key={label} className="als-card p-4" data-testid={`player-fact-${label}`}>
                    <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                      {label}
                    </p>
                    <p className="font-display mt-1 text-base font-bold">{value}</p>
                  </div>
                ))}
              </Reveal>
            ) : null}

            <Reveal delay={80}>
              <PlayerSeasonStats playerId={playerId} />
            </Reveal>

            <Reveal className="als-card p-6 sm:p-8" delay={80}>
              <p className="als-section-label">Biografi</p>
              <span className="als-gold-rule mt-2" aria-hidden="true" />
              <p
                className="mt-4 text-sm leading-[1.85]"
                style={{ color: 'var(--muted-fg)' }}
                data-testid="player-bio"
              >
                {player?.bio || 'Biografi pemain belum tersedia.'}
              </p>
            </Reveal>
          </div>

          <Reveal className="space-y-4" delay={140}>
            <div className="als-card p-5">
              <p className="als-section-label mb-3">Status</p>
              <Badge
                variant="outline"
                style={{ backgroundColor: 'rgba(252,207,43,0.16)', borderColor: 'rgba(252,207,43,0.55)' }}
                data-testid="player-status"
              >
                {player?.status}
              </Badge>
              {team ? (
                <Link
                  to={`/teams/${team.id}`}
                  className="mt-5 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"
                  style={{ color: 'var(--club-secondary)' }}
                  data-testid="player-team-link"
                >
                  <ArrowLeft className="h-4 w-4" /> Kembali ke {team.name}
                </Link>
              ) : null}
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
