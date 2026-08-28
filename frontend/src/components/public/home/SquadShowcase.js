import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users } from 'lucide-react';
import { EmptyState } from '../../shared/EmptyState';

const POSITION_LABEL = {
  GOALKEEPER: 'Penjaga Gawang',
  DEFENDER: 'Belakang',
  MIDFIELDER: 'Tengah',
  FORWARD: 'Depan',
};

const PlayerCard = ({ player, index }) => (
  <Link
    to={`/players/${player.id}`}
    className="als-tile als-lift group relative block min-h-[260px] focus-visible:outline-none focus-visible:ring-2 sm:min-h-[320px]"
    style={{ '--tw-ring-color': 'var(--focus-ring)', animation: `als-reveal-in 620ms var(--ease-out) ${index * 70}ms both` }}
    data-testid={`home-player-card-${player.id}`}
  >
    {player.photo ? (
      <img
        src={player.photo}
        alt={player.display_name || player.full_name}
        className="absolute inset-0 h-full w-full object-cover object-top"
        loading="lazy"
        decoding="async"
      />
    ) : (
      <>
        <span className="als-stadium-glow absolute inset-0" aria-hidden="true" />
        <span className="als-jersey-ghost absolute inset-0 flex items-center justify-center text-[5.5rem]" aria-hidden="true">
          {player.jersey_number ?? ''}
        </span>
      </>
    )}
    <span className="als-scrim-bottom absolute inset-0" aria-hidden="true" />

    <span
      className="font-display absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-extrabold tabular-nums"
      style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
    >
      #{player.jersey_number ?? '-'}
    </span>

    <span className="relative flex h-full flex-col justify-end p-4 sm:p-5">
      <span className="font-display truncate text-base font-bold" style={{ color: 'var(--club-light)' }}>
        {player.display_name || player.full_name}
      </span>
      <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--club-primary)' }}>
        {POSITION_LABEL[player.position] || player.position || 'Pemain'}
      </span>
      <span
        className="als-media-overlay mt-3 inline-flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: 'var(--club-light)' }}
      >
        Lihat Profil <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </span>
  </Link>
);

/** AL SABBAT has exactly one squad — a single flat grid, never a team selector. */
export const SquadShowcase = ({ players = [], limit = 8 }) => {
  if (!players.length) {
    return (
      <EmptyState
        icon={Users}
        title="Belum ada pemain"
        description="Daftar pemain akan tampil setelah pemain ditambahkan."
        testId="home-squad-empty"
      />
    );
  }
  return (
    <div className="als-media-tile grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" data-testid="home-squad-grid">
      {players.slice(0, limit).map((player, index) => (
        <PlayerCard key={player.id} player={player} index={index} />
      ))}
    </div>
  );
};

export default SquadShowcase;
