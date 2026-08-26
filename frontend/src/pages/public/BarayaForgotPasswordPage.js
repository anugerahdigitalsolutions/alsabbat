import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, MailCheck, Send } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { usePageSeo } from '../../hooks/usePageSeo';
import { apiErrorMessage } from '../../lib/api';
import { barayaForgotPassword } from '../../services/barayaAuth';

export default function BarayaForgotPasswordPage() {
  usePageSeo({
    title: 'Lupa Kata Sandi',
    description: 'Minta instruksi reset kata sandi akun Baraya ALSABBAT.',
    path: '/lupa-password',
    robots: 'noindex,follow',
  });
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await barayaForgotPassword(email);
      setSent(data?.message || 'Jika email terdaftar, instruksi reset kata sandi telah dikirim.');
    } catch (e) {
      setError(apiErrorMessage(e, 'Permintaan gagal diproses. Coba lagi beberapa saat.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div data-testid="page-baraya-forgot">
      <PublicPageHeader
        label="Baraya ALSABBAT"
        title="Lupa Kata Sandi"
        description="Masukkan email akun Baraya Anda. Kami akan mengirim tautan untuk membuat kata sandi baru."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Login', to: '/login' }, { label: 'Lupa Kata Sandi' }]}
      />
      <div className="als-container py-10 sm:py-14">
        <form className="als-card mx-auto max-w-lg space-y-4 p-6 sm:p-8" onSubmit={submit} data-testid="baraya-forgot-form">
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
            {submitting ? 'Mengirim…' : 'Kirim Instruksi Reset'}
          </Button>

          {sent ? (
            <p
              className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
              style={{ backgroundColor: 'rgba(22,163,74,0.12)', color: '#166534' }}
              data-testid="baraya-forgot-success"
            >
              <MailCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {sent} Periksa kotak masuk dan folder spam Anda. Tautan berlaku singkat dan hanya sekali pakai.
            </p>
          ) : null}

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

          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
            Ingat kata sandi Anda?{' '}
            <Link to="/login" className="font-semibold underline" style={{ color: 'var(--club-secondary)' }} data-testid="baraya-forgot-to-login">
              Kembali ke halaman login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
