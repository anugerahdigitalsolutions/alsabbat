import React from 'react';
import { Images, Newspaper, Swords } from 'lucide-react';
import { HeroClubShell } from '../../components/public/HeroClubShell';
import { SectionShell } from '../../components/public/SectionShell';
import { NewsCardShell } from '../../components/public/NewsCardShell';
import { MatchCardShell } from '../../components/public/MatchCardShell';
import { SponsorsStrip } from '../../components/public/SponsorsStrip';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { useResourceList } from '../../hooks/useResourceList';

export default function HomePage() {
  const news = useResourceList('/content/posts', { status: 'PUBLISHED', limit: 3 });
  const matches = useResourceList('/matches', { limit: 3 });
  const albums = useResourceList('/gallery/albums', { status: 'ACTIVE', limit: 4 });
  const teams = useResourceList('/teams', { status: 'ACTIVE', limit: 100 });
  const players = useResourceList('/players', { limit: 200 });
  const sponsors = useResourceList('/sponsors', { status: 'ACTIVE', limit: 10 });

  const stats = [
    { id: 'teams', label: 'Tim Aktif', value: teams.loading ? '—' : teams.total },
    { id: 'players', label: 'Pemain', value: players.loading ? '—' : players.total },
    { id: 'matches', label: 'Pertandingan', value: matches.loading ? '—' : matches.total },
    { id: 'albums', label: 'Album Galeri', value: albums.loading ? '—' : albums.total },
  ];

  return (
    <div data-testid="page-home">
      <HeroClubShell stats={stats} />

      <SectionShell
        label="Newsroom"
        title="Berita Terbaru"
        description="Kabar resmi seputar klub, tim, dan pertandingan ALSABBAT."
        actionTo="/news"
        actionLabel="Semua berita"
        testId="home-section-news"
      >
        {news.loading ? (
          <LoadingState rows={3} testId="home-news-loading" />
        ) : news.error ? (
          <ErrorState message={news.error} onRetry={news.reload} testId="home-news-error" />
        ) : news.items.length === 0 ? (
          <EmptyState
            icon={Newspaper}
            title="Belum ada berita"
            description="Berita klub akan tampil di sini setelah dipublikasikan dari Admin Panel."
            testId="home-news-empty"
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {news.items.map((post) => (
              <NewsCardShell key={post.id} post={post} testId={`home-news-card-${post.id}`} />
            ))}
          </div>
        )}
      </SectionShell>

      <SectionShell
        label="Matchday"
        title="Jadwal &amp; Hasil"
        description="Arsitektur pertandingan mendukung banyak musim dan kompetisi."
        actionTo="/matches"
        actionLabel="Semua pertandingan"
        dark
        testId="home-section-matches"
      >
        {matches.loading ? (
          <LoadingState rows={3} testId="home-matches-loading" />
        ) : matches.error ? (
          <ErrorState message={matches.error} onRetry={matches.reload} testId="home-matches-error" />
        ) : matches.items.length === 0 ? (
          <EmptyState
            icon={Swords}
            title="Belum ada jadwal pertandingan"
            description="Buat musim, kompetisi, lalu pertandingan dari Admin Panel."
            testId="home-matches-empty"
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {matches.items.map((match) => (
              <MatchCardShell key={match.id} match={match} testId={`home-match-card-${match.id}`} />
            ))}
          </div>
        )}
      </SectionShell>

      <SectionShell
        label="Media"
        title="Galeri Klub"
        description="Dokumentasi pertandingan dan aktivitas klub."
        actionTo="/gallery"
        actionLabel="Semua album"
        testId="home-section-gallery"
      >
        {albums.loading ? (
          <LoadingState rows={4} testId="home-gallery-loading" />
        ) : albums.error ? (
          <ErrorState message={albums.error} onRetry={albums.reload} testId="home-gallery-error" />
        ) : albums.items.length === 0 ? (
          <EmptyState
            icon={Images}
            title="Belum ada album"
            description="Unggah foto pertandingan atau latihan melalui Admin Panel."
            testId="home-gallery-empty"
          />
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {albums.items.map((album) => (
              <div key={album.id} className="als-card overflow-hidden" data-testid={`home-album-card-${album.id}`}>
                <div className="h-32 w-full" style={{ backgroundColor: 'var(--surface-3)' }}>
                  {album.cover_url ? (
                    <img src={album.cover_url} alt={album.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="font-display line-clamp-2 text-sm font-semibold">{album.title}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionShell>

      <SectionShell label="Partner" title="Sponsor Resmi" dark testId="home-section-sponsors">
        {sponsors.loading ? (
          <LoadingState rows={3} testId="home-sponsors-loading" />
        ) : (
          <SponsorsStrip sponsors={sponsors.items} />
        )}
      </SectionShell>
    </div>
  );
}
