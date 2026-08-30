import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Send } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { usePageSeo } from '../../hooks/usePageSeo';
import { apiErrorMessage } from '../../lib/api';
import { barayaRequestOtp, barayaResetPasswordOtp } from '../../services/barayaAuth';
import { OtpVerifyForm } from '../../components/public/OtpVerifyForm';

/** Fase 3 — lupa kata sandi memakai kode OTP (SMTP2GO). */
export default function BarayaForgotPasswordPage() {
  usePageSeo({
    title: 'Lupa Kata Sandi',
    description: 'Reset kata sandi akun Baraya AL SABBAT dengan kode verifikasi email.',
    path: '/lupa-password',
    robots: 'noindex,follow',
  });
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('EMAIL');
  const [delivered, setDelivered] = useState(true);
  const [passwords, setPasswords] = useState({ password: '', password_confirmation: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const requestCode = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await barayaRequestOtp(email, 'RESET');
      setDelivered(!!data?.delivered);
      setStep('CODE');
    } catch (e) {
      setError(apiErrorMessage(e, 'Permintaan gagal diproses. Coba lagi beberapa saat.'));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmReset = async (code) => {
    if (passwords.password !== passwords.password_confirmation) {
      return { ok: false, message: 'Konfirmasi kata sandi tidak sama.' };
    }
    try {
      await barayaResetPasswordOtp({ email, code, ...passwords });
      navigate('/login', { replace: true, state: { reset: true } });
      return { ok: true };
    } catch (e) {
      return { ok: false, message: apiErrorMessage(e, 'Kode salah atau sudah kedaluwarsa.') };
    }
  };

  return (
    <div data-testid="page-baraya-forgot">
      <PublicPageHeader
        label="Baraya AL SABBAT"
        title="Lupa Kata Sandi"
        description="Masukkan email akun Baraya Anda. Kami akan mengirim kode verifikasi untuk membuat kata sandi baru."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Login', to: '/login' }, { label: 'Lupa Kata Sandi' }]}
      />
      <div className="als-container py-10 sm:py-14">
        <div className="als-card mx-auto max-w-lg space-y-4 p-6 sm:p-8">
          {step === 'EMAIL' ? (
            <form className="space-y-4" onSubmit={requestCode} data-testid="baraya-forgot-form">
              <div>
                <Label className="mb-1.5 block">Email</Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  data-testid="baraya-forgot-email"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[44px] font-semibold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                data-testid="baraya-forgot-submit"
              >
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                {submitting ? 'Mengirim…' : 'Kirim Kode Verifikasi'}
              </Button>

              {error ? (
                <p
                  className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
                  style={{ backgroundColor: 'rgba(220,38,38,0.10)', color: '#991B1B' }}
                  data-testid="baraya-forgot-error"
                >
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              ) : null}
            </form>
          ) : (
            <OtpVerifyForm
              email={email}
              purpose="RESET"
              delivered={delivered}
              onSubmit={confirmReset}
              submitLabel="Simpan Kata Sandi Baru"
              testId="baraya-forgot-otp"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Kata Sandi Baru</Label>
                  <Input
                    type="password"
                    required
                    value={passwords.password}
                    onChange={(e) => setPasswords((p) => ({ ...p, password: e.target.value }))}
                    data-testid="baraya-forgot-password"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Konfirmasi Kata Sandi</Label>
                  <Input
                    type="password"
                    required
                    value={passwords.password_confirmation}
                    onChange={(e) => setPasswords((p) => ({ ...p, password_confirmation: e.target.value }))}
                    data-testid="baraya-forgot-password-confirm"
                  />
                </div>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                Kata sandi minimal 8 karakter dan memuat huruf serta angka.
              </p>
            </OtpVerifyForm>
          )}

          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
            Ingat kata sandi Anda?{' '}
            <Link to="/login" className="font-semibold underline" style={{ color: 'var(--club-secondary)' }} data-testid="baraya-forgot-to-login">
              Kembali ke halaman login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
