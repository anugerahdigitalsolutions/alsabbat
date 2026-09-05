import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { User } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { usePageSeo } from '../../hooks/usePageSeo';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { BarayaTopBar } from '../components/BarayaTopBar';
import { BrzLightbox } from '../components/BrzLightbox';
import { BrzError, BrzLoading } from '../components/BrzStates';
import { POSITION_LABEL } from '../components/BrzPlayerCard';

const STAT_ROWS = [
  { key: 'appearances', label: 'Main' },
  { key: 'goals', label: 'Gol' },
  { key: 'assists', label: 'Assist' },
  { key: 'yellow_cards', label: 'Kuning' },
  { key: 'red_cards', label: 'Merah' },
];

/** AL SABBAT — Player detail (`/api/players/{id}` + `/statistics`). */
export default function MobilePlayerDetailScreen() {
  const { playerId } = useParams();
  const [player, setPlayer] = useState(null);
  const [team, setTeam] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lightbox, setLightbox] = useState(-1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/players/${playerId}`);
      setPlayer(data);
      if (data.team_id) {
        api
          .get(`/teams/${data.team_id}`)
          .then((res) => setTeam(res.data))
          .catch(() => {});
      }
      api
        .get(`/players/${playerId}/statistics`)
        .then((res) => setStats(res.data))
        .catch(() => {});
    } catch (e) {
      setError(apiErrorMessage(e, 'Pemain tidak ditemukan.'));
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    load();
  }, [load]);

  usePageSeo({
    title: player ? player.display_name || player.full_name : 'Pemain',
    description: 'Profil pemain AL SABBAT Football Club.',
    path: `/players/${playerId}`,
  });

  if (loading) {
    return (
      <div data-testid="baraya-player-detail">
        <BarayaTopBar back title="Pemain" testId="brz-player-topbar" />
        <div className="brz-page">
          <BrzLoading rows={2} height={180} testId="brz-player-loading" />
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div data-testid="baraya-player-detail">
        <BarayaTopBar back title="Pemain" backTo="/teams" testId="brz-player-topbar" />
        <div className="brz-page">
          <BrzError message={error || 'Pemain tidak ditemukan.'} onRetry={load} testId="brz-player-error" />
        </div>
      </div>
    );
  }

  const photo = resolveMediaUrl(player.photo);
  const name = player.display_name || player.full_name;
  const gallery = (player.gallery_images || []).map((url, position) => ({
    id: `g-${position}`,
    file_type: 'IMAGE',
    url: resolveMediaUrl(url),
    thumbnail_url: resolveMediaUrl(url),
  }));
  const totals = stats?.totals || stats || {};

  const infoRows = [
    { label: 'Posisi', value: POSITION_LABEL[player.position] || player.position },
    { label: 'Nomor', value: player.jersey_number ?? null },
    { label: 'Tim', value: team?.name },
    { label: 'Kebangsaan', value: player.nationality },
    { label: 'Tinggi', value: player.height_cm ? `${player.height_cm} cm` : null },
    { label: 'Berat', value: player.weight_kg ? `${player.weight_kg} kg` : null },
  ].filter((row) => row.value !== null && row.value !== undefined && row.value !== '');

  return (
    <div data-testid="baraya-player-detail">
      <BarayaTopBar back title="Pemain" backTo="/teams" testId="brz-player-topbar" />

      <div className="brz-page">
        <div className="brz-card relative overflow-hidden" data-testid="brz-player-hero">
          <div className="relative h-[260px] w-full" style={{ backgroundColor: 'var(--brz-surface-sunken)' }}>
            {photo ? (
              <img src={photo} alt={name} className="brz-img" />
            ) : (
              <span className="flex h-full w-full items-center justify-center">
                <User size={46} style={{ color: 'var(--brz-text-dim)' }} aria-hidden="true" />
              </span>
            )}
            <span className="brz-scrim" aria-hidden="true" />
            <span className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
              <span className="min-w-0">
                <span className="brz-clamp-2 block text-[20px] font-bold leading-tight">{name}</span>
                <span className="brz-meta mt-1 block">{POSITION_LABEL[player.position] || player.position}</span>
              </span>
              {player.jersey_number !== null && player.jersey_number !== undefined ? (
                <span
                  className="text-[38px] font-bold leading-none tabular-nums"
                  style={{ color: 'var(--brz-accent)', letterSpacing: '-0.04em' }}
                >
                  {player.jersey_number}
                </span>
              ) : null}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-5 gap-1.5" data-testid="brz-player-stats">
          {STAT_ROWS.map((row) => (
            <span key={row.key} className="brz-stat-pill flex-col gap-0 py-2" style={{ minHeight: 52 }}>
              <span className="text-[16px] font-bold tabular-nums leading-none">
                {totals?.[row.key] ?? player[row.key] ?? 0}
              </span>
              <span className="text-[8.5px] font-semibold tracking-[0.08em]" style={{ color: 'var(--brz-text-dim)' }}>
                {row.label.toUpperCase()}
              </span>
            </span>
          ))}
        </div>

        {infoRows.length > 0 ? (
          <div className="mt-4 flex flex-col gap-2">
            {infoRows.map((row) => (
              <div key={row.label} className="brz-tile flex items-center gap-3 p-3">
                <span className="brz-meta w-[104px] flex-none">{row.label}</span>
                <span className="flex-1 text-[13px] font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {player.bio ? (
          <p className="brz-body mt-4 whitespace-pre-line" data-testid="brz-player-bio">
            {player.bio}
          </p>
        ) : null}

        {gallery.length > 0 ? (
          <div className="mt-5">
            <p className="brz-label mb-2">Galeri Pemain</p>
            <div className="grid grid-cols-3 gap-1.5">
              {gallery.map((item, position) => (
                <button
                  key={item.id}
                  type="button"
                  className="aspect-square overflow-hidden rounded-[10px]"
                  style={{ backgroundColor: 'var(--brz-surface-sunken)' }}
                  onClick={() => setLightbox(position)}
                  aria-label={`Foto ${position + 1}`}
                >
                  <img src={item.thumbnail_url} alt="" className="brz-img" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {lightbox >= 0 ? <BrzLightbox items={gallery} index={lightbox} onClose={() => setLightbox(-1)} /> : null}
    </div>
  );
}
