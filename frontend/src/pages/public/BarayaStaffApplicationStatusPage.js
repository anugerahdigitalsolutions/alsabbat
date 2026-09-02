import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { CheckCircle2, ClipboardList, Clock, XCircle } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { usePageSeo } from '../../hooks/usePageSeo';
import { barayaMyApplications } from '../../services/barayaAuth';

const REVIEW_MESSAGE =
  'Pendaftaran Anda sedang dalam proses review oleh Admin. Anda akan mendapatkan pemberitahuan mengenai hasil pendaftaran maksimal 3 x 24 jam.';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

const STATUS_VIEW = {
  PENDING: {
    icon: Clock,
    title: 'Pendaftaran Staff Sedang Direview',
    message: REVIEW_MESSAGE,
    badge: 'Menunggu Persetujuan',
    accent: 'var(--club-secondary)',
  },
  APPROVED: {
    icon: CheckCircle2,
    title: 'Pendaftaran Staff Disetujui',
    message:
      'Pengurus klub telah menyetujui pendaftaran Staff Anda. Status Staf & Pemain kini tampil pada Kartu Member Anda.',
    badge: 'Disetujui',
    accent: '#15803D',
  },
  REJECTED: {
    icon: XCircle,
    title: 'Pendaftaran Staff Belum Disetujui',
    message:
      'Pengurus klub belum dapat menyetujui pendaftaran Staff Anda. Anda dapat memperbaiki data lalu mengirim pendaftaran baru.',
    badge: 'Ditolak',
    accent: '#991B1B',
  },
};

/**
 * Fase 4A — halaman status pendaftaran Staff (read-only).
 * Halaman ini HANYA membaca pengajuan yang sudah tersimpan; tidak pernah
 * mengirim pendaftaran, sehingga refresh atau membuka ulang halaman tidak
 * membuat pendaftaran ganda. Bila belum ada pendaftaran Staff sama sekali,
 * pengguna dikembalikan ke formulir pengajuan.
 */
export default function BarayaStaffApplicationStatusPage() {
  usePageSeo({
    title: 'Status Pendaftaran Staff',
    description: 'Status pendaftaran Staff AL SABBAT Football Club.',
    path: '/akun/pengajuan/staff/status',
    robots: 'noindex,nofollow',
  });

  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await barayaMyApplications();
      const staffItems = (data.items || []).filter((item) => item.type === 'STAFF');
      // Pendaftaran Staff terbaru menjadi acuan status.
      const pending = staffItems.find((item) => item.status === 'PENDING');
      setApplication(pending || staffItems[0] || null);
    } catch (e) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!loading && !failed && !application) {
    // Belum ada pendaftaran Staff yang tersimpan → halaman status tidak berlaku.
    return <Navigate to="/akun/pengajuan" replace />;
  }

  const view = STATUS_VIEW[application?.status] || STATUS_VIEW.PENDING;
  const StatusIcon = view.icon;

  return (
    <div data-testid="page-baraya-staff-status">
      <PublicPageHeader
        label="Baraya AL SABBAT"
        title="Status Pendaftaran Staff"
        description="Pantau proses peninjauan pendaftaran Staff Anda oleh pengurus klub."
        breadcrumb={[
          { label: 'Beranda', to: '/' },
          { label: 'Akun Saya', to: '/akun' },
          { label: 'Status Pendaftaran Staff' },
        ]}
      />
      <div className="als-container py-10 sm:py-14">
        <div className="mx-auto max-w-2xl">
          {loading ? (
            <div className="als-card p-6" data-testid="baraya-staff-status-loading">
              <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                Memuat status pendaftaran…
              </p>
            </div>
          ) : (
            <div className="als-card space-y-5 p-6 sm:p-8" data-testid="baraya-staff-status-card">
              <div className="flex items-start gap-4">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                  style={{ backgroundColor: 'var(--surface-2)', color: view.accent }}
                  aria-hidden="true"
                >
                  <StatusIcon className="h-6 w-6" />
                </span>
                <div className="space-y-2">
                  <p className="als-section-label">Pendaftaran Staff</p>
                  <h2 className="font-display text-xl font-extrabold sm:text-2xl" data-testid="baraya-staff-status-title">
                    {view.title}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }} data-testid="baraya-staff-status-message">
                    {view.message}
                  </p>
                </div>
              </div>

              <span className="als-gold-rule block" aria-hidden="true" />

              {failed ? (
                <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="baraya-staff-status-offline">
                  Status terbaru belum dapat dimuat. Pendaftaran Anda tetap tersimpan — silakan muat ulang halaman ini
                  beberapa saat lagi.
                </p>
              ) : (
                <dl className="grid gap-3 text-sm sm:grid-cols-2" data-testid="baraya-staff-status-detail">
                  <div className="rounded-[var(--radius-sm)] p-3" style={{ backgroundColor: 'var(--surface-2)' }}>
                    <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                      Status
                    </dt>
                    <dd className="font-display font-bold" style={{ color: view.accent }}>
                      {view.badge}
                    </dd>
                  </div>
                  <div className="rounded-[var(--radius-sm)] p-3" style={{ backgroundColor: 'var(--surface-2)' }}>
                    <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                      Dikirim pada
                    </dt>
                    <dd className="font-display font-bold">{formatDate(application?.created_at)}</dd>
                  </div>
                  {application?.position ? (
                    <div className="rounded-[var(--radius-sm)] p-3 sm:col-span-2" style={{ backgroundColor: 'var(--surface-2)' }}>
                      <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                        Jabatan diajukan
                      </dt>
                      <dd className="font-display font-bold">{application.position}</dd>
                    </div>
                  ) : null}
                  {application?.note ? (
                    <div className="rounded-[var(--radius-sm)] p-3 sm:col-span-2" style={{ backgroundColor: 'var(--surface-2)' }}>
                      <dt className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                        Catatan pengurus
                      </dt>
                      <dd>{application.note}</dd>
                    </div>
                  ) : null}
                </dl>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  to="/akun"
                  className="als-focus font-display flex min-h-[44px] items-center justify-center rounded-[var(--radius-sm)] text-sm font-bold"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid="baraya-staff-status-account"
                >
                  Kembali ke Akun Saya
                </Link>
                <Link
                  to="/akun/pengajuan"
                  className="als-focus font-display flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-sm)] border text-sm font-bold"
                  style={{ borderColor: 'var(--border-soft)' }}
                  data-testid="baraya-staff-status-applications"
                >
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                  Lihat Riwayat Pengajuan
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
