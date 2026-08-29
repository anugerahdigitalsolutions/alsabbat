import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { EmptyState } from '../shared/EmptyState';
import { LoadingState } from '../shared/LoadingState';

const STATUS_STYLE = {
  PENDING: { label: 'Menunggu', bg: 'rgba(252,207,43,0.22)' },
  APPROVED: { label: 'Disetujui', bg: 'rgba(22,163,74,0.14)' },
  REJECTED: { label: 'Ditolak', bg: 'rgba(220,38,38,0.12)' },
};

const TYPE_LABEL = { PEMAIN: 'Pemain', STAFF: 'Staf' };

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

/** Fase 3 — Admin: tinjau pengajuan Pemain/Staf dan tautkan ke record existing. */
export const MemberApplications = ({ onDecided }) => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null);
  const [linkId, setLinkId] = useState('');
  const [note, setNote] = useState('');
  const [options, setOptions] = useState({ players: [], staff: [] });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/baraya/admin/applications', {
        params: { limit: 100, ...(status ? { status } : {}) },
      });
      setItems(data.items || []);
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
    setLinkId('');
    setNote('');
  };

  const decide = async (decision) => {
    if (!dialog) return;
    setBusy(true);
    try {
      const payload = { decision, note: note || null };
      if (decision === 'APPROVED') {
        if (dialog.type === 'PEMAIN') payload.player_id = linkId;
        else payload.staff_id = linkId;
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
          <p className="font-display text-base font-bold md:text-lg">Pengajuan Pemain &amp; Staf</p>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            Setujui pengajuan dengan menautkan akun ke record Pemain/Staf yang sudah ada (tidak membuat data ganda).
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
        <DialogContent className="max-w-lg bg-white" data-testid="admin-application-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Tinjau Pengajuan {TYPE_LABEL[dialog?.type] || ''}</DialogTitle>
            <DialogDescription>
              Menyetujui pengajuan akan mengubah peran akun Baraya dan membuka akses Galeri &amp; Sorotan Pemain.
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

              <div>
                <Label className="mb-1.5 block">
                  Tautkan ke record {TYPE_LABEL[dialog.type]} yang sudah ada
                </Label>
                <select
                  value={linkId}
                  onChange={(e) => setLinkId(e.target.value)}
                  className="h-11 w-full rounded-[var(--radius-sm)] border px-3 text-sm"
                  style={{ borderColor: 'var(--border-soft)' }}
                  data-testid="admin-application-link"
                >
                  <option value="">— pilih record —</option>
                  {linkOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.full_name || option.display_name || option.name}
                      {option.jersey_number ? ` · #${option.jersey_number}` : ''}
                      {option.role_label || option.position ? ` · ${option.role_label || option.position}` : ''}
                    </option>
                  ))}
                </select>
                {!linkOptions.length ? (
                  <p className="mt-2 text-xs" style={{ color: '#991B1B' }} data-testid="admin-application-no-records">
                    Belum ada record {TYPE_LABEL[dialog.type]} di Admin Panel. Buat datanya terlebih dahulu di menu{' '}
                    {dialog.type === 'PEMAIN' ? 'Pemain' : 'Staf'}.
                  </p>
                ) : null}
              </div>

              <div>
                <Label className="mb-1.5 block">Catatan untuk pemohon (opsional)</Label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} data-testid="admin-application-note" />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => decide('APPROVED')}
                  disabled={busy || !linkId}
                  className="min-h-[44px] font-semibold"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid="admin-application-approve"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  Setujui &amp; Tautkan
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
