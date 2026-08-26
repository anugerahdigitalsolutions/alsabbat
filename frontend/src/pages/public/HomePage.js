import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Facebook, Instagram, Music2, ShoppingBag, Swords, Twitter, Users, Youtube } from 'lucide-react';
import { CinematicHero } from '../../components/public/CinematicHero';
import { HeroNextMatchPanel } from '../../components/public/home/HeroNextMatchPanel';
import { PillarStrip } from '../../components/public/home/PillarStrip';
import { UpcomingMatchCard } from '../../components/public/home/UpcomingMatchCard';
import { TeamStatsBlock } from '../../components/public/home/TeamStatsBlock';
import { StorePromoCard } from '../../components/public/home/StorePromoCard';
import { GalleryStrip } from '../../components/public/home/GalleryStrip';
import { NewsShowcase } from '../../components/public/home/NewsShowcase';
import { JourneyCta } from '../../components/public/home/JourneyCta';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { SponsorsStrip } from '../../components/public/SponsorsStrip';
import { PlayerSpotlight, pickSpotlightPlayer } from '../../components/public/PlayerSpotlight';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { useResourceList } from '../../hooks/useResourceList';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useClub } from '../../context/ClubContext';

const UPCOMING = ['SCHEDULED', 'UPCOMING', 'LIVE', 'POSTPONED'];
const SOCIAL_ICONS = { instagram: Instagram, youtube: Youtube, facebook: Facebook, twitter: Twitter, tiktok: Music2 };

const RowHeader = ({ label, to, actionLabel, testId }) => (
  <div className="mb-4 flex items-end justify-between gap-3">
    <p className="als-row-label" data-testid={testId}>
      {label}
    </p>
    {to ? (
      <Link to={to} className="als-view-all als-focus" data-testid={`${testId}-action`}>
        {actionLabel}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
    ) : null}
  </div>
);

const Band = ({ children, className = '', testId }) => (
  <section className={`als-frame-inner py-10 sm:py-12 ${className}`} data-testid={testId}>
    {children}
  </section>
);

export default function HomePage() {
  const { club, clubName, shortName } = useClub();
  usePageSeo({
    title: 'Beranda',
    description: club?.description || `Website resmi ${clubName}: jadwal, hasil, skuad, berita, galeri, dan merchandise.`,
    path: '/',
  });

  const news = useResourceList('/content/posts', { status: 'PUBLISHED', limit: 4 });
  const matches = useResourceList('/matches', { limit: 40 });
  const albums = useResourceList('/gallery/public/albums', { limit: 5 });
  const players = useResourceList('/players', { status: 'ACTIVE', limit: 8 });
  const sponsors = useResourceList('/sponsors', { status: 'ACTIVE', limit: 10 });
  const products = useResourceList('/merchandise/products', { limit: 4 });

  const badge = shortName || 'ALSABBAT';
  const upcoming = matches.items.filter((m) => UPCOMING.includes(m.status));
  const finished = matches.items.filter((m) => m.status === 'FINISHED');
  const nextMatch = upcoming[upcoming.length - 1] || null;
  const lastMatch = finished[0] || null;
  const featuredMatch = nextMatch || lastMatch;
  const spotlightPlayer = useMemo(() => pickSpotlightPlayer(players.items), [players.items]);

  const teamStats = useMemo(() => {
    const scored = finished.filter((m) => m.home_score !== null && m.home_score !== undefined);
    if (!scored.length) return null;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    scored.forEach((m) => {
      const isHome = m.venue_type !== 'AWAY';
      const own = isHome ? m.home_score : m.away_score ?? 0;
      const other = isHome ? m.away_score ?? 0 : m.home_score;
      if (own > other) wins += 1;
      else if (own === other) draws += 1;
      else losses += 1;
    });
    return { played: scored.length, wins, draws, losses };
  }, [finished]);

  const socials = useMemo(
    () =>
      Object.entries(club?.social_media || {})
        .filter(([key, url]) => url && SOCIAL_ICONS[key])
        .map(([key, url]) => ({ key, url, Icon: SOCIAL_ICONS[key] })),
    [club?.social_media]
  );

  const heroSlides = useMemo(() => {
    const galleryCover = resolveMediaUrl(albums.items[0]?.cover_url_resolved);
    const newsCover = resolveMediaUrl(news.items[0]?.thumbnail);
    const playerPhoto = players.items.find((p) => p.photo)?.photo;
    const brandImage = galleryCover || newsCover || playerPhoto || null;
    const slides = [
      {
        id: 'brand',
        eyebrow: `${badge} Football Club`,
        headlineLines: [
          { text: 'SATU KLUB.' },
          { text: 'SATU SEMANGAT.' },
          { text: `SATU ${badge.toUpperCase()}.`, gold: true },
        ],
        meta: 'Bersama berjuang. Bersama menang.',
        ctaLabel: nextMatch ? 'Pertandingan Berikutnya' : 'Pertandingan',
        ctaTo: nextMatch ? `/matches/${nextMatch.id}` : '/matches',
        secondaryLabel: 'Tentang Kami',
        secondaryTo: '/club',
        image: brandImage,
        alt: `Suasana pertandingan ${clubName}`,
      },
    ];

    if (lastMatch && lastMatch.home_score !== null && lastMatch.home_score !== undefined) {
      const isHome = lastMatch.venue_type !== 'AWAY';
      const own = isHome ? lastMatch.home_score : lastMatch.away_score ?? 0;
      const other = isHome ? lastMatch.away_score ?? 0 : lastMatch.home_score;
      slides.push({
        id: `result-${lastMatch.id}`,
        eyebrow: 'Hasil Terakhir',
        headline: `${badge} ${own} - ${other} ${lastMatch.opponent?.name || 'Lawan'}`,
        subheadline: 'Selesai',
        meta: [lastMatch.date, lastMatch.venue].filter(Boolean).join(' · '),
        ctaLabel: 'Lihat Pertandingan',
        ctaTo: `/matches/${lastMatch.id}`,
        image: resolveMediaUrl(lastMatch.match_cover) || galleryCover,
        alt: `Hasil pertandingan ${badge} melawan ${lastMatch.opponent?.name || 'lawan'}`,
      });
    }

    const post = news.items[0];
    if (post) {
      slides.push({
        id: `news-${post.id}`,
        eyebrow: 'Berita Terbaru',
        headline: post.title,
        meta: post.excerpt || null,
        ctaLabel: 'Baca Berita',
        ctaTo: `/news/${post.slug}`,
        secondaryLabel: 'Semua berita',
        secondaryTo: '/news',
        image: resolveMediaUrl(post.thumbnail) || galleryCover,
        alt: post.title,
      });
    }

    const album = albums.items[0];
    if (album) {
      slides.push({
        id: `album-${album.id}`,
        eyebrow: 'Momen Pertandingan',
        headline: album.title,
        meta: album.photo_count ? `${album.photo_count} foto` : null,
        ctaLabel: 'Lihat Galeri',
        ctaTo: `/gallery/${album.id}`,
        image: resolveMediaUrl(album.cover_url_resolved),
        alt: album.title,
      });
    }

    return slides;
  }, [albums.items, news.items, players.items, nextMatch, lastMatch, badge, clubName]);

  const storeImage = resolveMediaUrl(products.items[0]?.cover_url) || resolveMediaUrl(albums.items[1]?.cover_url_resolved);

  return (
    <div data-testid="page-home">
      <div className="als-frame-inner pt-4 sm:pt-6">
        <CinematicHero
          slides={heroSlides}
          clubName={clubName}
          socials={socials}
          panel={nextMatch ? <HeroNextMatchPanel match={nextMatch} clubName={badge} /> : null}
        />
      </div>

      <Band testId="home-section-pillars">
        <PillarStrip />
      </Band>

      {/* Matchday + Newsroom */}
      <Band className="pt-0" testId="home-section-matchday-news">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,330px)_minmax(0,1fr)]">
          <div>
            <RowHeader label={nextMatch ? 'Pertandingan Berikutnya' : 'Hasil Terakhir'} testId="home-label-match" />
            {matches.loading ? (
              <LoadingState rows={1} testId="home-match-loading" />
            ) : featuredMatch ? (
              <UpcomingMatchCard
                match={featuredMatch}
                clubName={badge}
                competitionName={featuredMatch.competition_name || (nextMatch ? 'Hari Pertandingan' : 'Selesai')}
                testId="home-featured-match"
              />
            ) : (
              <EmptyState
                icon={Swords}
                title="Belum ada jadwal pertandingan"
                description="Jadwal dan hasil pertandingan akan tampil di sini."
                testId="home-match-empty"
              />
            )}
          </div>

          <div>
            <RowHeader label="Berita Terbaru" to="/news" actionLabel="Semua Berita" testId="home-label-news" />
            {news.loading ? <LoadingState rows={3} testId="home-news-loading" /> : <NewsShowcase posts={news.items} />}
          </div>
        </div>
      </Band>

      {/* Spotlight + stats + store */}
      <Band className="pt-0" testId="home-section-spotlight">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)_minmax(0,0.8fr)]">
          <div>
            <RowHeader label="Sorotan Pemain" to="/teams" actionLabel="Lihat Skuad" testId="home-label-spotlight" />
            {players.loading ? (
              <LoadingState rows={1} testId="home-spotlight-loading" />
            ) : spotlightPlayer ? (
              <PlayerSpotlight player={spotlightPlayer} />
            ) : (
              <EmptyState
                icon={Users}
                title="Skuad belum tersedia"
                description="Sorotan pemain akan tampil setelah skuad dilengkapi."
                testId="home-spotlight-empty"
              />
            )}
          </div>

          <div>
            <RowHeader label="Statistik Tim" testId="home-label-stats" />
            <TeamStatsBlock stats={teamStats} />
            {!teamStats ? (
              <p className="mt-3 text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="home-team-stats-note">
                Statistik dihitung otomatis dari hasil pertandingan yang sudah selesai.
              </p>
            ) : null}
          </div>

          <div>
            <RowHeader label="Toko Resmi" to="/merchandise" actionLabel="Toko" testId="home-label-store" />
            {products.total ? (
              <StorePromoCard image={storeImage} productCount={products.total} />
            ) : (
              <EmptyState
                icon={ShoppingBag}
                title="Merchandise segera hadir"
                description="Produk resmi klub akan tampil di sini."
                testId="home-store-empty"
              />
            )}
          </div>
        </div>
      </Band>

      {/* Gallery */}
      <Band className="pt-0" testId="home-section-gallery">
        <RowHeader label="Galeri" to="/gallery" actionLabel="Semua Galeri" testId="home-label-gallery" />
        {albums.loading ? <LoadingState rows={2} testId="home-gallery-loading" /> : <GalleryStrip albums={albums.items} />}
      </Band>

      {/* Sponsors */}
      {sponsors.items.length ? (
        <Band className="pt-0" testId="home-section-sponsors">
          <RowHeader label="Sponsor Kami" to="/sponsors" actionLabel="Semua sponsor" testId="home-label-sponsors" />
          <SponsorsStrip sponsors={sponsors.items} />
        </Band>
      ) : null}

      <div className="als-frame-inner pb-4">
        <JourneyCta clubName={badge} />
      </div>
    </div>
  );
}
