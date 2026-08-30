import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, UserPlus } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useBaraya } from '../../context/BarayaAuthContext';
import { OtpVerifyForm } from '../../components/public/OtpVerifyForm';
import { GoogleLoginButton } from '../../components/public/GoogleLoginButton';

const FIELDS = [
  ['full_name', 'Nama Lengkap', 'text'],
  ['email', 'Email', 'email'],
  ['phone', 'Nomor WhatsApp', 'tel'],
  ['password', 'Kata Sandi', 'password'],
  ['password_confirmation', 'Konfirmasi Kata Sandi', 'password'],
];

export default function BarayaRegisterPage() {
  usePageSeo({
    title: 'Daftar Baraya AL SABBAT',
    description: 'Buat akun Baraya AL SABBAT untuk pembelian merchandise dan riwayat pesanan.',
    path: '/daftar',
    robots: 'noindex,follow',
  });
  const { register, verifyOtp } = useBaraya();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });
  const [error, setError] = useState(null);
  const [verification, setVerification] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    if (form.password !== form.password_confirmation) {
      setError('Konfirmasi kata sandi tidak sama.');
      return;
    }
    setSubmitting(true);
    const result = await register(form);
    setSubmitting(false);
    if (result.ok) {
      setVerification({ email: result.email || form.email, delivered: !!result.otp_delivered });
      return;
    }
    setError(result.message);
  };

  const confirmOtp = async (code) => {
    const result = await verifyOtp({ email: verification.email, code });
    if (result.ok) {
      navigate('/akun', { replace: true });
      return { ok: true };
    }
    return result;
  };

  if (verification) {
    return (
      <div data-testid="page-baraya-register">
        <PublicPageHeader
          label="Baraya AL SABBAT"
          title="Verifikasi Email Anda"
          description="Masukkan kode 6 digit yang kami kirim ke email Anda untuk mengaktifkan akun."
          breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Daftar', to: '/daftar' }, { label: 'Verifikasi' }]}
        />
        <div className="als-container py-10 sm:py-14">
          <div className="als-card mx-auto max-w-lg p-6 sm:p-8" data-testid="baraya-register-otp-step">
            <OtpVerifyForm
              email={verification.email}
              purpose="REGISTER"
              delivered={verification.delivered}
              onSubmit={confirmOtp}
              submitLabel="Verifikasi & Masuk"
              testId="baraya-register-otp"
            />
            <p className="mt-4 text-xs" style={{ color: 'var(--muted-fg)' }}>
              Salah alamat email?{' '}
              <button
                type="button"
                className="font-semibold underline"
                style={{ color: 'var(--club-secondary)' }}
                onClick={() => setVerification(null)}
                data-testid="baraya-register-otp-back"
              >
                Ubah data pendaftaran
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-baraya-register">
      <PublicPageHeader
        label="Baraya AL SABBAT"
        title="Daftar Baraya AL SABBAT"
        description="Satu akun untuk pembelian merchandise, riwayat pesanan, dan profil Baraya."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Daftar' }]}
      />
      <div className="als-container py-10 sm:py-14">
        <form className="als-card mx-auto max-w-xl space-y-4 p-6 sm:p-8" onSubmit={submit} data-testid="baraya-register-form">
          <div className="grid gap-4 sm:grid-cols-2">
            {FIELDS.map(([key, label, type]) => (
              <div key={key} className={key === 'password' || key === 'password_confirmation' ? undefined : 'sm:col-span-2'}>
                <Label className="mb-1.5 block">{label}</Label>
                <Input
                  type={type}
                  required
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  data-testid={`baraya-register-${key.replace(/_/g, '-')}`}
                />
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
            Kata sandi minimal 8 karakter dan memuat huruf serta angka.
          </p>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[44px] font-semibold"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            data-testid="baraya-register-submit"
          >
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            {submitting ? 'Memproses…' : 'Buat Akun Baraya'}
          </Button>

          <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
            <span className="h-px flex-1" style={{ backgroundColor: 'var(--border-soft)' }} />
            atau
            <span className="h-px flex-1" style={{ backgroundColor: 'var(--border-soft)' }} />
          </div>
          <GoogleLoginButton label="Daftar dengan Google" testId="baraya-register-google" />

          {error ? (
            <p
              className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
              style={{ backgroundColor: 'rgba(220,38,38,0.10)', color: '#991B1B' }}
              data-testid="baraya-register-error"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
            Sudah punya akun?{' '}
            <Link to="/login" className="font-semibold underline" style={{ color: 'var(--club-secondary)' }} data-testid="baraya-register-to-login">
              Login untuk Baraya AL SABBAT
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
