import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Clock, Images, MapPin, Newspaper, Shield, Swords, Trophy, Users } from 'lucide-react';
import { CinematicHero } from '../../components/public/CinematicHero';
import { AlbumCard } from '../../components/public/gallery/AlbumCard';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { SectionShell } from '../../components/public/SectionShell';
import { NewsCardShell } from '../../components/public/NewsCardShell';
import { SponsorsStrip } from '../../components/public/SponsorsStrip';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useResourceList } from '../../hooks/useResourceList';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useClub } from '../../context/ClubContext';

const UPCOMING = ['SCHEDULED', 'UPCOMING', 'LIVE', 'POSTPONED'];

const formatDate = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

const sides = (match, shortName) => {
  const isHome = match?.venue_type !== 'AWAY';
  return {
    home: isHome ? shortName : match?.opponent?.name,
    away: isHome ? match?.opponent?.name : shortName,
  };
};

/** Premium matchday / result card (uses only real match data). */
const MatchFeatureCard = ({ match, shortName, kind, testId }) => {
  const { home, away } = sides(match, shortName);
  const hasScore = match.home_score !== null && match.home_score !== undefined;
  return (
    <article className="als-card als-lift overflow-hidden" data-testid={testId}>
      <div className="flex items-center justify-between gap-2 px-5 py-3" style={{ backgroundColor: 'var(--club-tertiary)' }}>
        <span className="font-display text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--club-primary)' }}>
          {kind === 'next' ? 'Next Match' : 'Full Time'}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'rgba(254,254,254,0.62)' }}>
          {match.venue_type}
        </span>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between gap-3">
          <span className="font-display flex-1 text-right text-base font-bold sm:text-lg">{home}</span>
          <span
            className="font-display min-w-[86px] rounded-[var(--radius-sm)] px-3 py-2 text-center text-xl font-extrabold tabular-nums"
            style={{ backgroundColor: 'rgba(1,40,145,0.07)', color: 'var(--club-secondary)' }}
          >
            {hasScore ? `${match.home_score} - ${match.away_score ?? 0}` : 'VS'}
          </span>
          <span className="font-display flex-1 text-left text-base font-bold sm:text-lg">{away}</span>
        </div>

        <ul className="mt-6 space-y-2 text-xs sm:text-sm" style={{ color: 'var(--muted-fg)' }}>
          <li className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0" />
            {formatDate(match.date) || 'Tanggal belum diatur'}
          </li>
          {match.time ? (
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0" />
              {match.time} WIB
            </li>
          ) : null}
          {match.venue ? (
            <li className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" />
              {match.venue}
            </li>
          ) : null}
        </ul>

        <Link
          to={`/matches/${match.id}`}
          className="als-lift font-display mt-6 inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-sm)] px-4 py-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A', '--tw-ring-color': 'var(--focus-ring)' }}
          data-testid={`${testId}-cta`}
        >
          View Match
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
};

export default function HomePage() {
  const { club, clubName, shortName } = useClub();
  usePageSeo({
    title: 'Beranda',
    description: club?.description || `Website resmi ${clubName}: jadwal, hasil, skuad, berita, dan galeri klub.`,
    path: '/',
  });

  const news = useResourceList('/content/posts', { status: 'PUBLISHED', limit: 3 });
  const matches = useResourceList('/matches', { limit: 40 });
  const albums = useResourceList('/gallery/public/albums', { limit: 4 });
  const teams = useResourceList('/teams', { status: 'ACTIVE', limit: 20 });
  const players = useResourceList('/players', { status: 'ACTIVE', limit: 8 });
  const sponsors = useResourceList('/sponsors', { status: 'ACTIVE', limit: 10 });
  const achievements = useResourceList('/achievements', { status: 'ACTIVE', limit: 4 });

  const upcoming = matches.items.filter((m) => UPCOMING.includes(m.status));
  const finished = matches.items.filter((m) => m.status === 'FINISHED');
  const nextMatch = upcoming[upcoming.length - 1] || null;
  const lastMatch = finished[0] || null;

  const stats = [
    { id: 'teams', label: 'Tim Aktif', value: teams.loading ? '—' : teams.total },
    { id: 'players', label: 'Pemain', value: players.loading ? '—' : players.total },
    { id: 'matches', label: 'Pertandingan', value: matches.loading ? '—' : matches.total },
    { id: 'trophies', label: 'Prestasi', value: achievements.loading ? '—' : achievements.total },
  ];

  const heroSlides = useMemo(() => {
    const club_ = shortName || 'ALSABBAT';
    const galleryCover = resolveMediaUrl(albums.items[0]?.cover_url_resolved);
    const slides = [];

    if (nextMatch) {
      const { home, away } = sides(nextMatch, club_);
      slides.push({
        id: `match-${nextMatch.id}`,
        eyebrow: 'Matchday',
        headline: `${home} vs ${away}`,
        subheadline: nextMatch.time ? `Kick-off ${nextMatch.time} WIB` : null,
        meta: [formatDate(nextMatch.date), nextMatch.venue].filter(Boolean).join(' · '),
        ctaLabel: 'Match Details',
        ctaTo: `/matches/${nextMatch.id}`,
        image: resolveMediaUrl(nextMatch.match_cover) || galleryCover,
        alt: `Pertandingan ${home} melawan ${away}`,
      });
    }

    if (lastMatch && lastMatch.home_score !== null && lastMatch.home_score !== undefined) {
      const { home, away } = sides(lastMatch, club_);
      slides.push({
        id: `result-${lastMatch.id}`,
        eyebrow: 'Latest Result',
        headline: `${home} ${lastMatch.home_score} — ${lastMatch.away_score ?? 0} ${away}`,
        subheadline: 'Full Time',
        meta: [formatDate(lastMatch.date), lastMatch.venue].filter(Boolean).join(' · '),
        ctaLabel: 'View Match',
        ctaTo: `/matches/${lastMatch.id}`,
        image: resolveMediaUrl(lastMatch.match_cover) || galleryCover,
        alt: `Hasil pertandingan ${home} melawan ${away}`,
      });
    }

    const post = news.items[0];
    if (post) {
      slides.push({
        id: `news-${post.id}`,
        eyebrow: 'Latest News',
        headline: post.title,
        meta: post.excerpt || null,
        ctaLabel: 'Baca Berita',
        ctaTo: `/news/${post.slug}`,
        image: resolveMediaUrl(post.thumbnail) || galleryCover,
        alt: post.title,
      });
    }

    const album = albums.items[0];
    if (album) {
      slides.push({
        id: `album-${album.id}`,
        eyebrow: 'Match Moments',
        headline: album.title,
        meta: `${album.photo_count || 0} foto · ${album.video_count || 0} video`,
        ctaLabel: 'View Gallery',
        ctaTo: `/gallery/${album.id}`,
        secondaryLabel: 'Semua album',
        secondaryTo: '/gallery',
        image: resolveMediaUrl(album.cover_url_resolved),
        alt: album.title,
      });
    }

    return slides;
  }, [nextMatch, lastMatch, news.items, albums.items, shortName]);

  return (
    <div data-testid="page-home">
      <CinematicHero slides={heroSlides} stats={stats} clubName={clubName} />

      {/* Club introduction */}
      <SectionShell label="Tentang" title={`Tentang ${club?.short_name || 'ALSABBAT'}`} testId="home-section-about">
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="als-card p-6 sm:p-7">
            <p className="text-sm leading-relaxed sm:text-base" style={{ color: 'var(--muted-fg)' }} data-testid="home-about-text">
              {club?.description || 'Profil klub belum diatur. Informasi akan tampil setelah dilengkapi pada konfigurasi klub.'}
            </p>
            <Link to="/club" className="mt-6 inline-block" data-testid="home-about-readmore">
              <Button className="font-semibold" style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}>
                Selengkapnya
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="als-card p-6">
            <p className="als-section-label mb-4">Info Klub</p>
            <ul className="space-y-3 text-sm">
              {[
                ['Berdiri', club?.founded_date],
                ['Lokasi', club?.location],
                ['Markas', club?.stadium],
              ].map(([label, value]) => (
                <li key={label} className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--muted-fg)' }}>{label}</span>
                  <span className="font-semibold">{value || 'Belum diatur'}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionShell>

      {/* Next match + last result */}
      <SectionShell
        label="Matchday"
        title="Pertandingan Berikutnya &amp; Hasil Terakhir"
        actionTo="/matches"
        actionLabel="Semua pertandingan"
        dark
        testId="home-section-matchday"
      >
        {matches.loading ? (
          <LoadingState rows={2} testId="home-matchday-loading" />
        ) : matches.error ? (
          <ErrorState message={matches.error} onRetry={matches.reload} testId="home-matchday-error" />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <p className="als-section-label mb-3">Next Match</p>
              {nextMatch ? (
                <MatchFeatureCard match={nextMatch} shortName={shortName || 'ALSABBAT'} kind="next" testId="home-next-match" />
              ) : (
                <EmptyState
                  icon={Swords}
                  title="Belum ada jadwal pertandingan"
                  description="Jadwal akan tampil di sini setelah pertandingan dibuat."
                  testId="home-next-match-empty"
                />
              )}
            </div>
            <div>
              <p className="als-section-label mb-3">Last Match</p>
              {lastMatch ? (
                <MatchFeatureCard match={lastMatch} shortName={shortName || 'ALSABBAT'} kind="result" testId="home-last-match" />
              ) : (
                <EmptyState
                  icon={Swords}
                  title="Belum ada hasil pertandingan"
                  description="Hasil pertandingan akan tampil setelah laga selesai."
                  testId="home-last-match-empty"
                />
              )}
            </div>
          </div>
        )}
      </SectionShell>

      {/* Latest news */}
      <SectionShell
        label="Newsroom"
        title="Berita Terbaru"
        actionTo="/news"
        actionLabel="Semua berita"
        testId="home-section-news"
      >
        {news.loading ? (
          <LoadingState rows={3} testId="home-news-loading" />
        ) : news.error ? (
          <ErrorState message={news.error} onRetry={news.reload} testId="home-news-error" />
        ) : news.items.length === 0 ? (
          <EmptyState icon={Newspaper} title="Belum ada berita" description="Berita resmi klub akan tampil di sini." testId="home-news-empty" />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.items.map((post) => (
              <Link key={post.id} to={`/news/${post.slug}`} className="als-lift block" data-testid={`home-news-link-${post.id}`}>
                <NewsCardShell post={post} testId={`home-news-card-${post.id}`} />
              </Link>
            ))}
          </div>
        )}
      </SectionShell>

      {/* Squad highlight */}
      <SectionShell
        label="Squad"
        title="Skuad ALSABBAT"
        actionTo="/teams"
        actionLabel="Lihat semua tim"
        dark
        testId="home-section-squad"
      >
        {players.loading ? (
          <LoadingState rows={4} testId="home-squad-loading" />
        ) : players.items.length === 0 ? (
          <EmptyState icon={Users} title="Belum ada pemain" description="Skuad akan tampil setelah pemain ditambahkan." testId="home-squad-empty" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {players.items.slice(0, 8).map((player) => (
              <Link
                key={player.id}
                to={`/players/${player.id}`}
                className="als-card als-media-tile als-lift overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{ '--tw-ring-color': 'var(--focus-ring)' }}
                data-testid={`home-player-card-${player.id}`}
              >
                <div className="relative h-40" style={{ backgroundColor: 'var(--club-tertiary)' }}>
                  {player.photo ? (
                    <>
                      <img src={player.photo} alt={player.full_name} className="h-full w-full object-cover" loading="lazy" />
                      <span
                        className="als-media-overlay absolute inset-0"
                        style={{ background: 'linear-gradient(to top, rgba(34,34,34,0.8), rgba(34,34,34,0))' }}
                      />
                    </>
                  ) : (
                    <span
                      className="font-display absolute inset-0 flex items-center justify-center text-4xl font-extrabold"
                      style={{ color: 'rgba(252,207,43,0.85)' }}
                    >
                      {player.jersey_number ?? '—'}
                    </span>
                  )}
                  <span
                    className="font-display absolute right-2 top-2 rounded-md px-2 py-0.5 text-xs font-bold"
                    style={{ backgroundColor: 'var(--club-primary)', color: 'var(--club-tertiary)' }}
                  >
                    #{player.jersey_number ?? '-'}
                  </span>
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-semibold">{player.display_name || player.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                    {player.position}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionShell>

      {/* Achievements */}
      <SectionShell
        label="Honours"
        title="Prestasi Klub"
        actionTo="/achievements"
        actionLabel="Semua prestasi"
        testId="home-section-achievements"
      >
        {achievements.loading ? (
          <LoadingState rows={3} testId="home-achievements-loading" />
        ) : achievements.items.length === 0 ? (
          <EmptyState icon={Trophy} title="Belum ada prestasi tercatat" description="Prestasi klub akan tampil setelah dicatat pada Admin Panel." testId="home-achievements-empty" />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {achievements.items.map((item) => (
              <div key={item.id} className="als-card p-5" data-testid={`home-achievement-${item.id}`}>
                <Trophy className="mb-3 h-6 w-6" style={{ color: 'var(--club-primary)' }} />
                <p className="font-display text-base font-bold">{item.title}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
                  {[item.competition_name, item.year].filter(Boolean).join(' · ') || 'Detail belum diatur'}
                </p>
              </div>
            ))}
          </div>
        )}
      </SectionShell>

      {/* Gallery */}
      <SectionShell label="Media" title="Galeri Terbaru" actionTo="/gallery" actionLabel="Semua album" dark testId="home-section-gallery">
        {albums.loading ? (
          <LoadingState rows={4} testId="home-gallery-loading" />
        ) : albums.items.length === 0 ? (
          <EmptyState icon={Images} title="Belum ada album" description="Dokumentasi pertandingan akan tampil di sini." testId="home-gallery-empty" />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {albums.items.map((album, albumIndex) => (
              <AlbumCard
                key={album.id}
                album={album}
                index={albumIndex}
                testId={`home-album-card-${album.id}`}
              />
            ))}
          </div>
        )}
      </SectionShell>

      {/* Sponsors */}
      <SectionShell label="Partner" title="Sponsor Resmi" actionTo="/sponsors" actionLabel="Semua sponsor" testId="home-section-sponsors">
        {sponsors.loading ? <LoadingState rows={3} testId="home-sponsors-loading" /> : <SponsorsStrip sponsors={sponsors.items} />}
      </SectionShell>

      {/* Social */}
      <section className="py-12" style={{ backgroundColor: 'var(--club-tertiary)' }} data-testid="home-section-social">
        <div className="als-container flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--club-primary)' }}>
              Ikuti Kami
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold" style={{ color: 'var(--club-light)' }}>
              Media Sosial {club?.short_name || 'ALSABBAT'}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(club?.social_media || {})
              .filter(([, value]) => !!value)
              .map(([key, value]) => (
                <a
                  key={key}
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full px-4 py-2 text-xs font-semibold capitalize"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
                  data-testid={`home-social-${key}`}
                >
                  {key}
                </a>
              ))}
            {Object.values(club?.social_media || {}).every((v) => !v) ? (
              <Badge variant="outline" style={{ color: 'rgba(254,254,254,0.7)', borderColor: 'rgba(254,254,254,0.3)' }} data-testid="home-social-empty">
                Tautan media sosial belum diatur
              </Badge>
            ) : null}
          </div>
        </div>
      </section>

      <div className="als-container flex flex-wrap gap-3 py-10">
        <Link to="/club" data-testid="home-quick-club">
          <Button variant="outline">
            <Shield className="mr-2 h-4 w-4" /> Profil Klub
          </Button>
        </Link>
        <Link to="/contact" data-testid="home-quick-contact">
          <Button variant="outline">Kontak Klub</Button>
        </Link>
      </div>
    </div>
  );
}
