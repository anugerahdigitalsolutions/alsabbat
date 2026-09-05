import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Clock, ListOrdered, MapPin, Trophy, UserCheck } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useClub } from '../../context/ClubContext';
import { useCountdown } from '../../hooks/useCountdown';
import { BarayaTopBar } from '../components/BarayaTopBar';
import { BrzCrest } from '../components/BrzCrest';
import { BrzMatchTimeline } from '../components/BrzMatchTimeline';
import { BrzNewsCard } from '../components/BrzNewsCard';
import { BrzEmpty, BrzError, BrzLoading } from '../components/BrzStates';
import {
  STATUS_LABEL,
  competitionLabel,
  formatDateLong,
  hasScore,
  isLive,
  kickoffAt,
  matchSides,
  matchTime,
} from '../lib/matchUtils';

const pad = (value) => String(value).padStart(2, '0');

const Countdown = ({ kickoff }) => {
  const { running, days, hours, minutes, seconds } = useCountdown(kickoff);
  if (!running) return null;
  const units = [
    { value: pad(days), label: 'HARI' },
    { value: pad(hours), label: 'JAM' },
    { value: pad(minutes), label: 'MNT' },
    { value: pad(seconds), label: 'DTK' },
  ];
  return (
    <div className="mt-4 grid grid-cols-4 gap-2" data-testid="brz-match-countdown">
      {units.map((unit) => (
        <span key={unit.label} className="brz-stat-pill flex-col gap-0 py-1.5" style={{ minHeight: 46 }}>
          <span className="text-[15px] font-bold tabular-nums leading-none">{unit.value}</span>
          <span className="text-[8px] font-semibold tracking-[0.14em]" style={{ color: 'var(--brz-text-dim)' }}>
            {unit.label}
          </span>
        </span>
      ))}
    </div>
  );
};

const TABS = [
  { id: 'events', label: 'Jalannya Laga' },
  { id: 'info', label: 'Info' },
  { id: 'h2h', label: 'Rekor' },
  { id: 'news', label: 'Berita' },
];

/**
 * AL SABBAT — Match detail / Match Center (mobile).
 *
 * Single source: `GET /api/matches/{id}/relations` (existing Match Center payload).
 *
 * READ-ONLY BY DESIGN: this is an information screen. It never offers line-up
 * management — no player selection, starting XI, substitutes, match squad,
 * formation builder or drag-and-drop. `data.players` is used ONLY to resolve
 * player names for existing match events.
 */
export default function MobileMatchDetailScreen() {
  const { matchId } = useParams();
  const { club, shortName } = useClub();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('events');

  const load = React.useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .get(`/matches/${matchId}/relations`)
      .then(({ data: payload }) => setData(payload))
      .catch((e) => setError(apiErrorMessage(e, 'Pertandingan tidak ditemukan.')))
      .finally(() => setLoading(false));
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  const match = data?.match;
  const sides = useMemo(() => matchSides(match || {}, club, shortName), [match, club, shortName]);
  const competition = data?.competition?.name || competitionLabel(match || {});
  const events = data?.events || [];
  const news = (data?.news || []).filter((post) => post.status === 'PUBLISHED');
  const h2h = data?.head_to_head;
  const kickoff = match ? kickoffAt(match) : null;
  const live = isLive(match || {});
  const scored = hasScore(match || {});

  usePageSeo({
    title: match ? `${sides.home.name} vs ${sides.away.name}` : 'Pertandingan',
    description: 'Pusat Pertandingan AL SABBAT Football Club.',
    path: `/matches/${matchId}`,
  });

  if (loading) {
    return (
      <div data-testid="baraya-match-detail">
        <BarayaTopBar back title="Pertandingan" testId="brz-match-topbar" />
        <div className="brz-page">
          <BrzLoading rows={3} height={130} testId="brz-match-loading" />
        </div>
      </div>
    );
  }

  if (error || !match) {
    return (
      <div data-testid="baraya-match-detail">
        <BarayaTopBar back title="Pertandingan" testId="brz-match-topbar" />
        <div className="brz-page">
          <BrzError message={error || 'Pertandingan tidak ditemukan.'} onRetry={load} testId="brz-match-error" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="baraya-match-detail">
      <BarayaTopBar back title={competition} backTo="/matches" testId="brz-match-topbar" />

      <div className="brz-page">
        {/* ------------------------------------------------- score card */}
        <div className="brz-card brz-card--pad relative" data-testid="brz-match-scorecard">
          <div className="mb-3 flex justify-center">
            {live ? (
              <span className="brz-live-badge" data-testid="brz-match-live">
                <span className="brz-live-dot" aria-hidden="true" />
                Live
              </span>
            ) : (
              <span className="brz-badge" data-testid="brz-match-status">
                {STATUS_LABEL[match.status] || match.status}
              </span>
            )}
          </div>

          <div className="flex items-start gap-2">
            {[sides.home, sides.away].map((side, index) => (
              <React.Fragment key={side.isClub ? 'club' : 'opponent'}>
                {index === 1 ? (
                  <div className="flex w-[104px] flex-none flex-col items-center gap-1 pt-2">
                    <span
                      className="text-[34px] font-bold leading-none tabular-nums"
                      style={{ letterSpacing: '-0.04em' }}
                      data-testid="brz-match-score"
                    >
                      {scored ? `${match.home_score}:${match.away_score ?? 0}` : matchTime(match) || 'VS'}
                    </span>
                    <span className="brz-meta" style={{ color: 'var(--brz-text-dim)' }}>
                      {scored ? 'Skor Akhir' : matchTime(match) ? 'WIB' : 'Jadwal'}
                    </span>
                  </div>
                ) : null}
                <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                  <BrzCrest name={side.name} logo={side.logo} size={54} accent={side.isClub} />
                  <span className="brz-clamp-2 w-full text-center text-[13px] font-semibold leading-tight">
                    {side.fullName || side.name}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {!scored && kickoff ? <Countdown kickoff={kickoff} /> : null}

          <div className="mt-4 flex flex-col gap-1.5 border-t pt-3" style={{ borderColor: 'var(--brz-border)' }}>
            <span className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--brz-text-muted)' }}>
              <CalendarDays size={13} aria-hidden="true" />
              {formatDateLong(match.date) || 'Tanggal belum diatur'}
            </span>
            {matchTime(match) ? (
              <span className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--brz-text-muted)' }}>
                <Clock size={13} aria-hidden="true" />
                {matchTime(match)} WIB
              </span>
            ) : null}
            {match.venue ? (
              <span className="flex items-center gap-2 text-[12px]" style={{ color: 'var(--brz-text-muted)' }}>
                <MapPin size={13} className="flex-none" aria-hidden="true" />
                <span className="brz-clamp-1">
                  {match.venue} · {match.venue_type === 'AWAY' ? 'Tandang' : 'Kandang'}
                </span>
              </span>
            ) : null}
          </div>
        </div>

        {/* -------------------------------------------------------- tabs */}
        <div className="brz-hscroll -mx-4 mt-4" role="tablist" aria-label="Detail pertandingan">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={`brz-chip${tab === item.id ? ' brz-chip--active' : ''}`}
              onClick={() => setTab(item.id)}
              data-testid={`brz-match-tab-${item.id}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-4" data-testid={`brz-match-panel-${tab}`}>
          {tab === 'events' ? (
            events.length > 0 ? (
              <BrzMatchTimeline events={events} players={data?.players} testId="brz-match-events" />
            ) : (
              <BrzEmpty
                icon={ListOrdered}
                title="Belum ada kejadian"
                description="Jalannya laga diisi melalui Admin Panel pada modul Match Events."
                testId="brz-match-events-empty"
              />
            )
          ) : null}

          {tab === 'info' ? (
            <div className="flex flex-col gap-2">
              {/* Read-only match information only. The mobile app never shows a
                  line-up, starting XI, substitutes, squad selection or formation. */}
              {[
                { label: 'Kompetisi', value: data?.competition?.name },
                { label: 'Musim', value: data?.season?.name },
                { label: 'Tim', value: data?.team?.name },
                { label: 'Tipe Laga', value: match.venue_type === 'AWAY' ? 'Tandang' : 'Kandang' },
                { label: 'Wasit', value: match.referee },
                { label: 'Penonton', value: match.attendance ? `${match.attendance}` : null },
                { label: 'Ringkasan', value: match.result_summary || match.description },
              ]
                .filter((row) => row.value)
                .map((row) => (
                  <div key={row.label} className="brz-tile flex items-start gap-3 p-3">
                    <span className="brz-meta w-[104px] flex-none">{row.label}</span>
                    <span className="flex-1 text-[13px] font-medium">{row.value}</span>
                  </div>
                ))}
              {!data?.competition?.name &&
              !data?.season?.name &&
              !data?.team?.name &&
              !match.referee &&
              !match.attendance &&
              !match.result_summary &&
              !match.description ? (
                <BrzEmpty
                  icon={UserCheck}
                  title="Belum ada informasi tambahan"
                  description="Detail seperti kompetisi, musim, dan wasit dilengkapi lewat Admin Panel."
                  testId="brz-match-info-empty"
                />
              ) : null}
            </div>
          ) : null}

          {tab === 'h2h' ? (
            h2h && (h2h.played || 0) > 0 ? (
              <div className="brz-card brz-card--pad" data-testid="brz-match-h2h">
                <p className="brz-meta mb-3">Rekor vs {sides.away.isClub ? sides.home.name : sides.away.name}</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: 'Main', value: h2h.played },
                    { label: 'Menang', value: h2h.wins },
                    { label: 'Seri', value: h2h.draws },
                    { label: 'Kalah', value: h2h.losses },
                  ].map((item) => (
                    <span key={item.label} className="brz-stat-pill flex-col gap-0 py-2" style={{ minHeight: 50 }}>
                      <span className="text-[17px] font-bold tabular-nums leading-none">{item.value ?? 0}</span>
                      <span className="text-[9px] font-semibold tracking-[0.1em]" style={{ color: 'var(--brz-text-dim)' }}>
                        {item.label.toUpperCase()}
                      </span>
                    </span>
                  ))}
                </div>
                <p className="brz-body mt-3">
                  Gol: {h2h.goals_scored ?? 0} – {h2h.goals_conceded ?? 0}
                </p>
              </div>
            ) : (
              <BrzEmpty
                icon={Trophy}
                title="Belum ada rekor pertemuan"
                description="Rekor dihitung otomatis dari pertandingan sebelumnya melawan lawan yang sama."
                testId="brz-match-h2h-empty"
              />
            )
          ) : null}

          {tab === 'news' ? (
            news.length > 0 ? (
              <div className="flex flex-col gap-3">
                {news.map((post) => (
                  <BrzNewsCard key={post.id} post={post} />
                ))}
              </div>
            ) : (
              <BrzEmpty
                title="Belum ada berita terkait"
                description="Berita yang ditautkan ke pertandingan ini akan tampil di sini."
                testId="brz-match-news-empty"
              />
            )
          ) : null}
        </div>

        <Link to="/matches" className="brz-btn brz-btn--ghost brz-btn--block mt-5">
          Semua pertandingan
        </Link>
      </div>
    </div>
  );
}
