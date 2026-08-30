import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, LogIn, ShieldCheck } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useBaraya } from '../../context/BarayaAuthContext';
import { OtpVerifyForm } from '../../components/public/OtpVerifyForm';
import { GoogleLoginButton } from '../../components/public/GoogleLoginButton';

const BENEFITS = [
  'Simpan data pembeli agar checkout merchandise lebih cepat',
  'Lihat riwayat dan status pesanan kapan saja',
  'Kelola profil Baraya AL SABBAT dalam satu akun',
];

export default function BarayaLoginPage() {
  usePageSeo({
    title: 'Login Baraya AL SABBAT',
    description: 'Login akun Baraya AL SABBAT untuk pembelian merchandise dan riwayat pesanan.',
    path: '/login',
    robots: 'noindex,follow',
  });
  const { login, verifyOtp } = useBaraya();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/akun';
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [verification, setVerification] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await login(form.email, form.password);
    setSubmitting(false);
    if (result.ok) {
      navigate(redirectTo, { replace: true });
      return;
    }
    if (result.needsVerification) {
      setVerification({ email: form.email, message: result.message });
      return;
    }
    setError(result.message);
  };

  const confirmOtp = async (code) => {
    const result = await verifyOtp({ email: verification.email, code });
    if (result.ok) {
      navigate(redirectTo, { replace: true });
      return { ok: true };
    }
    return result;
  };

  if (verification) {
    return (
      <div data-testid="page-baraya-login">
        <PublicPageHeader
          label="Baraya AL SABBAT"
          title="Verifikasi Email Anda"
          description="Akun Anda belum terverifikasi. Masukkan kode 6 digit yang kami kirim ke email Anda."
          breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Login', to: '/login' }, { label: 'Verifikasi' }]}
        />
        <div className="als-container py-10 sm:py-14">
          <div className="als-card mx-auto max-w-lg p-6 sm:p-8" data-testid="baraya-login-otp-step">
            <OtpVerifyForm
              email={verification.email}
              purpose="REGISTER"
              onSubmit={confirmOtp}
              submitLabel="Verifikasi & Masuk"
              testId="baraya-login-otp"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="page-baraya-login">
      <PublicPageHeader
        label="Baraya AL SABBAT"
        title="Login untuk Baraya AL SABBAT"
        description="Akun pengunjung dan pelanggan resmi AL SABBAT. Bukan akses staf maupun admin klub."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Login' }]}
      />
      <div className="als-container py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div>
            <p className="als-section-label">Kenapa punya akun Baraya?</p>
            <span className="als-gold-rule mt-2" aria-hidden="true" />
            <ul className="mt-5 space-y-3" data-testid="baraya-login-benefits">
              {BENEFITS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm" style={{ color: 'var(--muted-fg)' }}>
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm" style={{ color: 'var(--muted-fg)' }}>
              Belum punya akun?{' '}
              <Link to="/daftar" className="font-semibold underline" style={{ color: 'var(--club-secondary)' }} data-testid="baraya-login-to-register">
                Daftar sebagai Baraya AL SABBAT
              </Link>
            </p>
          </div>

          <form className="als-card h-fit space-y-4 p-6" onSubmit={submit} data-testid="baraya-login-form">
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="nama@email.com"
                data-testid="baraya-login-email"
              />
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <Label>Kata Sandi</Label>
                <Link
                  to="/lupa-password"
                  className="text-xs font-semibold underline"
                  style={{ color: 'var(--club-secondary)' }}
                  data-testid="baraya-login-forgot-link"
                >
                  Lupa Kata Sandi?
                </Link>
              </div>
              <Input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                data-testid="baraya-login-password"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full min-h-[44px] font-semibold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              data-testid="baraya-login-submit"
            >
              <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
              {submitting ? 'Memproses…' : 'Masuk'}
            </Button>

            <div className="flex items-center gap-3 text-[11px] uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
              <span className="h-px flex-1" style={{ backgroundColor: 'var(--border-soft)' }} />
              atau
              <span className="h-px flex-1" style={{ backgroundColor: 'var(--border-soft)' }} />
            </div>
            <GoogleLoginButton testId="baraya-login-google" />

            {error ? (
              <p
                className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
                style={{ backgroundColor: 'rgba(220,38,38,0.10)', color: '#991B1B' }}
                data-testid="baraya-login-error"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            ) : null}

            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
              Pembelian merchandise juga tetap bisa dilakukan tanpa akun melalui{' '}
              <Link to="/merchandise" className="font-semibold underline" style={{ color: 'var(--club-secondary)' }}>
                halaman merchandise
              </Link>
              .
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
