import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, UserPlus } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useBaraya } from '../../context/BarayaAuthContext';

const FIELDS = [
  ['full_name', 'Nama Lengkap', 'text'],
  ['email', 'Email', 'email'],
  ['phone', 'Nomor WhatsApp', 'tel'],
  ['password', 'Kata Sandi', 'password'],
  ['password_confirmation', 'Konfirmasi Kata Sandi', 'password'],
];

export default function BarayaRegisterPage() {
  usePageSeo({
    title: 'Daftar Baraya ALSABBAT',
    description: 'Buat akun Baraya ALSABBAT untuk pembelian merchandise dan riwayat pesanan.',
    path: '/daftar',
    robots: 'noindex,follow',
  });
  const { register } = useBaraya();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    password_confirmation: '',
  });
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
    const result = await register(form);
    setSubmitting(false);
    if (result.ok) {
      setSuccess(true);
      setTimeout(() => navigate('/login', { replace: true }), 1800);
      return;
    }
    setError(result.message);
  };

  return (
    <div data-testid="page-baraya-register">
      <PublicPageHeader
        label="Baraya ALSABBAT"
        title="Daftar Baraya ALSABBAT"
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
            disabled={submitting || success}
            className="w-full min-h-[44px] font-semibold"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            data-testid="baraya-register-submit"
          >
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            {submitting ? 'Memproses…' : 'Buat Akun Baraya'}
          </Button>

          {success ? (
            <p
              className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
              style={{ backgroundColor: 'rgba(22,163,74,0.12)', color: '#166534' }}
              data-testid="baraya-register-success"
            >
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Akun Baraya berhasil dibuat. Mengarahkan ke halaman login…
            </p>
          ) : null}

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
              Login untuk Baraya ALSABBAT
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
