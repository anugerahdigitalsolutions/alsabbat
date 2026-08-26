import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toPng } from 'html-to-image';
import { Copy, Download, Share2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { MemberCard } from '../../components/member/MemberCard';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { Button } from '../../components/ui/button';
import { usePageSeo } from '../../hooks/usePageSeo';
import { apiErrorMessage } from '../../lib/api';
import { barayaMemberCard } from '../../services/barayaAuth';

export default function BarayaMemberCardPage() {
  usePageSeo({
    title: 'Kartu Member Baraya',
    description: 'Kartu member digital Baraya AL SABBAT.',
    path: '/akun/kartu',
    robots: 'noindex,nofollow',
  });
  const cardRef = useRef(null);
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setCard(await barayaMemberCard());
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal memuat kartu member.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const verifyUrl = card?.member_code ? `${window.location.origin}/member/verifikasi/${card.member_code}` : '';

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kartu Member Baraya AL SABBAT',
          text: `Baraya AL SABBAT ${card?.member_number}`,
          url: verifyUrl,
        });
        return;
      } catch (e) {
        return; // user cancelled
      }
    }
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success('Tautan verifikasi disalin. Perangkat ini belum mendukung menu bagikan bawaan.');
    } catch (e) {
      toast.error('Perangkat ini tidak mendukung bagikan otomatis. Salin tautan secara manual.');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      toast.success('Tautan verifikasi disalin.');
    } catch (e) {
      toast.error('Gagal menyalin tautan.');
    }
  };

  const download = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, cacheBust: true });
      const link = document.createElement('a');
      link.download = `kartu-baraya-${card?.member_number || 'alsabbat'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Kartu member tersimpan sebagai gambar.');
    } catch (e) {
      toast.error('Gagal menyimpan kartu di perangkat ini.');
    }
  };

  return (
    <div data-testid="page-member-card">
      <PublicPageHeader
        label="Baraya AL SABBAT"
        title="Kartu Member Digital"
        description="Kartu resmi Baraya AL SABBAT. QR hanya berisi tautan verifikasi publik, bukan data pribadi."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Akun Saya', to: '/akun' }, { label: 'Kartu Member' }]}
      />
      <div className="als-container py-10 sm:py-14">
        {loading ? (
          <LoadingState variant="text" testId="member-card-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} testId="member-card-error" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
            <MemberCard ref={cardRef} card={card} />

            <div className="als-card h-fit space-y-4 p-6" data-testid="member-card-actions">
              <p className="als-section-label">Kelola Kartu</p>
              <span className="als-gold-rule mt-1 block" aria-hidden="true" />
              <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                Nomor member bersifat permanen. Nama dan foto pada kartu mengikuti profil akun Anda.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={share}
                  className="als-press min-h-[44px] font-semibold"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid="member-card-share"
                >
                  <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Bagikan
                </Button>
                <Button variant="outline" className="als-press min-h-[44px]" onClick={copyLink} data-testid="member-card-copy">
                  <Copy className="mr-2 h-4 w-4" aria-hidden="true" />
                  Salin Tautan
                </Button>
                <Button variant="outline" className="als-press min-h-[44px]" onClick={download} data-testid="member-card-download">
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                  Simpan Kartu
                </Button>
              </div>
              <div className="space-y-2 pt-2 text-sm">
                <Link
                  to={`/member/verifikasi/${card?.member_code || ''}`}
                  className="als-focus inline-flex items-center gap-2 font-semibold"
                  style={{ color: 'var(--club-secondary)' }}
                  data-testid="member-card-verify-link"
                >
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  Buka halaman verifikasi
                </Link>
                <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                  Ubah nama atau foto kartu di{' '}
                  <Link to="/akun" className="font-semibold" style={{ color: 'var(--club-secondary)' }}>
                    Akun Saya
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
