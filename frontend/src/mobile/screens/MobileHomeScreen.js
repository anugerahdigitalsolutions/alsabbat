import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, ShoppingBag } from 'lucide-react';
import { useResourceList } from '../../hooks/useResourceList';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useClub } from '../../context/ClubContext';
import { useBaraya } from '../../context/BarayaAuthContext';
import { barayaApi } from '../../lib/api';
import { brandText } from '../../lib/brand';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { BarayaGreetingHeader } from '../components/BarayaGreetingHeader';
import { BrzSection } from '../components/BrzSection';
import { BrzMatchCard } from '../components/BrzMatchCard';
import { BrzNewsCard } from '../components/BrzNewsCard';
import { BrzPlayerCard } from '../components/BrzPlayerCard';
import { BrzAlbumCard } from '../components/BrzAlbumCard';
import { BrzQuickLinks } from '../components/BrzQuickLinks';
import { BrzRestricted } from '../components/BrzRestricted';
import { BrzError, BrzLoading, BrzEmpty } from '../components/BrzStates';
import { pickLastResult, pickNextMatch } from '../lib/matchUtils';
import { BrzSearchSheet } from '../components/BrzSearchSheet';

const formatIDR = (value) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
    Number(value || 0)
  );

/**
 * BARAYA AL SABBAT — mobile Home.
 *
 * Every section is driven by the EXISTING public API. Optional sections are
 * hidden when the API returns nothing, so the screen never shows placeholder
 * or invented content.
 */
export default function MobileHomeScreen() {
  const { club, shortName, clubName } = useClub();
  const { canViewGallery, loading: authLoading } = useBaraya();
  const [searchOpen, setSearchOpen] = useState(false);
  const [albums, setAlbums] = useState([]);

  usePageSeo({
    title: 'Baraya AL SABBAT',
    description:
      'Aplikasi resmi komunitas AL SABBAT Football Club — pertandingan, berita, media, skuad, dan profil member.',
    path: '/',
  });

  const matches = useResourceList('/matches', { limit: 30 });
  const news = useResourceList('/content/posts', { limit: 6, status: 'PUBLISHED' });
  const players = useResourceList('/players', { limit: 12, status: 'ACTIVE' });
  const products = useResourceList('/merchandise/products', { limit: 4 });

  // Galeri hanya diambil bila akun memang berhak (backend juga menolak 403).
  useEffect(() => {
    let alive = true;
    if (authLoading || !canViewGallery) {
      setAlbums([]);
      return () => {
        alive = false;
      };
    }
    barayaApi
      .get('/gallery/public/albums', { params: { limit: 6 } })
      .then(({ data }) => {
        if (alive) setAlbums(data?.items || []);
      })
      .catch(() => {
        if (alive) setAlbums([]);
      });
    return () => {
      alive = false;
    };
  }, [authLoading, canViewGallery]);

  const nextMatch = pickNextMatch(matches.items);
  const lastResult = pickLastResult(matches.items);
  const otherMatches = matches.items
    .filter((match) => match.id !== nextMatch?.id && match.id !== lastResult?.id)
    .slice(0, 3);
  const featuredNews = news.items[0];
  const restNews = news.items.slice(1, 5);

  return (
    <div data-testid="baraya-home">
      <BarayaGreetingHeader onSearch={() => setSearchOpen(true)} />

      <div className="brz-page">
        <BrzQuickLinks />

        {/* -------------------------------------------------- next match */}
        <BrzSection title="Pertandingan Terdekat" to="/matches" testId="brz-home-next">
          {matches.loading ? (
            <BrzLoading rows={1} height={140} testId="brz-home-next-loading" />
          ) : matches.error ? (
            <BrzError message={matches.error} onRetry={matches.reload} testId="brz-home-next-error" />
          ) : nextMatch ? (
            <BrzMatchCard match={nextMatch} variant="featured" testId="brz-home-next-card" />
          ) : (
            <BrzEmpty
              icon={CalendarDays}
              title="Belum ada jadwal"
              description={`Jadwal pertandingan ${shortName || 'AL SABBAT'} tampil di sini begitu dipublikasikan.`}
              testId="brz-home-next-empty"
            />
          )}
        </BrzSection>

        {/* ------------------------------------------------ last result */}
        {lastResult ? (
          <BrzSection title="Hasil Terakhir" to="/matches" testId="brz-home-result">
            <BrzMatchCard match={lastResult} testId="brz-home-result-card" />
          </BrzSection>
        ) : null}

        {/* --------------------------------------------- other fixtures */}
        {otherMatches.length > 0 ? (
          <BrzSection title="Jadwal Lainnya" to="/matches" testId="brz-home-matches">
            <div className="flex flex-col gap-3">
              {otherMatches.map((match) => (
                <BrzMatchCard key={match.id} match={match} />
              ))}
            </div>
          </BrzSection>
        ) : null}

        {/* ----------------------------------------------------- berita */}
        {news.loading ? (
          <BrzSection title="Berita Terbaru" testId="brz-home-news">
            <BrzLoading rows={1} height={150} testId="brz-home-news-loading" />
          </BrzSection>
        ) : featuredNews ? (
          <BrzSection title="Berita Terbaru" to="/news" testId="brz-home-news">
            <BrzNewsCard post={featuredNews} variant="hero" testId="brz-home-news-featured" />
            {restNews.length > 0 ? (
              <div className="brz-hscroll -mx-4 mt-3">
                {restNews.map((post) => (
                  <BrzNewsCard key={post.id} post={post} variant="tile" />
                ))}
              </div>
            ) : null}
          </BrzSection>
        ) : null}

        {/* ------------------------------------------------------ media */}
        {(!authLoading && !canViewGallery) || albums.length > 0 ? (
          <BrzSection title="Media Terbaru" to={canViewGallery ? '/gallery' : undefined} testId="brz-home-media">
            {!canViewGallery ? (
              <BrzRestricted feature="Galeri AL SABBAT" testId="brz-home-media-restricted" />
            ) : (
              <div className="brz-hscroll -mx-4">
                {albums.map((album) => (
                  <BrzAlbumCard key={album.id} album={album} />
                ))}
              </div>
            )}
          </BrzSection>
        ) : null}

        {/* ------------------------------------------------------ skuad */}
        {players.items.length > 0 ? (
          <BrzSection title="Skuad" to="/teams" testId="brz-home-players">
            <div className="brz-hscroll -mx-4">
              {players.items.map((player) => (
                <BrzPlayerCard key={player.id} player={player} />
              ))}
            </div>
          </BrzSection>
        ) : null}

        {/* ------------------------------------------------ merchandise */}
        {products.items.length > 0 ? (
          <BrzSection title="Merchandise" to="/merchandise" testId="brz-home-store">
            <div className="brz-hscroll -mx-4">
              {products.items.map((product) => (
                <Link
                  key={product.id}
                  to={`/merchandise/${product.slug || product.id}`}
                  className="brz-card block w-[152px] flex-none"
                  data-testid={`brz-product-${product.id}`}
                >
                  <span
                    className="relative block h-[132px] w-full overflow-hidden"
                    style={{ backgroundColor: 'var(--brz-surface-sunken)' }}
                  >
                    {product.cover_url ? (
                      <img src={resolveMediaUrl(product.cover_url)} alt={product.name} className="brz-img" loading="lazy" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <ShoppingBag size={22} style={{ color: 'var(--brz-text-dim)' }} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                  <span className="block p-3">
                    <span className="brz-clamp-2 block text-[12.5px] font-semibold leading-snug">{product.name}</span>
                    <span className="mt-1 block text-[12.5px] font-bold" style={{ color: 'var(--brz-accent)' }}>
                      {formatIDR(product.price)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </BrzSection>
        ) : null}

        {/* ------------------------------------------------- club footer */}
        <BrzSection title="Tentang Klub" testId="brz-home-club">
          <Link to="/club" className="brz-card brz-card--pad flex items-center gap-3" data-testid="brz-home-club-card">
            <span className="min-w-0 flex-1">
              <span className="brz-clamp-1 block text-[14px] font-semibold">{clubName}</span>
              <span className="brz-clamp-2 brz-body mt-1 block">
                {brandText(club?.description) || 'Profil klub, tim, dan informasi resmi AL SABBAT Football Club.'}
              </span>
            </span>
            <ChevronRight size={18} style={{ color: 'var(--brz-text-dim)' }} aria-hidden="true" />
          </Link>
        </BrzSection>
      </div>

      <BrzSearchSheet open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
