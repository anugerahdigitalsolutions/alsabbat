import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Megaphone, RefreshCw, Send, CalendarClock, Loader2, AlarmClockCheck } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { EmptyState } from '../../components/shared/EmptyState';

const GROUPS = [
  { value: 'ALL_MEMBERS', label: 'Semua Member' },
  { value: 'MEMBERS_ONLY', label: 'Member Saja' },
  { value: 'PLAYERS_ONLY', label: 'Pemain Saja' },
  { value: 'PLAYERS_AND_STAFF', label: 'Pemain & Staff' },
];

const GROUP_LABELS = GROUPS.reduce((acc, g) => ({ ...acc, [g.value]: g.label }), {});

const STATUS_META = {
  SCHEDULED: { label: 'Terjadwal', color: 'rgba(252,207,43,0.20)' },
  SENDING: { label: 'Mengirim', color: 'rgba(252,207,43,0.20)' },
  SENT: { label: 'Terkirim', color: 'rgba(34,160,90,0.16)' },
  FAILED: { label: 'Gagal', color: 'rgba(220,60,60,0.16)' },
};

const EMPTY_FORM = {
  title: '',
  message: '',
  recipient_group: 'ALL_MEMBERS',
  delivery_type: 'SEND_NOW',
  date: '',
  time: '',
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

export default function AdminBroadcastPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('member:write');

  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      const [list, recipients] = await Promise.all([
        api.get('/broadcasts', { params }),
        api.get('/broadcasts/recipient-counts'),
      ]);
      setItems(list.data?.items || []);
      setCounts(recipients.data || {});
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat broadcast.'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const scheduledIso = useMemo(() => {
    if (form.delivery_type !== 'SCHEDULED' || !form.date || !form.time) return null;
    const parsed = new Date(`${form.date}T${form.time}`);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }, [form.delivery_type, form.date, form.time]);

  const validate = () => {
    if (form.title.trim().length < 3) return 'Judul minimal 3 karakter.';
    if (form.message.trim().length < 3) return 'Isi pesan minimal 3 karakter.';
    if (form.delivery_type === 'SCHEDULED') {
      if (!form.date || !form.time) return 'Tanggal dan waktu jadwal wajib diisi.';
      if (!scheduledIso) return 'Tanggal/waktu jadwal tidak valid.';
      if (new Date(scheduledIso).getTime() <= Date.now()) return 'Waktu jadwal harus di masa depan.';
    }
    return null;
  };

  const openConfirm = () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    setConfirmOpen(true);
  };

  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        recipient_group: form.recipient_group,
        delivery_type: form.delivery_type,
      };
      if (form.delivery_type === 'SCHEDULED') payload.scheduled_at = scheduledIso;
      const { data } = await api.post('/broadcasts', payload);
      if (data?.status === 'SENT') {
        toast.success(`Broadcast terkirim ke ${data.notification_count ?? 0} penerima.`);
      } else if (data?.status === 'FAILED') {
        toast.error(data.error_message || 'Broadcast gagal dikirim.');
      } else {
        toast.success(`Broadcast dijadwalkan pada ${formatDateTime(data?.scheduled_at)}.`);
      }
      setConfirmOpen(false);
      setFormOpen(false);
      setForm(EMPTY_FORM);
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan broadcast.'));
    } finally {
      setSaving(false);
    }
  };

  const processDue = async () => {
    setProcessing(true);
    try {
      const { data } = await api.post('/broadcasts/process-due');
      const processed = data?.processed || 0;
      toast.success(
        processed > 0
          ? `${processed} broadcast terjadwal diproses.`
          : 'Tidak ada broadcast terjadwal yang jatuh tempo.'
      );
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memproses jadwal.'));
    } finally {
      setProcessing(false);
    }
  };

  const recipientCount = counts[form.recipient_group];

  return (
    <div className="space-y-6" data-testid="admin-broadcast-page">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Broadcast</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
            Kirim notifikasi ke Baraya AL SABBAT. Notifikasi muncul di pusat notifikasi
            (icon lonceng) akun penerima seperti notifikasi lainnya.
          </p>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={processDue}
              disabled={processing}
              data-testid="broadcast-process-due"
            >
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <AlarmClockCheck className="mr-2 h-4 w-4" />
              )}
              Proses Jadwal
            </Button>
            <Button
              onClick={() => {
                setForm(EMPTY_FORM);
                setFormOpen(true);
              }}
              data-testid="broadcast-create-open"
            >
              <Megaphone className="mr-2 h-4 w-4" /> Buat Broadcast
            </Button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {GROUPS.map((group) => (
          <div key={group.value} className="als-card p-4" data-testid={`broadcast-count-${group.value}`}>
            <p className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--muted-fg)' }}>
              {group.label}
            </p>
            <p className="font-display mt-1 text-xl font-bold tabular-nums">
              {counts[group.value] ?? '—'}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-56">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="broadcast-filter-status">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              {Object.keys(STATUS_META).map((key) => (
                <SelectItem key={key} value={key}>
                  {STATUS_META[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={load} data-testid="broadcast-reload">
          <RefreshCw className="mr-2 h-4 w-4" /> Muat ulang
        </Button>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
          Memuat…
        </p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Belum ada broadcast"
          description="Buat broadcast untuk mengirim notifikasi ke member, pemain, atau staff."
          testId="broadcast-empty"
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const meta = STATUS_META[item.status] || { label: item.status, color: 'transparent' };
            return (
              <div key={item.id} className="als-card p-5" data-testid={`broadcast-row-${item.id}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-base font-bold">{item.title}</span>
                  <Badge variant="outline" style={{ backgroundColor: meta.color }}>
                    {meta.label}
                  </Badge>
                  <Badge variant="outline">{GROUP_LABELS[item.recipient_group] || item.recipient_group}</Badge>
                  <Badge variant="outline">
                    {item.delivery_type === 'SEND_NOW' ? 'Kirim Sekarang' : 'Terjadwal'}
                  </Badge>
                  {typeof item.notification_count === 'number' ? (
                    <span className="ml-auto text-sm tabular-nums" style={{ color: 'var(--muted-fg)' }}>
                      {item.notification_count} penerima
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 whitespace-pre-line text-sm">{item.message}</p>
                <div
                  className="mt-3 grid gap-1 text-xs sm:grid-cols-2 lg:grid-cols-4"
                  style={{ color: 'var(--muted-fg)' }}
                >
                  <span>Jadwal: {item.delivery_type === 'SCHEDULED' ? formatDateTime(item.scheduled_at) : '—'}</span>
                  <span>Dibuat: {formatDateTime(item.created_at)}</span>
                  <span>Terkirim: {formatDateTime(item.sent_at)}</span>
                  <span>Oleh: {item.created_by || '—'}</span>
                </div>
                {item.error_message ? (
                  <p className="mt-2 text-xs" style={{ color: 'var(--error)' }}>
                    {item.error_message}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto bg-white" data-testid="broadcast-form-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Buat Broadcast</DialogTitle>
            <DialogDescription>
              Notifikasi dikirim memakai pusat notifikasi yang sudah ada, jadi langsung muncul
              di akun penerima.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="broadcast-title">Judul</Label>
              <Input
                id="broadcast-title"
                value={form.title}
                maxLength={140}
                onChange={(e) => setField('title', e.target.value)}
                placeholder="Contoh: Latihan Bersama Hari Sabtu"
                className="bg-white"
                data-testid="broadcast-form-title"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="broadcast-message">Isi Pesan</Label>
              <Textarea
                id="broadcast-message"
                value={form.message}
                maxLength={2000}
                rows={5}
                onChange={(e) => setField('message', e.target.value)}
                placeholder="Tulis isi notifikasi…"
                className="bg-white"
                data-testid="broadcast-form-message"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Penerima</Label>
              <Select
                value={form.recipient_group}
                onValueChange={(v) => setField('recipient_group', v)}
              >
                <SelectTrigger className="bg-white" data-testid="broadcast-form-group">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GROUPS.map((group) => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                      {typeof counts[group.value] === 'number' ? ` (${counts[group.value]})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Pengiriman</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={form.delivery_type === 'SEND_NOW' ? 'default' : 'outline'}
                  onClick={() => setField('delivery_type', 'SEND_NOW')}
                  data-testid="broadcast-form-mode-now"
                >
                  <Send className="mr-2 h-4 w-4" /> Kirim Sekarang
                </Button>
                <Button
                  type="button"
                  variant={form.delivery_type === 'SCHEDULED' ? 'default' : 'outline'}
                  onClick={() => setField('delivery_type', 'SCHEDULED')}
                  data-testid="broadcast-form-mode-schedule"
                >
                  <CalendarClock className="mr-2 h-4 w-4" /> Jadwalkan
                </Button>
              </div>
            </div>

            {form.delivery_type === 'SCHEDULED' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="broadcast-date">Tanggal</Label>
                  <Input
                    id="broadcast-date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setField('date', e.target.value)}
                    className="bg-white"
                    data-testid="broadcast-form-date"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="broadcast-time">Waktu</Label>
                  <Input
                    id="broadcast-time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setField('time', e.target.value)}
                    className="bg-white"
                    data-testid="broadcast-form-time"
                  />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} data-testid="broadcast-form-cancel">
              Batal
            </Button>
            <Button onClick={openConfirm} disabled={saving} data-testid="broadcast-form-submit">
              {form.delivery_type === 'SEND_NOW' ? 'Kirim Sekarang' : 'Jadwalkan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-white" data-testid="broadcast-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              {form.delivery_type === 'SEND_NOW' ? 'Kirim broadcast sekarang?' : 'Jadwalkan broadcast?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Penerima: {GROUP_LABELS[form.recipient_group]}
              {typeof recipientCount === 'number' ? ` (${recipientCount} akun)` : ''}.
              {form.delivery_type === 'SEND_NOW'
                ? ' Notifikasi langsung dikirim dan tidak dapat dibatalkan.'
                : ` Akan dikirim otomatis pada ${formatDateTime(scheduledIso)}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving} data-testid="broadcast-confirm-cancel">
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                submit();
              }}
              disabled={saving}
              data-testid="broadcast-confirm-submit"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {form.delivery_type === 'SEND_NOW' ? 'Kirim' : 'Jadwalkan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
