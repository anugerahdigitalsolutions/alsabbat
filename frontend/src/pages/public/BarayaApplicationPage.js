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
import { barayaCreateApplication, barayaMyApplications } from '../../services/barayaAuth';
import { roleLabel } from '../../lib/memberAccess';

const STATUS_LABEL = {
  PENDING: 'Menunggu Persetujuan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

const TYPE_LABEL = { PEMAIN: 'Pemain', STAFF: 'Staf' };

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

/** Fase 3 — pengajuan menjadi Pemain atau Staf AL SABBAT. */
export default function BarayaApplicationPage() {
  usePageSeo({
    title: 'Pengajuan Pemain & Staf',
    description: 'Ajukan diri menjadi Pemain atau Staf AL SABBAT Football Club.',
    path: '/akun/pengajuan',
    robots: 'noindex,follow',
  });
  const { customer, reload } = useBaraya();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: 'PEMAIN',
    full_name: customer?.full_name || '',
    phone: customer?.phone || '',
    position: '',
    birth_date: '',
    address: '',
    experience: '',
    motivation: '',
  });

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
      await barayaCreateApplication(form);
      toast.success('Pengajuan terkirim. Pengurus klub akan meninjau data Anda.');
      setForm((f) => ({ ...f, position: '', experience: '', motivation: '' }));
      await load();
      await reload();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Pengajuan gagal dikirim.'));
    } finally {
      setSubmitting(false);
    }
  };

  const pending = items.find((item) => item.status === 'PENDING');

  return (
    <div data-testid="page-baraya-application">
      <PublicPageHeader
        label="Baraya AL SABBAT"
        title="Daftar Pemain & Staf"
        description="Ajukan diri menjadi Pemain atau Staf AL SABBAT. Akses Galeri dan Sorotan Pemain terbuka setelah pengajuan disetujui pengurus."
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: 'Akun Saya', to: '/akun' }, { label: 'Pengajuan' }]}
      />
      <div className="als-container py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
          <form className="als-card space-y-4 p-6" onSubmit={submit} data-testid="baraya-application-form">
            <p className="als-section-label">Formulir Pengajuan</p>
            <span className="als-gold-rule mt-1 block" aria-hidden="true" />

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">Ajukan Sebagai</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="h-11 w-full rounded-[var(--radius-sm)] border px-3 text-sm"
                  style={{ borderColor: 'var(--border-soft)' }}
                  data-testid="baraya-application-type"
                >
                  <option value="PEMAIN">Pemain</option>
                  <option value="STAFF">Staf</option>
                </select>
              </div>
              <div>
                <Label className="mb-1.5 block">Nama Lengkap</Label>
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                  data-testid="baraya-application-name"
                />
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
              <div>
                <Label className="mb-1.5 block">
                  {form.type === 'PEMAIN' ? 'Posisi Bermain' : 'Peran Staf'}
                </Label>
                <Input
                  value={form.position}
                  onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                  placeholder={form.type === 'PEMAIN' ? 'Penjaga Gawang / Belakang / Tengah / Depan' : 'Pelatih, Manajer, Media…'}
                  data-testid="baraya-application-position"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Tanggal Lahir</Label>
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
                  data-testid="baraya-application-birth"
                />
              </div>
              <div>
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
                    <li key={item.id} className="rounded-[var(--radius-sm)] p-3 text-sm" style={{ backgroundColor: 'var(--surface-2)' }} data-testid={`baraya-application-item-${item.id}`}>
                      <span className="font-display block font-bold">{TYPE_LABEL[item.type] || item.type}</span>
                      <span className="block text-xs" style={{ color: 'var(--muted-fg)' }}>
                        {formatDate(item.created_at)} · {STATUS_LABEL[item.status] || item.status}
                      </span>
                      {item.note ? (
                        <span className="mt-1 block text-xs" style={{ color: 'var(--muted-fg)' }}>
                          Catatan pengurus: {item.note}
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
