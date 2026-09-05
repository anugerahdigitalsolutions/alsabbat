import React from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';

export const POSITION_LABEL = {
  GOALKEEPER: 'Kiper',
  DEFENDER: 'Bek',
  MIDFIELDER: 'Gelandang',
  FORWARD: 'Penyerang',
};

/**
 * Player card for the mobile squad rail / grid.
 * Uses the real `/api/players` payload (photo, jersey_number, position).
 */
export const BrzPlayerCard = ({ player, variant = 'tile', testId }) => {
  const id = testId || `brz-player-${player.id}`;
  const photo = resolveMediaUrl(player.photo);
  const name = player.display_name || player.full_name;
  const position = POSITION_LABEL[player.position] || player.position;

  if (variant === 'row') {
    return (
      <Link to={`/players/${player.id}`} className="brz-card brz-card--pad flex items-center gap-3" data-testid={id}>
        {photo ? (
          <img src={photo} alt="" className="brz-avatar" style={{ width: 46, height: 46 }} loading="lazy" />
        ) : (
          <span className="brz-avatar" style={{ width: 46, height: 46, color: 'var(--brz-text-dim)' }}>
            <User size={20} aria-hidden="true" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="brz-clamp-1 block text-[14px] font-semibold">{name}</span>
          <span className="brz-meta block">{position}</span>
        </span>
        {player.jersey_number !== null && player.jersey_number !== undefined ? (
          <span
            className="text-[19px] font-bold tabular-nums"
            style={{ color: 'var(--brz-accent)', letterSpacing: '-0.02em' }}
          >
            {player.jersey_number}
          </span>
        ) : null}
      </Link>
    );
  }

  return (
    <Link
      to={`/players/${player.id}`}
      className="brz-card flex w-[104px] flex-none flex-col items-center gap-2 p-3"
      data-testid={id}
    >
      <span className="relative">
        {photo ? (
          <img src={photo} alt="" className="brz-avatar" style={{ width: 58, height: 58 }} loading="lazy" />
        ) : (
          <span className="brz-avatar" style={{ width: 58, height: 58, color: 'var(--brz-text-dim)' }}>
            <User size={22} aria-hidden="true" />
          </span>
        )}
        {player.jersey_number !== null && player.jersey_number !== undefined ? (
          <span
            className="absolute -bottom-1 -right-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
            style={{ backgroundImage: 'var(--brz-accent-grad)', color: 'var(--brz-on-accent)' }}
          >
            {player.jersey_number}
          </span>
        ) : null}
      </span>
      <span className="brz-clamp-1 w-full text-center text-[12.5px] font-semibold">{name}</span>
      <span className="brz-clamp-1 w-full text-center text-[10.5px]" style={{ color: 'var(--brz-text-dim)' }}>
        {position}
      </span>
    </Link>
  );
};

export default BrzPlayerCard;
