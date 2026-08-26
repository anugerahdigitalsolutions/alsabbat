import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { ClubCrestMark } from '../../components/shared/ClubCrestMark';
import { usePageSeo } from '../../hooks/usePageSeo';

export default function NotFoundPage() {
  usePageSeo({ title: 'Halaman tidak ditemukan', description: 'Halaman yang Anda cari tidak tersedia.', robots: 'noindex,follow' });
  return (
    <div className="als-frame-inner py-4 sm:py-6" data-testid="page-not-found">
      <div
        className="relative flex min-h-[62vh] items-center overflow-hidden rounded-none lg:rounded-[26px]"
        style={{ backgroundColor: 'var(--club-secondary)' }}
      >
      <div className="als-pitch-lines absolute inset-0 opacity-70" aria-hidden="true" />
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(760px circle at 88% 8%, rgba(252,207,43,0.26), transparent 62%)' }}
        aria-hidden="true"
      />
      <div className="relative px-6 py-16 sm:px-10 xl:px-14">
        <ClubCrestMark size={56} onDark testId="notfound-crest" />
        <p
          className="font-display mt-8 text-xs font-semibold uppercase tracking-[0.24em]"
          style={{ color: 'var(--club-primary)' }}
        >
          Error 404
        </p>
        <h1
          className="als-display-xl mt-3"
          style={{ color: 'var(--club-light)' }}
        >
          Halaman tidak ditemukan
        </h1>
        <p className="mt-4 max-w-xl text-sm sm:text-base" style={{ color: 'rgba(254,254,254,0.75)' }}>
          Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/" className="als-btn-gold als-focus" data-testid="notfound-home-link">
            <Home className="h-4 w-4" aria-hidden="true" />
            Kembali ke Beranda
          </Link>
          <Link to="/news" className="als-btn-ghost als-focus" data-testid="notfound-news-link">
            <Search className="h-4 w-4" aria-hidden="true" />
            Lihat Berita
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
