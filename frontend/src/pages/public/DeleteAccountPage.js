import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, LogIn, Mail, MessageCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { usePageSeo } from '../../hooks/usePageSeo';
import { apiErrorMessage } from '../../lib/api';
import { useBaraya } from '../../context/BarayaAuthContext';
import { useClub } from '../../context/ClubContext';
import { barayaDeleteAccount } from '../../services/barayaAuth';
import { DELETION_REMOVED, DELETION_RETAINED } from '../../lib/legalContent';

const CONFIRM_WORD = 'HAPUS';

/**
 * Halaman publik penghapusan akun (referensi web wajib Google Play).
 * Dapat dibuka tanpa login dan tanpa aplikasi terpasang; eksekusi penghapusan
 * memakai autentikasi akun existing (tidak pernah meminta kata sandi via email).
 */
export default function DeleteAccountPage() {
  const { customer, loading, logout } = useBaraya();
  const { club, clubName } = useClub();
  const [acknowledged, setAcknowledged] = useState(false);
  const [word, setWord] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  usePageSeo({
    title: 'Hapus Akun',
    description:
      'Permintaan penghapusan akun dan data pengguna AL SABBAT Football Club, dapat dilakukan tanpa aplikasi.',
    path: '/hapus-akun',
  });

  const contact = club?.contact || {};
  const ready = acknowledged && word.trim().toUpperCase() === CONFIRM_WORD;

  const submit = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      await barayaDeleteAccount();
      await logout();
      setDone(true);
      toast.success('Akun AL SABBAT Anda beserta data pribadi terkait telah dihapus.');
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Penghapusan akun gagal. Coba lagi.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="page-delete-account">
      <PublicPageHeader
        label="Akun & Data"
        title="Hapus Akun AL SABBAT Football Club"
        description="Ajukan penghapusan akun dan data pribadi Anda. Tidak memerlukan aplikasi terpasang."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Hapus Akun' }]}
      />

      <div className="als-container py-10">
        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="space-y-6">
            <div className="als-card p-6">
              <h2 className="font-display text-lg font-bold">Cara meminta penghapusan akun</h2>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                <li>
                  <strong>Melalui halaman ini:</strong> masuk dengan akun AL SABBAT Anda, lalu isi konfirmasi
                  penghapusan di bawah. Akun langsung diproses dan dihapus permanen.
                </li>
                <li>
                  <strong>Melalui aplikasi AL SABBAT:</strong> buka Profile → Pengaturan Akun → Hapus Akun.
                </li>
                <li>
                  <strong>Bila Anda tidak dapat mengakses akun:</strong> kirim permintaan penghapusan dari alamat
                  email yang terdaftar ke kontak resmi klub di samping. Permintaan diverifikasi lewat email
                  terdaftar — kami tidak pernah meminta kata sandi Anda melalui email atau pesan.
                </li>
              </ol>
              <p className="mt-4 text-xs" style={{ color: 'var(--muted-fg)' }}>
                Penghapusan akun bersifat permanen dan tidak dapat dibatalkan.
              </p>
            </div>

            <div className="als-card p-6" data-testid="delete-account-web-form">
              <h2 className="font-display text-lg font-bold">Proses penghapusan sekarang</h2>
              {done ? (
                <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-sm)] p-4" style={{ backgroundColor: 'rgba(16,185,129,0.08)' }}>
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#059669' }} />
                  <div>
                    <p className="text-sm font-semibold">Akun berhasil dihapus.</p>
                    <p className="mt-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
                      Sesi Anda sudah diakhiri. Terima kasih telah menjadi bagian dari {clubName || 'AL SABBAT'}.
                    </p>
                  </div>
                </div>
              ) : loading ? (
                <p className="mt-4 text-sm" style={{ color: 'var(--muted-fg)' }}>
                  Memuat status akun…
                </p>
              ) : !customer ? (
                <div className="mt-4">
                  <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                    Untuk keamanan, penghapusan akun hanya dapat dilakukan oleh pemilik akun. Silakan masuk
                    terlebih dahulu, lalu kembali ke halaman ini.
                  </p>
                  <Button asChild className="mt-4" data-testid="delete-account-login">
                    <Link to="/login">
                      <LogIn className="mr-2 h-4 w-4" />
                      Masuk ke akun AL SABBAT
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3 rounded-[var(--radius-sm)] p-4" style={{ backgroundColor: 'rgba(220,38,38,0.07)' }}>
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#dc2626' }} />
                    <p className="text-sm">
                      Akun yang akan dihapus: <strong>{customer.email}</strong>
                      {customer.member_number ? ` (member #${customer.member_number})` : ''}. Tindakan ini
                      permanen dan tidak dapat dibatalkan.
                    </p>
                  </div>

                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(event) => setAcknowledged(event.target.checked)}
                      className="mt-1 h-4 w-4"
                      data-testid="delete-account-web-ack"
                    />
                    <span>Saya memahami penghapusan akun bersifat permanen dan tidak dapat dibatalkan.</span>
                  </label>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                      Tulis &quot;{CONFIRM_WORD}&quot; untuk konfirmasi
                    </p>
                    <Input
                      value={word}
                      onChange={(event) => setWord(event.target.value)}
                      placeholder={CONFIRM_WORD}
                      className="mt-2"
                      data-testid="delete-account-web-word"
                    />
                  </div>

                  <Button
                    variant="destructive"
                    disabled={!ready || busy}
                    onClick={submit}
                    data-testid="delete-account-web-submit"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {busy ? 'Menghapus…' : 'Hapus Akun Saya'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="als-card p-6">
              <h2 className="font-display text-base font-bold">Data yang dihapus</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                {DELETION_REMOVED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="als-card p-6">
              <h2 className="font-display text-base font-bold">Data yang dipertahankan</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                {DELETION_RETAINED.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-3 flex items-start gap-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Rincian lengkap tersedia pada{' '}
                <Link to="/kebijakan-privasi" className="underline" data-testid="delete-account-privacy-link">
                  Kebijakan Privasi
                </Link>
                .
              </p>
            </div>

            <div className="als-card p-6" data-testid="delete-account-contact">
              <h2 className="font-display text-base font-bold">Butuh bantuan?</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {contact.email ? (
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0" style={{ color: 'var(--club-secondary)' }} />
                    <a href={`mailto:${contact.email}`} className="underline">
                      {contact.email}
                    </a>
                  </li>
                ) : null}
                {contact.whatsapp ? (
                  <li className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 shrink-0" style={{ color: 'var(--club-secondary)' }} />
                    <span>{contact.whatsapp}</span>
                  </li>
                ) : null}
                <li>
                  <Link to="/contact" className="underline" data-testid="delete-account-contact-link">
                    Lihat semua kontak resmi klub
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
