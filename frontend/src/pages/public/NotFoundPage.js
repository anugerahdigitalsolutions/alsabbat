import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { ClubCrestMark } from '../../components/shared/ClubCrestMark';

export default function NotFoundPage() {
  return (
    <div
      className="relative flex min-h-[70vh] items-center overflow-hidden"
      style={{ backgroundColor: 'var(--club-tertiary)' }}
      data-testid="page-not-found"
    >
      <div className="als-stadium-glow absolute inset-0" />
      <div className="als-pitch-lines absolute inset-0" />
      <div className="als-container relative py-16">
        <ClubCrestMark size={56} onDark testId="notfound-crest" />
        <p
          className="font-display mt-8 text-xs font-semibold uppercase tracking-[0.24em]"
          style={{ color: 'var(--club-primary)' }}
        >
          Error 404
        </p>
        <h1
          className="font-display mt-3 text-4xl font-semibold tracking-tight sm:text-5xl"
          style={{ color: 'var(--club-light)' }}
        >
          Halaman tidak ditemukan
        </h1>
        <p className="mt-4 max-w-xl text-sm sm:text-base" style={{ color: 'rgba(254,254,254,0.75)' }}>
          Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" data-testid="notfound-home-link">
            <Button size="lg" style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}>
              <Home className="mr-2 h-4 w-4" />
              Kembali ke Beranda
            </Button>
          </Link>
          <Link to="/news" data-testid="notfound-news-link">
            <Button
              size="lg"
              variant="outline"
              style={{
                borderColor: 'rgba(254,254,254,0.35)',
                backgroundColor: 'rgba(254,254,254,0.06)',
                color: 'var(--club-light)',
              }}
            >
              <Search className="mr-2 h-4 w-4" />
              Lihat Berita
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
