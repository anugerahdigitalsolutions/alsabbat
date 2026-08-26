import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { usePageSeo } from '../../hooks/usePageSeo';
import { apiErrorMessage } from '../../lib/api';
import { barayaResetPassword } from '../../services/barayaAuth';

export default function BarayaResetPasswordPage() {
  usePageSeo({
    title: 'Reset Kata Sandi',
    description: 'Buat kata sandi baru untuk akun Baraya ALSABBAT.',
    path: '/reset-password',
    robots: 'noindex,nofollow',
  });
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', password_confirmation: '' });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    if (form.password !== form.password_confirmation) {
      setError('Konfirmasi kata sandi tidak sama.');
      return;
    }
    setSubmitting(true);
    try {
      await barayaResetPassword({ token, ...form });
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (e) {
      setError(apiErrorMessage(e, 'Tautan reset tidak valid atau sudah kedaluwarsa.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="page-baraya-reset">
      <PublicPageHeader
        label="Baraya ALSABBAT"
        title="Reset Kata Sandi"
        description="Buat kata sandi baru untuk akun Baraya ALSABBAT Anda."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Login', to: '/login' }, { label: 'Reset Kata Sandi' }]}
      />
      <div className="als-container py-10 sm:py-14">
        {!token ? (
          <div className="als-card mx-auto max-w-lg p-6 sm:p-8" data-testid="baraya-reset-invalid">
            <p className="als-section-label">Tautan tidak valid</p>
            <span className="als-gold-rule mt-2 block" aria-hidden="true" />
            <p className="mt-4 text-sm" style={{ color: 'var(--muted-fg)' }}>
              Tautan reset tidak lengkap atau sudah kedaluwarsa. Silakan minta tautan baru.
            </p>
            <Link
              to="/lupa-password"
              className="als-focus font-display mt-6 inline-flex min-h-[44px] items-center rounded-[var(--radius-sm)] px-4 text-sm font-bold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              data-testid="baraya-reset-request-new"
            >
              Minta Tautan Baru
            </Link>
          </div>
        ) : (
          <form className="als-card mx-auto max-w-lg space-y-4 p-6 sm:p-8" onSubmit={submit} data-testid="baraya-reset-form">
            <div>
              <Label className="mb-1.5 block">Kata Sandi Baru</Label>
              <Input
                type="password"
                required
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                data-testid="baraya-reset-password"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Konfirmasi Kata Sandi</Label>
              <Input
                type="password"
                required
                value={form.password_confirmation}
                onChange={(e) => setForm((f) => ({ ...f, password_confirmation: e.target.value }))}
                data-testid="baraya-reset-confirmation"
              />
            </div>
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
              Kata sandi minimal 8 karakter dan memuat huruf serta angka.
            </p>

            <Button
              type="submit"
              disabled={submitting || success}
              className="w-full min-h-[44px] font-semibold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              data-testid="baraya-reset-submit"
            >
              <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
              {submitting ? 'Memproses…' : 'Reset Kata Sandi'}
            </Button>

            {success ? (
              <p
                className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
                style={{ backgroundColor: 'rgba(22,163,74,0.12)', color: '#166534' }}
                data-testid="baraya-reset-success"
              >
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                Kata sandi berhasil diperbarui. Mengarahkan ke halaman login…
              </p>
            ) : null}

            {error ? (
              <p
                className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
                style={{ backgroundColor: 'rgba(220,38,38,0.10)', color: '#991B1B' }}
                data-testid="baraya-reset-error"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {error}
              </p>
            ) : null}

            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
              Butuh tautan baru?{' '}
              <Link to="/lupa-password" className="font-semibold underline" style={{ color: 'var(--club-secondary)' }} data-testid="baraya-reset-to-forgot">
                Minta instruksi reset lagi
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
