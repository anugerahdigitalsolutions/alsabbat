import React from 'react';
import { Link } from 'react-router-dom';

const Row = ({ label, value, to, testId }) => {
  if (!value) return null;
  return (
    <div
      className="flex items-start justify-between gap-4 border-b py-2.5 last:border-b-0"
      style={{ borderColor: 'var(--border-soft)' }}
      data-testid={testId}
    >
      <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
        {label}
      </span>
      {to ? (
        <Link
          to={to}
          className="max-w-[60%] truncate text-right text-sm font-semibold transition-colors duration-200 hover:underline"
          style={{ color: 'var(--club-secondary)' }}
        >
          {value}
        </Link>
      ) : (
        <span className="max-w-[60%] text-right text-sm font-semibold">{value}</span>
      )}
    </div>
  );
};

/** Match Information card. */
export const MatchInfoPanel = ({ match, team, competition, season }) => (
  <div className="als-card p-5" data-testid="match-info-panel">
    <p className="als-section-label mb-4">Informasi Pertandingan</p>
    <div>
      <Row label="Tim" value={team?.name} to={team?.id ? `/teams/${team.id}` : undefined} testId="match-info-team" />
      <Row label="Kompetisi" value={competition?.name} testId="match-info-competition" />
      <Row label="Musim" value={season?.name} testId="match-info-season" />
      <Row label="Lawan" value={match?.opponent?.name} testId="match-info-opponent" />
      <Row label="Lokasi" value={match?.venue} testId="match-info-venue" />
      <Row label="Tipe" value={match?.venue_type} testId="match-info-venue-type" />
      <Row label="Status" value={match?.status} testId="match-info-status" />
      <Row label="Formasi" value={match?.formation} testId="match-info-formation" />
      <Row label="Wasit" value={match?.referee} testId="match-info-referee" />
      <Row
        label="Penonton"
        value={match?.attendance ? match.attendance.toLocaleString('id-ID') : null}
        testId="match-info-attendance"
      />
    </div>
    {match?.result_summary ? (
      <p className="mt-4 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="match-result-summary">
        {match.result_summary}
      </p>
    ) : null}
  </div>
);

export default MatchInfoPanel;
