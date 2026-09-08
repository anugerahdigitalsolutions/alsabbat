import React from 'react';
import { Wrench } from 'lucide-react';
import { useClub } from '../../context/ClubContext';

export default function MaintenancePage() {
  const { clubName } = useClub();

  return (
    <div
      className="relative flex min-h-screen w-full items-center justify-center overflow-hidden px-5 py-16"
      style={{ backgroundColor: '#012891' }}
      data-testid="maintenance-screen"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 20% 15%, rgba(252,207,43,0.22), transparent 45%), radial-gradient(circle at 85% 80%, rgba(255,255,255,0.12), transparent 50%)',
        }}
      />
      <div className="relative w-full max-w-xl text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: '#FCCF2B', color: '#04122F' }}
        >
          <Wrench className="h-7 w-7" />
        </div>
        <p
          className="mt-8 text-xs font-bold uppercase tracking-[0.32em]"
          style={{ color: '#FCCF2B' }}
          data-testid="maintenance-brand"
        >
          {clubName || 'AL SABBAT'}
        </p>
        <h1
          className="mt-4 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl"
          data-testid="maintenance-title"
        >
          SEDANG MAINTENANCE SISTEM
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm text-white/80 sm:text-base" data-testid="maintenance-note">
          Website sedang dalam perbaikan terjadwal. Silakan kembali beberapa saat lagi — terima kasih atas
          kesabaran Baraya.
        </p>
        <div
          className="mx-auto mt-10 h-px w-24"
          style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}
          aria-hidden="true"
        />
        <p className="mt-6 text-xs uppercase tracking-[0.2em] text-white/50">
          © {new Date().getFullYear()} {clubName || 'AL SABBAT Football Club'}
        </p>
      </div>
    </div>
  );
}
