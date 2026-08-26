import React from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { Badge } from '../../ui/badge';
import { EmptyState } from '../../shared/EmptyState';

const POSITION_ROWS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'];

const parseFormation = (formation) => {
  if (!formation) return null;
  const parts = String(formation)
    .split(/[-–\s]+/)
    .map((p) => parseInt(p, 10))
    .filter((n) => Number.isInteger(n) && n > 0 && n < 11);
  if (parts.length < 2) return null;
  return parts;
};

const positionRank = (entry) => {
  const pos = entry.position || entry.player_position;
  const index = POSITION_ROWS.indexOf(pos);
  return index === -1 ? 2 : index;
};

/** Build pitch rows: GK first, then formation lines (or position groups as fallback). */
const buildRows = (starters, formation) => {
  const sorted = [...starters].sort(
    (a, b) => positionRank(a) - positionRank(b) || (a.display_order ?? 0) - (b.display_order ?? 0)
  );
  const keepers = sorted.filter((e) => (e.position || '') === 'GOALKEEPER');
  const outfield = sorted.filter((e) => (e.position || '') !== 'GOALKEEPER');

  const shape = parseFormation(formation);
  if (shape) {
    const rows = [];
    let cursor = 0;
    shape.forEach((count) => {
      rows.push(outfield.slice(cursor, cursor + count));
      cursor += count;
    });
    const leftover = outfield.slice(cursor);
    if (leftover.length) rows.push(leftover);
    return [keepers, ...rows].filter((row) => row.length);
  }

  const groups = POSITION_ROWS.map((pos) => sorted.filter((e) => (e.position || 'MIDFIELDER') === pos));
  const unknown = sorted.filter((e) => !POSITION_ROWS.includes(e.position || ''));
  return [...groups, unknown].filter((row) => row.length);
};

const Marker = ({ entry, player, testId }) => {
  const name = player ? player.display_name || player.full_name : entry.note || 'Pemain';
  const number = entry.shirt_number ?? player?.jersey_number;
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const body = (
    <>
      <span className="relative block">
        <span
          className="font-display flex h-12 w-12 items-center justify-center overflow-hidden rounded-full text-sm font-bold sm:h-14 sm:w-14"
          style={{
            backgroundColor: 'rgba(254,254,254,0.10)',
            border: '2px solid var(--club-primary)',
            color: 'var(--club-primary)',
          }}
        >
          {player?.photo ? (
            <img src={player.photo} alt={name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            initials
          )}
        </span>
        {number !== null && number !== undefined ? (
          <span
            className="font-display absolute -bottom-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          >
            {number}
          </span>
        ) : null}
        {entry.is_captain ? (
          <span
            className="font-display absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
            style={{ backgroundColor: 'var(--club-light)', color: '#000000' }}
            title="Kapten"
          >
            C
          </span>
        ) : null}
      </span>
      <span
        className="font-display mt-1.5 block max-w-[86px] truncate text-center text-[11px] font-semibold"
        style={{ color: 'var(--club-light)' }}
      >
        {name}
      </span>
    </>
  );

  const cls = 'als-focus flex flex-col items-center';
  return player?.id ? (
    <Link to={`/players/${player.id}`} className={cls} data-testid={testId} aria-label={`Profil ${name}`}>
      {body}
    </Link>
  ) : (
    <div className={cls} data-testid={testId}>
      {body}
    </div>
  );
};

const SubstituteRow = ({ entry, player, testId }) => {
  const name = player ? player.display_name || player.full_name : 'Pemain';
  const number = entry.shirt_number ?? player?.jersey_number;
  const label = entry.position_label || entry.position || player?.position;
  const inner = (
    <>
      <span
        className="font-display flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-sm font-bold tabular-nums"
        style={{ backgroundColor: 'rgba(1,40,145,0.07)', color: 'var(--club-secondary)' }}
      >
        {number ?? '-'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{name}</span>
        {label ? (
          <span className="block text-xs" style={{ color: 'var(--muted-fg)' }}>
            {label}
          </span>
        ) : null}
      </span>
      {entry.role === 'UNUSED_SUBSTITUTE' ? (
        <Badge variant="outline" className="shrink-0 text-[10px]">
          Tidak bermain
        </Badge>
      ) : null}
    </>
  );
  const cls =
    'als-focus flex items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2 transition-colors duration-200 hover:bg-[var(--surface-2)]';
  return player?.id ? (
    <Link to={`/players/${player.id}`} className={cls} data-testid={testId}>
      {inner}
    </Link>
  ) : (
    <div className={cls} data-testid={testId}>
      {inner}
    </div>
  );
};

/** Visual formation pitch built from existing MatchLineup documents. */
export const FormationPitch = ({ lineups = [], playersById = {}, formation }) => {
  const starters = lineups.filter((l) => l.role === 'STARTING');
  const substitutes = lineups.filter((l) => l.role === 'SUBSTITUTE' || l.role === 'UNUSED_SUBSTITUTE');

  if (!lineups.length) {
    return (
      <EmptyState
        icon={Users}
        title="Susunan pemain belum tersedia"
        description="Susunan pemain inti dan cadangan akan tampil di sini setelah diinput melalui Admin Panel."
        testId="match-lineup-empty"
      />
    );
  }

  const rows = buildRows(starters, formation);
  const shapeValid = !!parseFormation(formation);

  return (
    <div className="space-y-6" data-testid="match-formation-section">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
          Formasi
        </span>
        {shapeValid ? (
          <Badge
            variant="outline"
            className="font-display font-bold"
            style={{ backgroundColor: 'rgba(1,40,145,0.06)', color: 'var(--club-secondary)' }}
            data-testid="match-formation-label"
          >
            {formation}
          </Badge>
        ) : (
          <span className="text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="match-formation-label">
            Formasi belum tersedia
          </span>
        )}
        <span className="text-xs tabular-nums" style={{ color: 'var(--muted-fg)' }} data-testid="match-starters-count">
          {starters.length} pemain starting
        </span>
      </div>

      {starters.length ? (
        <div
          className="als-card relative overflow-hidden p-4 sm:p-6"
          style={{ backgroundColor: '#000000', borderColor: 'rgba(252,207,43,0.22)' }}
          data-testid="match-formation-pitch"
        >
          <div
            className="absolute inset-4 rounded-[var(--radius-md)] sm:inset-6"
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(1,40,145,0.35) 0%, rgba(0,0,0,0.9) 100%)',
              border: '1px solid rgba(254,254,254,0.18)',
            }}
            aria-hidden="true"
          />
          <div
            className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full sm:h-32 sm:w-32"
            style={{ border: '1px solid rgba(254,254,254,0.18)' }}
            aria-hidden="true"
          />
          <div
            className="absolute left-4 right-4 top-1/2 h-px sm:left-6 sm:right-6"
            style={{ backgroundColor: 'rgba(254,254,254,0.18)' }}
            aria-hidden="true"
          />
          <div
            className="absolute left-1/2 top-4 h-14 w-40 -translate-x-1/2 rounded-b-[10px] sm:top-6 sm:w-56"
            style={{ border: '1px solid rgba(254,254,254,0.18)', borderTop: 'none' }}
            aria-hidden="true"
          />
          <div
            className="absolute bottom-4 left-1/2 h-14 w-40 -translate-x-1/2 rounded-t-[10px] sm:bottom-6 sm:w-56"
            style={{ border: '1px solid rgba(254,254,254,0.18)', borderBottom: 'none' }}
            aria-hidden="true"
          />

          <div className="relative flex flex-col gap-6 py-6 sm:gap-8 sm:py-8">
            {rows.map((row, rowIndex) => (
              <div
                key={`row-${rowIndex}`}
                className="flex flex-wrap items-start justify-center gap-x-4 gap-y-5 sm:gap-x-8"
                data-testid={`match-formation-row-${rowIndex}`}
              >
                {row.map((entry) => (
                  <Marker
                    key={entry.id}
                    entry={entry}
                    player={playersById?.[entry.player_id]}
                    testId={`match-formation-marker-${entry.id}`}
                  />
                ))}
              </div>
            ))}
          </div>

          <p
            className="font-display relative mt-2 text-center text-[10px] font-semibold uppercase tracking-[0.24em]"
            style={{ color: 'rgba(254,254,254,0.45)' }}
          >
            Lawan
          </p>
        </div>
      ) : null}

      {starters.length && starters.length < 11 ? (
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="match-formation-partial-note">
          Pemain inti belum lengkap: {starters.length} dari 11 pemain sudah diinput.
        </p>
      ) : null}

      <div className="als-card p-5" data-testid="match-substitutes">
        <div className="mb-4 flex items-center justify-between">
          <p className="als-section-label">Pemain Cadangan</p>
          <span className="text-xs tabular-nums" style={{ color: 'var(--muted-fg)' }}>
            {substitutes.length} pemain
          </span>
        </div>
        {substitutes.length ? (
          <div className="space-y-1">
            {substitutes.map((entry) => (
              <SubstituteRow
                key={entry.id}
                entry={entry}
                player={playersById?.[entry.player_id]}
                testId={`match-substitute-${entry.id}`}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            Pemain cadangan belum diinput.
          </p>
        )}
      </div>
    </div>
  );
};

export default FormationPitch;
