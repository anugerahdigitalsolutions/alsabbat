import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, LogIn, ShieldCheck } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { usePageSeo } from '../../hooks/usePageSeo';
import { BARAYA_AUTH_ENABLED, BARAYA_AUTH_NOTICE, barayaLogin } from '../../services/barayaAuth';

const BENEFITS = [
  'Simpan data pengiriman untuk checkout merchandise yang lebih cepat',
  'Lihat riwayat dan status pesanan kapan saja',
  'Kelola profil Baraya ALSABBAT dalam satu akun',
];

export default function BarayaLoginPage() {
  usePageSeo({
    title: 'Login Baraya ALSABBAT',
    description: 'Login akun Baraya ALSABBAT untuk pembelian merchandise dan riwayat pesanan.',
    path: '/login',
    robots: 'noindex,follow',
  });
  const [form, setForm] = useState({ email: '', password: '' });
  const [notice, setNotice] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await barayaLogin(form);
    } catch (e) {
      setNotice(e.message || BARAYA_AUTH_NOTICE);
    }
  };

  return (
    <div data-testid="page-baraya-login">
      <PublicPageHeader
        label="Baraya ALSABBAT"
        title="Login untuk Baraya ALSABBAT"
        description="Akun pengunjung dan pelanggan resmi ALSABBAT. Bukan akses staf maupun admin klub."
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
                Daftar sebagai Baraya ALSABBAT
              </Link>
            </p>
          </div>

          <form className="als-card h-fit space-y-4 p-6" onSubmit={submit} data-testid="baraya-login-form">
            <div>
              <Label className="mb-1.5 block">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="nama@email.com"
                data-testid="baraya-login-email"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Kata Sandi</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                data-testid="baraya-login-password"
              />
            </div>

            <Button
              type="submit"
              className="w-full min-h-[44px] font-semibold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              data-testid="baraya-login-submit"
            >
              <LogIn className="mr-2 h-4 w-4" aria-hidden="true" />
              Masuk
            </Button>

            {!BARAYA_AUTH_ENABLED || notice ? (
              <p
                className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
                style={{ backgroundColor: 'rgba(252,207,43,0.16)', color: '#7A5A00' }}
                data-testid="baraya-login-notice"
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {notice || BARAYA_AUTH_NOTICE}
              </p>
            ) : null}

            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
              Untuk sementara pembelian merchandise tetap bisa dilakukan tanpa akun melalui{' '}
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
