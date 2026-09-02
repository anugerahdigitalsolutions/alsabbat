import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { EmptyState } from '../shared/EmptyState';
import { LoadingState } from '../shared/LoadingState';
import { useClub } from '../../context/ClubContext';
import { departmentOptions, positionOptions } from '../../lib/staffStructure';
import { resolveMediaUrl } from '../public/gallery/mediaUtils';

const STATUS_STYLE = {
  PENDING: { label: 'Menunggu', bg: 'rgba(252,207,43,0.22)' },
  APPROVED: { label: 'Disetujui', bg: 'rgba(22,163,74,0.14)' },
  REJECTED: { label: 'Ditolak', bg: 'rgba(220,38,38,0.12)' },
};

const TYPE_LABEL = { PEMAIN: 'Pemain', STAFF: 'Staf' };

// Sama dengan pilihan Admin → Pemain (PlayerPosition).
const POSITIONS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'];

const STAFF_FIELDS = [
  { key: 'name', label: 'Nama' },
  { key: 'instagram', label: 'Instagram' },
];

const PLAYER_FIELDS = [
  { key: 'full_name', label: 'Nama Lengkap' },
  { key: 'display_name', label: 'Display Name' },
  { key: 'jersey_number', label: 'Nomor Punggung', type: 'number' },
  { key: 'position', label: 'Posisi', type: 'select' },
  { key: 'date_of_birth', label: 'Tanggal Lahir', type: 'date' },
  { key: 'nationality', label: 'Kebangsaan' },
  { key: 'height_cm', label: 'Tinggi (cm)', type: 'number' },
  { key: 'weight_kg', label: 'Berat (kg)', type: 'number' },
  { key: 'instagram', label: 'Instagram' },
];

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

/** Preview foto pengajuan — memakai resolver media yang sama dengan seluruh app.
 *  Foto lokal disimpan sebagai path relatif (`/api/media/files/...`) sehingga harus
 *  diresolusi ke BACKEND_URL. Bila gagal dimuat, error DITAMPILKAN (tidak disembunyikan). */
const ApplicantPhoto = ({ url, label, testId }) => {
  const [broken, setBroken] = useState(false);
  const src = resolveMediaUrl(url);

  return (
    <div className="sm:col-span-2">
      <Label className="mb-1 block text-xs">{label}</Label>
      {!url ? (
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }} data-testid={`${testId}-empty`}>
          Pemohon tidak mengunggah foto.
        </p>
      ) : broken ? (
        <p className="text-xs" style={{ color: '#991B1B' }} data-testid={`${testId}-error`}>
          Foto gagal dimuat dari: {src}
        </p>
      ) : (
        <img
          src={src}
          alt={label}
          onError={() => setBroken(true)}
          className="h-28 w-28 rounded-[var(--radius-sm)] object-cover"
          data-testid={testId}
        />
      )}
    </div>
  );
};

/** Fase 3 — Admin: tinjau pengajuan Pemain/Staf dan tautkan ke record existing. */
export const MemberApplications = ({ onDecided }) => {
  const { meta } = useClub();
  const departments = departmentOptions(meta);
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [linkId, setLinkId] = useState('');
  const [note, setNote] = useState('');
  const [playerData, setPlayerData] = useState({});
  const [staffData, setStaffData] = useState({});
  const [pendingCount, setPendingCount] = useState(0);
  const [options, setOptions] = useState({ players: [], staff: [] });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/baraya/admin/applications', {
        params: { limit: 100, ...(status ? { status } : {}) },
      });
      setItems(data.items || []);
      const { data: pendingData } = await api.get('/baraya/admin/applications', {
        params: { limit: 1, status: 'PENDING' },
      });
      setPendingCount(pendingData.total || 0);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat pengajuan.'));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    Promise.all([
      api.get('/players', { params: { limit: 200 } }).catch(() => ({ data: { items: [] } })),
      api.get('/staff', { params: { limit: 200 } }).catch(() => ({ data: { items: [] } })),
    ]).then(([players, staff]) =>
      setOptions({ players: players.data.items || [], staff: staff.data.items || [] })
    );
  }, []);

  const openDialog = (application) => {
    setDialog(application);
    setLinkId(application.player_id || application.staff_id || '');
    setNote(application.note || '');
    setPlayerData({ ...(application.player_data || {}) });
    setStaffData({ ...(application.staff_data || {}) });
  };

  const saveData = async () => {
    if (!dialog) return;
    setBusy(true);
    try {
      const isStaff = dialog.type === 'STAFF';
      const payload = isStaff ? { staff_data: { ...staffData } } : { player_data: { ...playerData } };
      if (payload.player_data?.jersey_number === '') payload.player_data.jersey_number = null;
      if (payload.player_data?.height_cm === '') payload.player_data.height_cm = null;
      if (payload.player_data?.weight_kg === '') payload.player_data.weight_kg = null;
      const { data } = await api.patch(`/baraya/admin/applications/${dialog.id}/data`, payload);
      setDialog((d) => ({ ...d, ...data }));
      if (data.staff_data) setStaffData({ ...data.staff_data });
      toast.success('Data pengajuan diperbarui.');
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memperbarui data pengajuan.'));
    } finally {
      setBusy(false);
    }
  };

  const decide = async (decision) => {
    if (!dialog) return;
    setBusy(true);
    try {
      const payload = { decision, note: note || null };
      if (decision === 'APPROVED') {
        // Linking opsional: kosong → backend membuat record baru dari data pengajuan.
        if (dialog.type === 'PEMAIN') payload.player_id = linkId || null;
        else payload.staff_id = linkId || null;
      }
      await api.patch(`/baraya/admin/applications/${dialog.id}`, payload);
      toast.success(decision === 'APPROVED' ? 'Pengajuan disetujui.' : 'Pengajuan ditolak.');
      setDialog(null);
      await load();
      if (onDecided) onDecided();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memproses pengajuan.'));
    } finally {
      setBusy(false);
    }
  };

  const linkOptions = dialog?.type === 'PEMAIN' ? options.players : options.staff;

  return (
    <div className="als-card space-y-4 p-5" data-testid="admin-applications">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-display flex items-center gap-2 text-base font-bold md:text-lg">
            Pengajuan Pemain &amp; Staf
            {pendingCount ? (
              <Badge
                variant="outline"
                style={{ backgroundColor: 'rgba(252,207,43,0.24)' }}
                data-testid="admin-applications-pending-count"
              >
                {pendingCount} perlu direview
              </Badge>
            ) : null}
          </p>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            Pengajuan Pemain yang disetujui otomatis menjadi Pemain baru (foto ikut terbawa) —
            tanpa perlu menautkan pemain yang sudah ada. Pengajuan Staf otomatis membuat
            Staff Entry baru sesuai Bagian &amp; Jabatan (akun dan profil Pemain tidak diubah).
          </p>
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-11 rounded-[var(--radius-sm)] border px-3 text-sm"
          style={{ borderColor: 'var(--border-soft)' }}
          data-testid="admin-applications-filter"
        >
          <option value="PENDING">Menunggu</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REJECTED">Ditolak</option>
          <option value="">Semua</option>
        </select>
      </div>

      {loading ? (
        <LoadingState variant="table" rows={3} testId="admin-applications-loading" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Belum ada pengajuan"
          description="Pengajuan Pemain dan Staf dari akun Baraya akan tampil di sini."
          testId="admin-applications-empty"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="als-admin-table w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-2)' }}>
                {['Tanggal', 'Nama', 'Email', 'Ajuan', 'Posisi', 'Status', 'Aksi'].map((head) => (
                  <th key={head} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t" style={{ borderColor: 'var(--border-soft)' }} data-testid={`admin-application-row-${item.id}`}>
                  <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3 font-semibold">{item.full_name}</td>
                  <td className="px-4 py-3">{item.customer?.email || item.email || '—'}</td>
                  <td className="px-4 py-3">{TYPE_LABEL[item.type] || item.type}</td>
                  <td className="px-4 py-3">{item.position || '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" style={{ backgroundColor: STATUS_STYLE[item.status]?.bg }}>
                      {STATUS_STYLE[item.status]?.label || item.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {item.status === 'PENDING' ? (
                      <Button variant="outline" size="sm" onClick={() => openDialog(item)} data-testid={`admin-application-review-${item.id}`}>
                        Tinjau
                      </Button>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                        {item.decided_by || '—'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto bg-white" data-testid="admin-application-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Tinjau Pengajuan {TYPE_LABEL[dialog?.type] || ''}</DialogTitle>
            <DialogDescription>
              Pengajuan Pemain otomatis membuat record Pemain baru dari data pengajuan (opsional:
              tautkan ke Pemain yang sudah ada). Pengajuan Staf membuat Staff Entry baru sesuai
              Bagian &amp; Jabatan (atau ditulis ke Staff Entry yang Anda pilih).
              Satu akun Baraya dapat memiliki profil Pemain dan beberapa Staff Entry sekaligus —
              menyetujui pengajuan Staf tidak menghapus status Pemain.
            </DialogDescription>
          </DialogHeader>

          {dialog ? (
            <div className="space-y-4">
              <div className="rounded-[var(--radius-sm)] p-3 text-sm" style={{ backgroundColor: 'var(--surface-2)' }}>
                <p className="font-semibold">{dialog.full_name}</p>
                <p style={{ color: 'var(--muted-fg)' }}>{dialog.customer?.email || dialog.email}</p>
                <p className="mt-1" style={{ color: 'var(--muted-fg)' }}>
                  WhatsApp: {dialog.phone} · Posisi: {dialog.position || '—'} · Lahir: {dialog.birth_date || '—'}
                </p>
                {dialog.experience ? <p className="mt-2">Pengalaman: {dialog.experience}</p> : null}
                <p className="mt-2">Motivasi: {dialog.motivation}</p>
              </div>

              {dialog.type === 'STAFF' ? (
                <div className="space-y-3" data-testid="admin-application-staff-data">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                    Data staf (dapat dilengkapi sebelum approval)
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {STAFF_FIELDS.map((field) => (
                      <div key={field.key}>
                        <Label className="mb-1 block text-xs">{field.label}</Label>
                        <Input
                          value={staffData[field.key] ?? ''}
                          onChange={(e) => setStaffData((d) => ({ ...d, [field.key]: e.target.value }))}
                          data-testid={`admin-application-staff-field-${field.key}`}
                        />
                      </div>
                    ))}
                    <div>
                      <Label className="mb-1 block text-xs">Bagian / Department</Label>
                      <select
                        value={staffData.department || ''}
                        onChange={(e) =>
                          setStaffData((d) => ({ ...d, department: e.target.value, position_title: '' }))
                        }
                        className="h-10 w-full rounded-[var(--radius-sm)] border px-2 text-sm"
                        style={{ borderColor: 'var(--border-soft)' }}
                        data-testid="admin-application-staff-field-department"
                      >
                        <option value="">— pilih bagian —</option>
                        {departments.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Jabatan / Position</Label>
                      <select
                        value={staffData.position_title || ''}
                        onChange={(e) => setStaffData((d) => ({ ...d, position_title: e.target.value }))}
                        className="h-10 w-full rounded-[var(--radius-sm)] border px-2 text-sm"
                        style={{ borderColor: 'var(--border-soft)' }}
                        disabled={!staffData.department}
                        data-testid="admin-application-staff-field-position"
                      >
                        <option value="">
                          {staffData.department ? '— pilih jabatan —' : 'pilih bagian dulu'}
                        </option>
                        {positionOptions(meta, staffData.department).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="mb-1 block text-xs">Bio</Label>
                      <Textarea
                        rows={2}
                        value={staffData.bio ?? ''}
                        onChange={(e) => setStaffData((d) => ({ ...d, bio: e.target.value }))}
                        data-testid="admin-application-staff-field-bio"
                      />
                    </div>
                    {staffData.photo ? (
                      <ApplicantPhoto
                        url={staffData.photo}
                        label="Foto Staf dari pemohon"
                        testId="admin-application-staff-photo"
                      />
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={saveData}
                    disabled={busy}
                    data-testid="admin-application-save-staff-data"
                  >
                    Simpan Perubahan Data
                  </Button>
                </div>
              ) : null}

              {dialog.type === 'PEMAIN' ? (
                <div className="space-y-3" data-testid="admin-application-player-data">
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                    Data pemain (dapat dilengkapi sebelum approval)
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PLAYER_FIELDS.map((field) => (
                      <div key={field.key}>
                        <Label className="mb-1 block text-xs">{field.label}</Label>
                        {field.type === 'select' ? (
                          <select
                            value={playerData[field.key] || 'MIDFIELDER'}
                            onChange={(e) => setPlayerData((d) => ({ ...d, [field.key]: e.target.value }))}
                            className="h-10 w-full rounded-[var(--radius-sm)] border px-2 text-sm"
                            style={{ borderColor: 'var(--border-soft)' }}
                            data-testid={`admin-application-field-${field.key}`}
                          >
                            {POSITIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            type={field.type || 'text'}
                            value={playerData[field.key] ?? ''}
                            onChange={(e) => setPlayerData((d) => ({ ...d, [field.key]: e.target.value }))}
                            data-testid={`admin-application-field-${field.key}`}
                          />
                        )}
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <Label className="mb-1 block text-xs">Bio</Label>
                      <Textarea
                        rows={2}
                        value={playerData.bio ?? ''}
                        onChange={(e) => setPlayerData((d) => ({ ...d, bio: e.target.value }))}
                        data-testid="admin-application-field-bio"
                      />
                    </div>
                    <ApplicantPhoto
                      url={playerData.photo}
                      label="Foto dari pemohon"
                      testId="admin-application-photo"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={saveData}
                    disabled={busy}
                    data-testid="admin-application-save-data"
                  >
                    Simpan Perubahan Data
                  </Button>
                </div>
              ) : null}

              {/* Pengajuan STAFF selalu membuat Staff Entry baru dari data
                  pengajuan, sehingga field penautan tidak lagi ditampilkan.
                  Untuk PEMAIN, opsi penautan tetap tersedia seperti semula. */}
              {dialog.type !== 'STAFF' ? (
                <div>
                  <Label className="mb-1.5 block">
                    {`Tautkan ke record ${TYPE_LABEL[dialog.type]} yang sudah ada (opsional)`}
                  </Label>
                  <select
                    value={linkId}
                    onChange={(e) => setLinkId(e.target.value)}
                    className="h-11 w-full rounded-[var(--radius-sm)] border px-3 text-sm"
                    style={{ borderColor: 'var(--border-soft)' }}
                    data-testid="admin-application-link"
                  >
                    <option value="">— buat Pemain baru —</option>
                    {linkOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.full_name || option.display_name || option.name}
                        {option.jersey_number ? ` · #${option.jersey_number}` : ''}
                        {option.position_title || option.role_label || option.position
                          ? ` · ${option.position_title || option.role_label || option.position}`
                          : ''}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="admin-application-player-hint">
                    Dibiarkan kosong → sistem otomatis membuat Pemain baru dari data pengajuan
                    (nama, posisi, nomor punggung, foto). Tidak perlu memilih pemain yang sudah ada.
                  </p>
                </div>
              ) : null}

              <div>
                <Label className="mb-1.5 block">Catatan untuk pemohon (opsional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} data-testid="admin-application-note" />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => decide('APPROVED')}
                  disabled={busy}
                  className="min-h-[44px] font-semibold"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid="admin-application-approve"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  {linkId
                    ? 'Setujui & Tautkan'
                    : dialog.type === 'STAFF'
                    ? 'Setujui & Buat Staff Entry'
                    : 'Setujui & Buat Pemain Baru'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => decide('REJECTED')}
                  disabled={busy}
                  className="min-h-[44px] font-semibold"
                  data-testid="admin-application-reject"
                >
                  <XCircle className="mr-2 h-4 w-4" aria-hidden="true" />
                  Tolak
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberApplications;
