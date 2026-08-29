import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Newspaper } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { MatchScoreboard } from '../../components/public/matchcenter/MatchScoreboard';
import { MatchInfoPanel } from '../../components/public/matchcenter/MatchInfoPanel';
import { FormationPitch } from '../../components/public/matchcenter/FormationPitch';
import { MatchStatistics } from '../../components/public/matchcenter/MatchStatistics';
import { MatchdayCountdown } from '../../components/public/MatchdayCountdown';
import { MatchTimeline } from '../../components/public/matchcenter/MatchTimeline';
import { MatchMediaPanel } from '../../components/public/matchcenter/MatchMediaPanel';
import { MatchGallerySection } from '../../components/public/matchcenter/MatchGallerySection';
import { HeadToHeadPanel } from '../../components/public/matchcenter/HeadToHeadPanel';
import { MatchScoreCardGenerator } from '../../components/public/matchcenter/MatchScoreCardGenerator';
import { Reveal } from '../../components/public/Reveal';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
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
  published_gallery_albums: [],
  match_media: [],
  images: [],
  videos: [],
  social_content: [],
  match_report: null,
  head_to_head: null,
};

export default function MatchDetailPage() {
  const { matchId } = useParams();
  const { shortName, clubName, club } = useClub();
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const match = data.match;
  const opponentName = match?.opponent?.name;
  const coverMedia = (data.match_media || []).find((m) => m.file_type === 'IMAGE');
  const heroImage = coverMedia ? resolveMediaUrl(coverMedia.url || coverMedia.thumbnail_url) : null;

  usePageSeo({
    title: opponentName ? `${shortName || 'AL SABBAT'} vs ${opponentName}` : 'Pusat Pertandingan',
    description:
      match?.result_summary ||
      match?.description ||
      'Pusat Pertandingan AL SABBAT: informasi pertandingan, susunan pemain, dan timeline kejadian.',
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
        heroImage={heroImage}
      />

      <div className="als-container py-8 sm:py-12">
        <Link
          to="/matches"
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold transition-colors duration-200 hover:underline"
          style={{ color: 'var(--club-secondary)' }}
          data-testid="match-detail-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Semua pertandingan
        </Link>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
          <Reveal>
            <Tabs defaultValue="lineup">
              <TabsList className="flex w-full flex-wrap justify-start gap-1 h-auto" data-testid="match-detail-tabs">
                <TabsTrigger value="lineup" data-testid="match-tab-lineup">
                  Formasi
                </TabsTrigger>
                <TabsTrigger value="stats" data-testid="match-tab-stats">
                  Statistik
                </TabsTrigger>
                <TabsTrigger value="timeline" data-testid="match-tab-timeline">
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="media" data-testid="match-tab-media">
                  Media &amp; Konten
                </TabsTrigger>
              </TabsList>

              <TabsContent value="lineup" className="mt-6">
                <FormationPitch
                  lineups={data.lineups}
                  playersById={data.players}
                  formation={match.formation}
                />
              </TabsContent>

              <TabsContent value="stats" className="mt-6">
                <MatchStatistics
                  events={data.events}
                  lineups={data.lineups}
                  playersById={data.players}
                />
              </TabsContent>

              <TabsContent value="timeline" className="mt-6">
                <MatchTimeline
                  events={data.events}
                  playersById={data.players}
                  clubName={shortName || 'AL SABBAT'}
                />
              </TabsContent>

              <TabsContent value="media" className="mt-6 space-y-8">
                <MatchGallerySection
                  matchMedia={data.match_media}
                  albums={data.published_gallery_albums}
                />
                <MatchMediaPanel
                  galleryAlbums={data.published_gallery_albums}
                  images={data.images}
                  videos={data.videos}
                  socialContent={data.social_content}
                />
              </TabsContent>
            </Tabs>
          </Reveal>

          <Reveal className="space-y-6" delay={80}>
            <HeadToHeadPanel h2h={data.head_to_head} clubName={shortName || clubName} />

            {data.match_report ? (
              <div className="als-card p-5 sm:p-6" data-testid="match-report-card">
                <p className="als-section-label">Laporan Pertandingan</p>
                <span className="als-gold-rule mt-2" aria-hidden="true" />
                <h2 className="font-display mt-4 text-lg font-bold">{data.match_report.title}</h2>
                {data.match_report.excerpt ? (
                  <p className="mt-2 text-sm leading-[1.8]" style={{ color: 'var(--muted-fg)' }}>
                    {data.match_report.excerpt}
                  </p>
                ) : null}
                <Link
                  to={`/news/${data.match_report.slug}`}
                  className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold transition-colors duration-200 hover:underline"
                  style={{ color: 'var(--club-secondary)' }}
                  data-testid="match-report-link"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Baca laporan pertandingan
                </Link>
              </div>
            ) : null}

            <MatchScoreCardGenerator
              match={match}
              clubName={shortName || clubName}
              clubLogo={club?.logo}
              competitionName={data.competition?.name}
              seasonName={data.season?.name}
            />
          </Reveal>
          </div>

          <Reveal className="space-y-6" delay={120}>
            {['SCHEDULED', 'UPCOMING', 'LIVE', 'POSTPONED'].includes(match.status) ? (
              <MatchdayCountdown match={match} clubName={shortName || clubName} compact showCta={false} />
            ) : null}

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
          </Reveal>
        </div>
      </div>
    </div>
  );
}
