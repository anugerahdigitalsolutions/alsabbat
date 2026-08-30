import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, Lock, UserPlus } from 'lucide-react';
import { useBaraya } from '../../context/BarayaAuthContext';

/**
 * Fase 3 — panel akses terkunci untuk Galeri & Sorotan Pemain.
 * Ditampilkan untuk Guest dan Member (Pemain & Staf melihat konten aslinya).
 */
export const RestrictedAccessPanel = ({
  feature = 'Konten ini',
  compact = false,
  testId = 'restricted-access',
}) => {
  const { isBaraya } = useBaraya();

  return (
    <div
      className={`als-card flex flex-col items-start gap-4 ${compact ? 'p-5' : 'p-6 sm:p-8'}`}
      style={{ backgroundColor: 'var(--surface-2)' }}
      data-testid={testId}
    >
      <span
        className="grid h-11 w-11 place-items-center rounded-[var(--radius-sm)]"
        style={{ backgroundColor: 'rgba(1,40,145,0.10)', color: 'var(--club-secondary)' }}
        aria-hidden="true"
      >
        <Lock className="h-5 w-5" />
      </span>
      <div>
        <p className="font-display text-base font-bold md:text-lg" data-testid={`${testId}-title`}>
          {feature} khusus Pemain &amp; Staf
        </p>
        <p className="mt-2 max-w-xl text-sm" style={{ color: 'var(--muted-fg)' }} data-testid={`${testId}-message`}>
          Galeri dan Sorotan Pemain AL SABBAT hanya dapat diakses oleh Pemain dan Staf klub.
          {isBaraya
            ? ' Ajukan diri sebagai Pemain, lalu pengurus klub akan meninjau pengajuan Anda.'
            : ' Silakan login sebagai Baraya AL SABBAT terlebih dahulu.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        {isBaraya ? (
          <Link
            to="/akun/pengajuan"
            className="als-focus font-display inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-sm)] px-5 text-sm font-bold"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            data-testid={`${testId}-cta`}
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Daftar Pemain
          </Link>
        ) : (
          <>
            <Link
              to="/login"
              state={{ from: '/akun' }}
              className="als-focus font-display inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-sm)] px-5 text-sm font-bold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              data-testid={`${testId}-login`}
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              Login
            </Link>
            <Link
              to="/daftar"
              className="als-focus font-display inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-sm)] border px-5 text-sm font-bold"
              style={{ borderColor: 'var(--border-soft)' }}
              data-testid={`${testId}-register`}
            >
              Buat Akun Baraya
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default RestrictedAccessPanel;
