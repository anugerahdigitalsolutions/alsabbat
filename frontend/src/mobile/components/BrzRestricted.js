import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, LogIn, UserPlus } from 'lucide-react';
import { useBaraya } from '../../context/BarayaAuthContext';

/**
 * Mobile version of the existing `RestrictedAccessPanel` (Fase 3 rules):
 * Galeri & Sorotan Pemain are for PEMAIN / STAFF only. The backend enforces
 * this too — this panel just mirrors it in the mobile UI.
 */
export const BrzRestricted = ({ feature = 'Konten ini', testId = 'brz-restricted' }) => {
  const { isBaraya } = useBaraya();

  return (
    <div className="brz-card brz-card--pad flex flex-col items-start gap-3" data-testid={testId}>
      <span className="brz-icon-btn" style={{ color: 'var(--brz-accent)' }}>
        <Lock size={18} aria-hidden="true" />
      </span>
      <div>
        <p className="text-[15px] font-semibold" data-testid={`${testId}-title`}>
          {feature} khusus Pemain &amp; Staf
        </p>
        <p className="brz-body mt-1.5">
          {isBaraya
            ? 'Ajukan diri sebagai Pemain, lalu pengurus klub akan meninjau pengajuan Anda.'
            : 'Masuk terlebih dahulu untuk mengajukan akses.'}
        </p>
      </div>
      {isBaraya ? (
        <Link to="/akun/pengajuan" className="brz-btn brz-btn--accent" data-testid={`${testId}-cta`}>
          <UserPlus size={16} aria-hidden="true" />
          Daftar Pemain
        </Link>
      ) : (
        <Link to="/login" className="brz-btn brz-btn--accent" data-testid={`${testId}-login`}>
          <LogIn size={16} aria-hidden="true" />
          Masuk
        </Link>
      )}
    </div>
  );
};

export default BrzRestricted;
