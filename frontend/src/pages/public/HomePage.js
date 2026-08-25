import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Images, Newspaper, Shield, Swords, Trophy, Users } from 'lucide-react';
import { HeroClubShell } from '../../components/public/HeroClubShell';
import { SectionShell } from '../../components/public/SectionShell';
import { NewsCardShell } from '../../components/public/NewsCardShell';
import { MatchCardShell } from '../../components/public/MatchCardShell';
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

export default function HomePage() {
  const { club, clubName } = useClub();
  usePageSeo({
    title: 'Beranda',
    description: club?.description || `Website resmi ${clubName}: jadwal, hasil, skuad, berita, dan galeri klub.`,
    path: '/',
  });

  const news = useResourceList('/content/posts', { status: 'PUBLISHED', limit: 3 });
  const matches = useResourceList('/matches', { limit: 40 });
  const albums = useResourceList('/gallery/albums', { status: 'ACTIVE', limit: 4 });
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

  return (
    <div data-testid="page-home">
      <HeroClubShell stats={stats} />

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
                <MatchCardShell match={nextMatch} testId="home-next-match" />
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
                <MatchCardShell match={lastMatch} testId="home-last-match" />
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
              <Link key={post.id} to={`/news/${post.slug}`} data-testid={`home-news-link-${post.id}`}>
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
                className="als-card overflow-hidden transition-shadow hover:shadow-[var(--shadow-md)]"
                data-testid={`home-player-card-${player.id}`}
              >
                <div className="relative h-40" style={{ backgroundColor: 'var(--club-tertiary)' }}>
                  {player.photo ? (
                    <img src={player.photo} alt={player.full_name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <span
                      className="font-display absolute inset-0 flex items-center justify-center text-4xl font-extrabold"
                      style={{ color: 'rgba(252,207,43,0.85)' }}
                    >
                      {player.jersey_number ?? '—'}
                    </span>
                  )}
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
            {albums.items.map((album) => (
              <div key={album.id} className="als-card overflow-hidden" data-testid={`home-album-card-${album.id}`}>
                <div className="h-32" style={{ backgroundColor: 'var(--surface-3)' }}>
                  {album.cover_url ? (
                    <img src={album.cover_url} alt={album.title} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Images className="h-6 w-6" style={{ color: 'rgba(34,34,34,0.25)' }} />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold">{album.title}</p>
                </div>
              </div>
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
