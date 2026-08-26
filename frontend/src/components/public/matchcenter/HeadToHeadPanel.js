import React from 'react';
import { History } from 'lucide-react';
import { EmptyState } from '../../shared/EmptyState';

const OUTCOME_TONE = {
  WIN: { bg: 'rgba(22,163,74,0.14)', fg: '#166534', label: 'M' },
  DRAW: { bg: 'rgba(252,207,43,0.20)', fg: '#7A5A00', label: 'S' },
  LOSS: { bg: 'rgba(220,38,38,0.12)', fg: '#991B1B', label: 'K' },
};

const Stat = ({ label, value, accent }) => (
  <div className="text-center">
    <p
      className="font-display text-2xl font-extrabold tabular-nums"
      style={{ color: accent ? 'var(--club-secondary)' : '#000000' }}
    >
      {value}
    </p>
    <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--muted-fg)' }}>
      {label}
    </p>
  </div>
);

/** Head-to-head vs the same opponent, derived from existing finished matches. */
export const HeadToHeadPanel = ({ h2h, clubName = 'ALSABBAT' }) => {
  if (!h2h || !h2h.available) {
    return (
      <div className="als-card p-5" data-testid="match-head-to-head">
        <p className="als-section-label mb-4">Head-to-Head</p>
        <EmptyState
          icon={History}
          title="Belum ada riwayat pertemuan"
          description="Rekap pertemuan akan muncul otomatis setelah ada pertandingan selesai melawan lawan ini."
          testId="match-h2h-empty"
        />
      </div>
    );
  }

  return (
    <div className="als-card p-5 sm:p-6" data-testid="match-head-to-head">
      <p className="als-section-label">Head-to-Head</p>
      <span className="als-gold-rule mt-2" aria-hidden="true" />
      <p className="mt-3 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="match-h2h-subtitle">
        {clubName} vs {h2h.opponent} · {h2h.matches_played} pertandingan selesai
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3" data-testid="match-h2h-record">
        <Stat label="Menang" value={h2h.wins} accent />
        <Stat label="Seri" value={h2h.draws} />
        <Stat label="Kalah" value={h2h.losses} />
      </div>

      <div
        className="mt-5 grid grid-cols-2 gap-3 border-t pt-5"
        style={{ borderColor: 'var(--border-soft)' }}
        data-testid="match-h2h-goals"
      >
        <Stat label="Gol dicetak" value={h2h.goals_scored} />
        <Stat label="Gol kebobolan" value={h2h.goals_conceded} />
      </div>

      {h2h.recent?.length ? (
        <div className="mt-5 border-t pt-4" style={{ borderColor: 'var(--border-soft)' }}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted-fg)' }}>
            Pertemuan terakhir
          </p>
          <ul className="space-y-2" data-testid="match-h2h-recent">
            {h2h.recent.map((item) => {
              const tone = OUTCOME_TONE[item.outcome];
              return (
                <li key={item.id} className="flex items-center gap-3 text-sm">
                  <span
                    className="font-display inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ backgroundColor: tone.bg, color: tone.fg }}
                    aria-label={item.outcome}
                  >
                    {tone.label}
                  </span>
                  <span className="tabular-nums font-semibold">
                    {item.club_goals} — {item.opponent_goals}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                    {item.date} · {item.venue_type === 'AWAY' ? 'Away' : item.venue_type === 'NEUTRAL' ? 'Netral' : 'Home'}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

export default HeadToHeadPanel;
