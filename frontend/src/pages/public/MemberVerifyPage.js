import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { usePageSeo } from '../../hooks/usePageSeo';
import api from '../../lib/api';

const formatJoined = (value) => {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } catch (e) {
    return null;
  }
};

/** Public QR verification — shows the minimum information only, never private data. */
export default function MemberVerifyPage() {
  const { code } = useParams();
  usePageSeo({
    title: 'Verifikasi Member',
    description: 'Verifikasi kartu member Baraya AL SABBAT.',
    path: `/member/verifikasi/${code || ''}`,
    robots: 'noindex,nofollow',
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/member/verify/${encodeURIComponent(code || '')}`)
      .then(({ data }) => {
        if (!cancelled) setResult(data);
      })
      .catch(() => {
        if (!cancelled) setResult({ found: false, valid: false });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const state = !result?.found
    ? { Icon: ShieldX, title: 'Member Tidak Ditemukan', tone: 'rgba(0,0,0,0.06)', color: 'var(--fg)' }
    : result.valid
    ? { Icon: BadgeCheck, title: 'Baraya AL SABBAT Terverifikasi', tone: 'rgba(252,207,43,0.18)', color: 'var(--club-secondary)' }
    : { Icon: ShieldAlert, title: 'Keanggotaan Tidak Aktif', tone: 'rgba(0,0,0,0.06)', color: 'var(--fg)' };

  return (
    <div data-testid="page-member-verify">
      <PublicPageHeader
        label="Verifikasi"
        title="Verifikasi Member"
        description="Pemeriksaan resmi kartu member Baraya AL SABBAT."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Verifikasi Member' }]}
      />
      <div className="als-container py-12 sm:py-16">
        {loading ? (
          <LoadingState variant="text" testId="member-verify-loading" />
        ) : (
          <div className="als-card mx-auto max-w-xl p-7 text-center" data-testid="member-verify-result">
            <span
              className="mx-auto grid h-16 w-16 place-items-center rounded-full"
              style={{ backgroundColor: state.tone }}
              aria-hidden="true"
            >
              <state.Icon className="h-8 w-8" style={{ color: state.color }} />
            </span>
            <h2 className="font-display mt-5 text-xl font-extrabold sm:text-2xl" data-testid="member-verify-title">
              {state.title}
            </h2>

            {result?.found ? (
              <dl className="mt-6 space-y-3 text-left">
                <div className="flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--border-soft)' }}>
                  <dt className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                    Nomor Member
                  </dt>
                  <dd className="font-mono text-sm font-bold" data-testid="member-verify-number">
                    {result.member_number}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--border-soft)' }}>
                  <dt className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                    Nama
                  </dt>
                  <dd className="text-sm font-semibold" data-testid="member-verify-name">
                    {result.full_name}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                    Status
                  </dt>
                  <dd className="text-sm font-semibold" data-testid="member-verify-status">
                    {result.valid ? 'Aktif' : 'Nonaktif'}
                  </dd>
                </div>
                {formatJoined(result.joined_at) ? (
                  <p className="pt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
                    Anggota sejak {formatJoined(result.joined_at)}
                  </p>
                ) : null}
              </dl>
            ) : (
              <p className="mt-4 text-sm" style={{ color: 'var(--muted-fg)' }}>
                Kartu ini tidak terdaftar sebagai member Baraya AL SABBAT.
              </p>
            )}

            <p className="mt-6 text-xs" style={{ color: 'var(--muted-fg)' }}>
              Halaman ini hanya menampilkan data verifikasi minimum. Informasi pribadi anggota tidak pernah ditampilkan.
            </p>
            <Link
              to="/"
              className="als-btn-blue als-focus mt-6 inline-flex"
              data-testid="member-verify-home"
            >
              Kembali ke Beranda
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
