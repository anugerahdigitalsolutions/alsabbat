import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, Send, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { usePageSeo } from '../../hooks/usePageSeo';
import { apiErrorMessage } from '../../lib/api';
import { useBaraya } from '../../context/BarayaAuthContext';
import {
  barayaCreateApplication,
  barayaMyApplications,
  barayaUploadPhoto,
} from '../../services/barayaAuth';
import { MediaPicker } from '../../components/shared/MediaPicker';
import { MEDIA_SPECS } from '../../lib/mediaHints';
import { roleLabel, roleOf } from '../../lib/memberAccess';

const STATUS_LABEL = {
  PENDING: 'Menunggu Persetujuan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

const TYPE_LABEL = { PEMAIN: 'Pemain', STAFF: 'Staf' };

// Sama dengan pilihan di Admin Panel (PlayerPosition).
const POSITIONS = [
  { value: 'GOALKEEPER', label: 'Penjaga Gawang' },
  { value: 'DEFENDER', label: 'Belakang' },
  { value: 'MIDFIELDER', label: 'Tengah' },
  { value: 'FORWARD', label: 'Depan' },
];

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

const selectClass = 'h-11 w-full rounded-[var(--radius-sm)] border px-3 text-sm';

/** Fase 4A — pengajuan Pemain/Staf memakai field data Pemain existing. */
export default function BarayaApplicationPage() {
  usePageSeo({
    title: 'Daftar Pemain',
    description: 'Ajukan diri menjadi Pemain atau Staf AL SABBAT Football Club.',
    path: '/akun/pengajuan',
    robots: 'noindex,follow',
  });
  const { customer, reload } = useBaraya();
  const role = roleOf(customer);
  const canApply = role === 'MEMBER';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'PEMAIN',
    phone: customer?.phone || '',
    address: '',
    experience: '',
    motivation: '',
    staff_position: '',
    player: {
      full_name: customer?.full_name || '',
      display_name: '',
      jersey_number: '',
      position: 'MIDFIELDER',
      date_of_birth: '',
      nationality: 'Indonesia',
      height_cm: '',
      weight_kg: '',
      bio: '',
      photo: customer?.photo_url || '',
      instagram: '',
    },
  });

  const setPlayer = (patch) => setForm((f) => ({ ...f, player: { ...f.player, ...patch } }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await barayaMyApplications();
      setItems(data.items || []);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat pengajuan.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const isPlayer = form.type === 'PEMAIN';
      const payload = {
        type: form.type,
        full_name: isPlayer ? form.player.full_name : customer?.full_name || '',
        phone: form.phone,
        position: isPlayer ? form.player.position : form.staff_position || null,
        birth_date: isPlayer ? form.player.date_of_birth || null : null,
        address: form.address || null,
        experience: form.experience || null,
        motivation: form.motivation,
      };
      if (isPlayer) {
        const p = form.player;
        payload.player_data = {
          full_name: p.full_name,
          display_name: p.display_name || null,
          jersey_number: p.jersey_number === '' ? null : Number(p.jersey_number),
          position: p.position,
          date_of_birth: p.date_of_birth || null,
          nationality: p.nationality || null,
          height_cm: p.height_cm === '' ? null : Number(p.height_cm),
          weight_kg: p.weight_kg === '' ? null : Number(p.weight_kg),
          bio: p.bio || null,
          photo: p.photo || null,
          instagram: p.instagram || null,
        };
      }
      await barayaCreateApplication(payload);
      toast.success('Pengajuan terkirim. Pengurus klub akan meninjau data Anda.');
      setForm((f) => ({ ...f, motivation: '', experience: '' }));
      await load();
      await reload();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Pengajuan gagal dikirim.'));
    } finally {
      setSubmitting(false);
    }
  };

  const pending = items.find((item) => item.status === 'PENDING');
  const isPlayerForm = form.type === 'PEMAIN';

  return (
    <div data-testid="page-baraya-application">
      <PublicPageHeader
        label="Baraya AL SABBAT"
        title="Daftar Pemain & Staf"
        description="Isi data sesuai formulir pemain resmi klub. Pengurus akan meninjau, melengkapi, lalu menyetujui pengajuan Anda."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Akun Saya', to: '/akun' }, { label: 'Pengajuan' }]}
      />
      <div className="als-container py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          {canApply ? (
            <form className="als-card space-y-5 p-6" onSubmit={submit} data-testid="baraya-application-form">
              <div>
                <p className="als-section-label">Formulir Pengajuan</p>
                <span className="als-gold-rule mt-1 block" aria-hidden="true" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label className="mb-1.5 block">Ajukan Sebagai</Label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className={selectClass}
                    style={{ borderColor: 'var(--border-soft)' }}
                    data-testid="baraya-application-type"
                  >
                    <option value="PEMAIN">Pemain</option>
                    <option value="STAFF">Staf</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-1.5 block">Nomor WhatsApp</Label>
                  <Input
                    required
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    data-testid="baraya-application-phone"
                  />
                </div>
              </div>

              {isPlayerForm ? (
                <div className="space-y-4" data-testid="baraya-application-player-fields">
                  <p className="als-section-label">Data Pemain</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label className="mb-1.5 block">Nama Lengkap</Label>
                      <Input
                        required
                        value={form.player.full_name}
                        onChange={(e) => setPlayer({ full_name: e.target.value })}
                        data-testid="baraya-application-name"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Nama Punggung (Display Name)</Label>
                      <Input
                        value={form.player.display_name}
                        onChange={(e) => setPlayer({ display_name: e.target.value })}
                        data-testid="baraya-application-display-name"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Nomor Punggung (0–99)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={99}
                        value={form.player.jersey_number}
                        onChange={(e) => setPlayer({ jersey_number: e.target.value })}
                        data-testid="baraya-application-jersey"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Posisi</Label>
                      <select
                        value={form.player.position}
                        onChange={(e) => setPlayer({ position: e.target.value })}
                        className={selectClass}
                        style={{ borderColor: 'var(--border-soft)' }}
                        data-testid="baraya-application-position"
                      >
                        {POSITIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Tanggal Lahir</Label>
                      <Input
                        type="date"
                        value={form.player.date_of_birth}
                        onChange={(e) => setPlayer({ date_of_birth: e.target.value })}
                        data-testid="baraya-application-birth"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Kebangsaan</Label>
                      <Input
                        value={form.player.nationality}
                        onChange={(e) => setPlayer({ nationality: e.target.value })}
                        data-testid="baraya-application-nationality"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Tinggi (cm)</Label>
                      <Input
                        type="number"
                        min={100}
                        max={250}
                        value={form.player.height_cm}
                        onChange={(e) => setPlayer({ height_cm: e.target.value })}
                        data-testid="baraya-application-height"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Berat (kg)</Label>
                      <Input
                        type="number"
                        min={30}
                        max={180}
                        value={form.player.weight_kg}
                        onChange={(e) => setPlayer({ weight_kg: e.target.value })}
                        data-testid="baraya-application-weight"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="mb-1.5 block">Foto Pemain</Label>
                      <MediaPicker
                        value={form.player.photo}
                        onChange={(url) => setPlayer({ photo: url })}
                        uploader={barayaUploadPhoto}
                        libraryEnabled={false}
                        testId="baraya-application-photo"
                        spec={MEDIA_SPECS.playerPhoto}
                        hint="Foto portrait yang jelas (wajah terlihat, latar rapi). Foto ini juga menjadi foto profil akun Anda."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="mb-1.5 block">Bio Singkat</Label>
                      <Textarea
                        rows={3}
                        value={form.player.bio}
                        onChange={(e) => setPlayer({ bio: e.target.value })}
                        data-testid="baraya-application-bio"
                      />
                    </div>
                    <div>
                      <Label className="mb-1.5 block">Instagram (opsional)</Label>
                      <Input
                        value={form.player.instagram}
                        onChange={(e) => setPlayer({ instagram: e.target.value })}
                        placeholder="@namaakun"
                        data-testid="baraya-application-instagram"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <Label className="mb-1.5 block">Peran Staf yang Diajukan</Label>
                  <Input
                    value={form.staff_position}
                    onChange={(e) => setForm((f) => ({ ...f, staff_position: e.target.value }))}
                    placeholder="Pelatih, Manajer, Media…"
                    data-testid="baraya-application-staff-position"
                  />
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Alamat</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    data-testid="baraya-application-address"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Pengalaman (opsional)</Label>
                  <Textarea
                    rows={3}
                    value={form.experience}
                    onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
                    data-testid="baraya-application-experience"
                  />
                </div>
                <div className="sm:col-span-2">
                  <Label className="mb-1.5 block">Alasan / Motivasi</Label>
                  <Textarea
                    required
                    rows={4}
                    value={form.motivation}
                    onChange={(e) => setForm((f) => ({ ...f, motivation: e.target.value }))}
                    placeholder="Ceritakan singkat alasan Anda ingin bergabung (minimal 10 karakter)."
                    data-testid="baraya-application-motivation"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting || !!pending}
                className="min-h-[44px] font-semibold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                data-testid="baraya-application-submit"
              >
                <Send className="mr-2 h-4 w-4" aria-hidden="true" />
                {pending ? 'Pengajuan Sedang Diproses' : submitting ? 'Mengirim…' : 'Kirim Pengajuan'}
              </Button>
            </form>
          ) : (
            <div className="als-card space-y-3 p-6" data-testid="baraya-application-closed">
              <p className="font-display text-base font-bold md:text-lg">
                Anda sudah berstatus {roleLabel(customer)}
              </p>
              <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                Formulir pengajuan hanya untuk akun Member. Data pemain Anda kini dikelola pengurus klub
                melalui Admin Panel — hubungi pengurus bila ada data yang perlu diperbarui.
              </p>
              <Link
                to="/akun"
                className="als-focus font-display inline-flex min-h-[44px] items-center rounded-[var(--radius-sm)] border px-5 text-sm font-bold"
                style={{ borderColor: 'var(--border-soft)' }}
                data-testid="baraya-application-closed-back"
              >
                Kembali ke Akun Saya
              </Link>
            </div>
          )}

          <div className="space-y-6">
            <div className="als-card space-y-3 p-6" data-testid="baraya-application-role">
              <p className="als-section-label">Status Akun</p>
              <span className="als-gold-rule mt-1 block" aria-hidden="true" />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span style={{ color: 'var(--muted-fg)' }}>Peran saat ini</span>
                <Badge variant="outline" style={{ backgroundColor: 'rgba(252,207,43,0.16)' }} data-testid="baraya-application-role-badge">
                  {roleLabel(customer)}
                </Badge>
              </div>
              <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                <ShieldCheck className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                Galeri &amp; Sorotan Pemain terbuka untuk peran Pemain dan Staf.
              </p>
              <Link
                to="/akun"
                className="als-focus font-display flex min-h-[44px] items-center justify-center rounded-[var(--radius-sm)] border text-sm font-bold"
                style={{ borderColor: 'var(--border-soft)' }}
                data-testid="baraya-application-back"
              >
                Kembali ke Akun Saya
              </Link>
            </div>

            <div className="als-card space-y-3 p-6" data-testid="baraya-application-history">
              <p className="als-section-label">Riwayat Pengajuan</p>
              <span className="als-gold-rule mt-1 block" aria-hidden="true" />
              {loading ? (
                <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>Memuat…</p>
              ) : items.length === 0 ? (
                <p className="flex items-start gap-2 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="baraya-application-empty">
                  <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  Belum ada pengajuan.
                </p>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-[var(--radius-sm)] p-3 text-sm"
                      style={{ backgroundColor: 'var(--surface-2)' }}
                      data-testid={`baraya-application-item-${item.id}`}
                    >
                      <span className="font-display block font-bold">{TYPE_LABEL[item.type] || item.type}</span>
                      <span className="block text-xs" style={{ color: 'var(--muted-fg)' }}>
                        {formatDate(item.created_at)} · {STATUS_LABEL[item.status] || item.status}
                      </span>
                      {item.note ? (
                        <span className="mt-1 block text-xs" style={{ color: 'var(--muted-fg)' }}>
                          Catatan pengurus: {item.note}
                        </span>
                      ) : null}
                      {item.status === 'REJECTED' ? (
                        <span className="mt-1 block text-xs" style={{ color: '#991B1B' }}>
                          Anda dapat mengirim pengajuan baru dengan data yang diperbarui.
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
