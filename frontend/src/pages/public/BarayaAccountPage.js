import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CreditCard, Images, KeyRound, LogOut, Receipt, Save, Star, UserCog } from 'lucide-react';
import { toast } from 'sonner';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { usePageSeo } from '../../hooks/usePageSeo';
import { apiErrorMessage } from '../../lib/api';
import { useBaraya } from '../../context/BarayaAuthContext';
import {
  barayaChangePassword,
  barayaDeletePhoto,
  barayaUpdateProfile,
  barayaUploadPhoto,
} from '../../services/barayaAuth';
import { MemberCard } from '../../components/member/MemberCard';
import { PlayerSpotlight, pickSpotlightPlayer } from '../../components/public/PlayerSpotlight';
import { LoadingState } from '../../components/shared/LoadingState';
import { EmptyState } from '../../components/shared/EmptyState';
import { useResourceList } from '../../hooks/useResourceList';
import { MediaPicker } from '../../components/shared/MediaPicker';
import { MEDIA_SPECS } from '../../lib/mediaHints';
import { canAccessGallery, canApplyPlayer, canApplyStaff, hasRole, roleLabel } from '../../lib/memberAccess';
import { UserPlus } from 'lucide-react';

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
    description: 'Profil akun Baraya AL SABBAT.',
    path: '/akun',
    robots: 'noindex,follow',
  });
  const { customer, reload, logout } = useBaraya();
  const hasClubAccess = canAccessGallery(customer);
  const showPlayerCta = canApplyPlayer(customer);
  const showStaffCta = canApplyStaff(customer);
  const [profile, setProfile] = useState({
    full_name: customer?.full_name || '',
    phone: customer?.phone || '',
    photo_url: customer?.photo_url || '',
  });
  const [passwords, setPasswords] = useState({ current_password: '', new_password: '' });
  const [saving, setSaving] = useState(false);
  const players = useResourceList('/players', { status: 'ACTIVE', limit: 8 });
  const spotlightPlayer = useMemo(() => pickSpotlightPlayer(players.items), [players.items]);

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
        label="Baraya AL SABBAT"
        title="Akun Saya"
        description="Kelola profil Baraya AL SABBAT dan pantau pesanan merchandise Anda."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Akun Saya' }]}
      />
      <div className="als-container py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          <div className="space-y-8">
            <form className="als-card space-y-4 p-6" onSubmit={saveProfile} data-testid="baraya-profile-form">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="als-section-label">Data Baraya</p>
                  <span className="als-gold-rule mt-1 block" aria-hidden="true" />
                </div>
                {showPlayerCta ? (
                  <Link
                    to="/akun/pengajuan"
                    className="als-focus font-display inline-flex min-h-[40px] items-center gap-2 rounded-[var(--radius-sm)] px-4 text-sm font-bold"
                    style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                    data-testid="baraya-profile-player-cta"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    Daftar Pemain
                  </Link>
                ) : null}
              </div>
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
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Foto Profil</Label>
                  <MediaPicker
                    value={profile.photo_url}
                    onChange={async (url) => {
                      setProfile((p) => ({ ...p, photo_url: url }));
                      if (!url) await barayaDeletePhoto().catch(() => {});
                      await reload();
                    }}
                    uploader={barayaUploadPhoto}
                    libraryEnabled={false}
                    testId="baraya-profile-photo"
                    spec={MEDIA_SPECS.barayaPhoto}
                    hint="Upload langsung dari HP atau komputer (JPG/PNG/WEBP, maks 10MB). Foto ini juga tampil pada kartu member Anda."
                  />
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

            <section className="als-card space-y-4 p-6" data-testid="baraya-account-spotlight">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="als-section-label">Sorotan Pemain</p>
                  <span className="als-gold-rule mt-1 block" aria-hidden="true" />
                </div>
                <Link to="/teams" className="als-view-all als-focus" data-testid="baraya-account-spotlight-action">
                  Lihat Pemain
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
              {players.loading ? (
                <LoadingState rows={1} testId="baraya-account-spotlight-loading" />
              ) : spotlightPlayer ? (
                <PlayerSpotlight player={spotlightPlayer} />
              ) : (
                <EmptyState
                  icon={Star}
                  title="Data pemain belum tersedia"
                  description="Sorotan pemain akan tampil setelah data pemain dilengkapi."
                  testId="baraya-account-spotlight-empty"
                />
              )}
            </section>
          </div>

          <div className="space-y-6">
            <div className="als-card space-y-4 p-6" data-testid="baraya-member-section">
              <p className="als-section-label">Kartu Member Baraya AL SABBAT</p>
              <span className="als-gold-rule mt-1 block" aria-hidden="true" />
              <MemberCard card={{
                member_number: customer?.member_number,
                member_code: customer?.member_code,
                full_name: customer?.full_name,
                photo_url: customer?.photo_url,
                status: customer?.status,
                role: customer?.role,
                joined_at: customer?.joined_at || customer?.created_at,
              }} testId="account-member-card" />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span style={{ color: 'var(--muted-fg)' }}>Nomor Member</span>
                <span className="font-mono font-bold" data-testid="baraya-member-number">
                  {customer?.member_number || '—'}
                </span>
              </div>
              <Link
                to="/akun/kartu"
                className="als-focus font-display flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-bold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                data-testid="baraya-member-card-link"
              >
                <CreditCard className="h-4 w-4" aria-hidden="true" />
                Lihat Kartu
              </Link>
            </div>

            <div className="als-card space-y-4 p-6" data-testid="baraya-account-summary">
            <p className="als-section-label">Ringkasan Akun</p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span style={{ color: 'var(--muted-fg)' }}>Status</span>
                <Badge variant="outline" style={{ backgroundColor: 'rgba(252,207,43,0.16)' }} data-testid="baraya-account-status">
                  {customer?.status === 'ACTIVE' ? 'Aktif' : customer?.status || '—'}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span style={{ color: 'var(--muted-fg)' }}>Peran</span>
                <Badge variant="outline" style={{ backgroundColor: 'rgba(1,40,145,0.10)' }} data-testid="baraya-account-role">
                  {roleLabel(customer)}
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

            {showStaffCta ? (
              <Link
                to="/akun/pengajuan"
                className="als-focus font-display flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-sm)] text-sm font-bold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                data-testid="baraya-account-staff-link"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                Daftar Staff
              </Link>
            ) : (
              <Link
                to="/akun/pengajuan"
                className="als-focus font-display flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-sm)] border text-sm font-bold"
                style={{ borderColor: 'var(--border-soft)' }}
                data-testid="baraya-account-application-link"
              >
                <UserCog className="h-4 w-4" aria-hidden="true" />
                Pengajuan Saya
              </Link>
            )}

            {hasClubAccess ? (
              <>
                <Link
                  to="/gallery"
                  className="als-focus font-display flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-sm)] border text-sm font-bold"
                  style={{ borderColor: 'var(--border-soft)' }}
                  data-testid="baraya-account-gallery-link"
                >
                  <Images className="h-4 w-4" aria-hidden="true" />
                  Galeri Klub
                </Link>
                <Link
                  to="/teams"
                  className="als-focus font-display flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-sm)] border text-sm font-bold"
                  style={{ borderColor: 'var(--border-soft)' }}
                  data-testid="baraya-account-spotlight-link"
                >
                  <Star className="h-4 w-4" aria-hidden="true" />
                  {hasRole(customer, 'PEMAIN') ? 'Data Pemain & Sorotan' : 'Sorotan Pemain'}
                </Link>
              </>
            ) : (
              <p className="text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="baraya-account-locked-note">
                Galeri &amp; Sorotan Pemain terbuka setelah pengajuan Pemain Anda disetujui pengurus.
              </p>
            )}

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
    </div>
  );
}
