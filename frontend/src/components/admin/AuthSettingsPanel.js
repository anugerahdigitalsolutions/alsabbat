import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, KeyRound, Mail, ShieldAlert } from 'lucide-react';
import api from '../../lib/api';

const Row = ({ icon: Icon, title, configured, detail, note, testId }) => (
  <div className="rounded-[var(--radius-sm)] p-4" style={{ backgroundColor: 'var(--surface-2)' }} data-testid={testId}>
    <div className="flex items-start justify-between gap-3">
      <span className="flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </span>
      <span
        className="font-display shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider"
        style={
          configured
            ? { backgroundColor: 'rgba(22,163,74,0.16)', color: '#166534' }
            : { backgroundColor: 'rgba(220,38,38,0.12)', color: '#991B1B' }
        }
        data-testid={`${testId}-status`}
      >
        {configured ? 'Terkonfigurasi' : 'Belum dikonfigurasi'}
      </span>
    </div>
    {detail ? (
      <p className="mt-2 break-all font-mono text-xs" style={{ color: 'var(--muted-fg)' }}>
        {detail}
      </p>
    ) : null}
    <p className="mt-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
      {note}
    </p>
  </div>
);

/** Fase 3 — status konfigurasi OTP (RESEND) & Login Google. Tidak pernah menampilkan secret. */
export const AuthSettingsPanel = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    api
      .get('/baraya/admin/auth-settings')
      .then(({ data: payload }) => setData(payload))
      .catch(() => setData(null));
  }, []);

  return (
    <div className="als-card space-y-4 p-5" data-testid="admin-auth-settings">
      <div>
        <p className="font-display text-base font-bold md:text-lg">Pengaturan Login &amp; OTP</p>
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
          Kredensial hanya dibaca dari environment server (tidak pernah disimpan di database atau browser).
        </p>
      </div>

      {/* Grid kini 2 kolom: kartu status Firebase sengaja tidak ditampilkan di
          Admin Panel. Kemampuan FCM di backend tetap ada sebagai skeleton
          (untuk aplikasi mobile ke depan) tanpa muncul sebagai kartu status. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Row
          icon={Mail}
          title="Email OTP (RESEND)"
          configured={!!data?.email?.configured}
          detail={data?.email?.sender ? `Pengirim: ${data.email.sender}` : null}
          note={
            data?.email?.note ||
            'Set RESEND_API_KEY dan MAIL_FROM di environment server (.env backend), lalu restart layanan.'
          }
          testId="admin-auth-email"
        />
        <Row
          icon={KeyRound}
          title="Login Google"
          configured={!!data?.google?.configured}
          detail={data?.google?.client_id ? `Client ID: ${data.google.client_id}` : null}
          note={
            data?.google?.note ||
            'Set GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di environment server, dan daftarkan redirect URI /auth/google di Google Cloud Console.'
          }
          testId="admin-auth-google"
        />
      </div>

      <p className="flex items-start gap-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
        {data?.email?.configured && data?.google?.configured ? (
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )}
        Selama email belum dikonfigurasi, pendaftaran tetap membuat kode OTP namun email tidak terkirim —
        sistem melaporkannya secara jujur di layar pengguna.
      </p>
    </div>
  );
};

export default AuthSettingsPanel;
