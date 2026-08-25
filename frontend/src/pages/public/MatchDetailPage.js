import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Newspaper } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { MatchScoreboard } from '../../components/public/matchcenter/MatchScoreboard';
import { MatchInfoPanel } from '../../components/public/matchcenter/MatchInfoPanel';
import { MatchLineupSection } from '../../components/public/matchcenter/MatchLineupSection';
import { MatchTimeline } from '../../components/public/matchcenter/MatchTimeline';
import { MatchMediaPanel } from '../../components/public/matchcenter/MatchMediaPanel';
import { useClub } from '../../context/ClubContext';
import { usePageSeo } from '../../hooks/usePageSeo';

const EMPTY = {
  match: null,
  team: null,
  competition: null,
  season: null,
  lineups: [],
  events: [],
  players: {},
  news: [],
  gallery_albums: [],
  images: [],
  videos: [],
  social_content: [],
};

export default function MatchDetailPage() {
  const { matchId } = useParams();
  const { shortName, clubName, club } = useClub();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const match = data.match;
  const opponentName = match?.opponent?.name;

  usePageSeo({
    title: opponentName ? `${shortName || 'ALSABBAT'} vs ${opponentName}` : 'Match Center',
    description:
      match?.result_summary ||
      match?.description ||
      'Match Center ALSABBAT: informasi pertandingan, susunan pemain, dan timeline kejadian.',
    path: `/matches/${matchId}`,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: payload } = await api.get(`/matches/${matchId}/relations`);
      setData({ ...EMPTY, ...payload });
    } catch (e) {
      setError(apiErrorMessage(e, 'Pertandingan tidak ditemukan atau gagal dimuat.'));
      setData(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="als-container py-12" data-testid="page-match-detail">
        <LoadingState rows={5} testId="match-detail-loading" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="als-container py-12" data-testid="page-match-detail">
        <ErrorState
          message={error || 'Pertandingan tidak ditemukan.'}
          onRetry={load}
          testId="match-detail-error"
        />
        <div className="mt-6">
          <Link
            to="/matches"
            className="inline-flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--club-secondary)' }}
            data-testid="match-detail-back-error"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke daftar pertandingan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-match-detail">
      <MatchScoreboard
        match={match}
        clubName={shortName || clubName}
        clubLogo={club?.logo}
        competition={data.competition}
        season={data.season}
      />

      <div className="als-container py-8 sm:py-10">
        <Link
          to="/matches"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors duration-200 hover:underline"
          style={{ color: 'var(--club-secondary)' }}
          data-testid="match-detail-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Semua pertandingan
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Tabs defaultValue="lineup">
              <TabsList data-testid="match-detail-tabs">
                <TabsTrigger value="lineup" data-testid="match-tab-lineup">
                  Susunan Pemain
                </TabsTrigger>
                <TabsTrigger value="timeline" data-testid="match-tab-timeline">
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="media" data-testid="match-tab-media">
                  Media &amp; Konten
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lineup" className="mt-6">
                <MatchLineupSection
                  lineups={data.lineups}
                  playersById={data.players}
                  formation={match.formation}
                />
              </TabsContent>

              <TabsContent value="timeline" className="mt-6">
                <MatchTimeline
                  events={data.events}
                  playersById={data.players}
                  clubName={shortName || 'ALSABBAT'}
                />
              </TabsContent>

              <TabsContent value="media" className="mt-6">
                <MatchMediaPanel
                  galleryAlbums={data.gallery_albums}
                  images={data.images}
                  videos={data.videos}
                  socialContent={data.social_content}
                />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <MatchInfoPanel
              match={match}
              team={data.team}
              competition={data.competition}
              season={data.season}
            />

            <div className="als-card p-5" data-testid="match-related-news">
              <p className="als-section-label mb-4">Berita Terkait</p>
              {data.news.length ? (
                <div className="space-y-3">
                  {data.news.map((post) => (
                    <Link
                      key={post.id}
                      to={`/news/${post.slug}`}
                      className="block rounded-[var(--radius-sm)] px-2 py-2 transition-colors duration-200 hover:bg-[var(--surface-2)]"
                      data-testid={`match-news-${post.id}`}
                    >
                      <p className="line-clamp-2 text-sm font-semibold">{post.title}</p>
                      {post.excerpt ? (
                        <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
                          {post.excerpt}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={Newspaper}
                  title="Belum ada berita terkait"
                  description="Berita yang ditautkan ke pertandingan ini akan tampil di sini."
                  testId="match-news-empty"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
