import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, LogOut, Receipt, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { usePageSeo } from '../../hooks/usePageSeo';
import { apiErrorMessage } from '../../lib/api';
import { useBaraya } from '../../context/BarayaAuthContext';
import { barayaChangePassword, barayaUpdateProfile } from '../../services/barayaAuth';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

export default function BarayaAccountPage() {
  usePageSeo({
    title: 'Akun Baraya',
    description: 'Profil akun Baraya ALSABBAT.',
    path: '/akun',
    robots: 'noindex,follow',
  });
  const { customer, reload, logout } = useBaraya();
  const [profile, setProfile] = useState({
    full_name: customer?.full_name || '',
    phone: customer?.phone || '',
  });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' });
  const [saving, setSaving] = useState(false);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await barayaUpdateProfile(profile);
      await reload();
      toast.success('Profil diperbarui.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memperbarui profil.'));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    try {
      await barayaChangePassword(passwords);
      setPasswords({ current_password: '', new_password: '' });
      toast.success('Kata sandi diperbarui.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal mengubah kata sandi.'));
    }
  };

  return (
    <div data-testid="page-baraya-account">
      <PublicPageHeader
        label="Baraya ALSABBAT"
        title="Akun Saya"
        description="Kelola profil Baraya ALSABBAT dan pantau pesanan merchandise Anda."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Akun Saya' }]}
      />
      <div className="als-container py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          <div className="space-y-8">
            <form className="als-card space-y-4 p-6" onSubmit={saveProfile} data-testid="baraya-profile-form">
              <p className="als-section-label">Data Baraya</p>
              <span className="als-gold-rule mt-1 block" aria-hidden="true" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Nama Lengkap</Label>
                  <Input
                    value={profile.full_name}
                    onChange={(e) => setProfile((p) => ({ ...p, full_name: e.target.value }))}
                    data-testid="baraya-profile-name"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Nomor WhatsApp</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                    data-testid="baraya-profile-phone"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Email</Label>
                  <Input value={customer?.email || ''} disabled data-testid="baraya-profile-email" />
                </div>
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="min-h-[44px] font-semibold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                data-testid="baraya-profile-save"
              >
                <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                Simpan Perubahan
              </Button>
            </form>

            <form className="als-card space-y-4 p-6" onSubmit={savePassword} data-testid="baraya-password-form">
              <p className="als-section-label">Ubah Kata Sandi</p>
              <span className="als-gold-rule mt-1 block" aria-hidden="true" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Kata Sandi Saat Ini</Label>
                  <Input
                    type="password"
                    required
                    value={passwords.current_password}
                    onChange={(e) => setPasswords((p) => ({ ...p, current_password: e.target.value }))}
                    data-testid="baraya-password-current"
                  />
                </div>
                <div>
                  <Label className="mb-1.5 block">Kata Sandi Baru</Label>
                  <Input
                    type="password"
                    required
                    value={passwords.new_password}
                    onChange={(e) => setPasswords((p) => ({ ...p, new_password: e.target.value }))}
                    data-testid="baraya-password-new"
                  />
                </div>
              </div>
              <Button type="submit" variant="outline" className="min-h-[44px] font-semibold" data-testid="baraya-password-save">
                <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
                Perbarui Kata Sandi
              </Button>
            </form>
          </div>

          <div className="als-card h-fit space-y-4 p-6" data-testid="baraya-account-summary">
            <p className="als-section-label">Ringkasan Akun</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span style={{ color: 'var(--muted-fg)' }}>Status</span>
                <Badge variant="outline" style={{ backgroundColor: 'rgba(252,207,43,0.16)' }} data-testid="baraya-account-status">
                  {customer?.status === 'ACTIVE' ? 'Aktif' : customer?.status || '—'}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span style={{ color: 'var(--muted-fg)' }}>Bergabung</span>
                <span className="font-semibold">{formatDate(customer?.created_at)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span style={{ color: 'var(--muted-fg)' }}>Login terakhir</span>
                <span className="font-semibold">{formatDate(customer?.last_login_at)}</span>
              </div>
            </div>

            <Link
              to="/akun/pesanan"
              className="als-focus font-display flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-bold"
              style={{ backgroundColor: 'var(--club-secondary)', color: '#FEFEFE' }}
              data-testid="baraya-account-orders-link"
            >
              <Receipt className="h-4 w-4" aria-hidden="true" />
              Pesanan Saya
            </Link>

            <Button variant="outline" className="w-full min-h-[44px]" onClick={logout} data-testid="baraya-account-logout">
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Keluar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
