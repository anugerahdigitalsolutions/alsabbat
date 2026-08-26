import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Info, UserPlus } from 'lucide-react';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { usePageSeo } from '../../hooks/usePageSeo';
import { BARAYA_AUTH_ENABLED, BARAYA_AUTH_NOTICE, barayaRegister } from '../../services/barayaAuth';

const FIELDS = [
  ['full_name', 'Nama Lengkap', 'text'],
  ['email', 'Email', 'email'],
  ['phone', 'Nomor Telepon', 'tel'],
  ['password', 'Kata Sandi', 'password'],
];

export default function BarayaRegisterPage() {
  usePageSeo({
    title: 'Daftar Baraya ALSABBAT',
    description: 'Buat akun Baraya ALSABBAT untuk pembelian merchandise dan riwayat pesanan.',
    path: '/daftar',
    robots: 'noindex,follow',
  });
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '' });
  const [notice, setNotice] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    try {
      await barayaRegister(form);
    } catch (e) {
      setNotice(e.message || BARAYA_AUTH_NOTICE);
    }
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
              <div key={key} className={key === 'password' ? 'sm:col-span-2' : undefined}>
                <Label className="mb-1.5 block">{label}</Label>
                <Input
                  type={type}
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  data-testid={`baraya-register-${key.replace('_', '-')}`}
                />
              </div>
            ))}
          </div>

          <Button
            type="submit"
            className="w-full min-h-[44px] font-semibold"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            data-testid="baraya-register-submit"
          >
            <UserPlus className="mr-2 h-4 w-4" aria-hidden="true" />
            Buat Akun Baraya
          </Button>

          {!BARAYA_AUTH_ENABLED || notice ? (
            <p
              className="flex items-start gap-2 rounded-[var(--radius-sm)] p-3 text-xs"
              style={{ backgroundColor: 'rgba(252,207,43,0.16)', color: '#7A5A00' }}
              data-testid="baraya-register-notice"
            >
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {notice || BARAYA_AUTH_NOTICE}
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
