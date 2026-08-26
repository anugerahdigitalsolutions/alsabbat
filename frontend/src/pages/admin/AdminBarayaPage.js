import React, { useCallback, useEffect, useState } from 'react';
import { CreditCard, Power, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { MemberCard } from '../../components/member/MemberCard';
import { MemberCardDesign } from '../../components/admin/MemberCardDesign';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

/** Admin console for Baraya ALSABBAT customer accounts (read + activate/deactivate only). */
export default function AdminBarayaPage() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [stats, setStats] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/baraya/admin/list', {
        params: { limit: 100, ...(query ? { q: query } : {}) },
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal memuat daftar Baraya.'));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(load, 300);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    api
      .get('/baraya/admin/stats')
      .then(({ data }) => setStats(data))
      .catch(() => setStats(null));
  }, []);

  const toggleStatus = async (customer) => {
    const next = customer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await api.patch(`/baraya/admin/${customer.id}/status`, { status: next });
      toast.success(`Akun ${customer.email} kini ${next === 'ACTIVE' ? 'aktif' : 'nonaktif'}.`);
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memperbarui status akun.'));
    }
  };

  const openCard = async (customer) => {
    try {
      const { data } = await api.get(`/baraya/admin/${customer.id}/member-card`);
      setPreviewCard(data);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat kartu member.'));
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-baraya-page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Baraya ALSABBAT</h1>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            {total} akun pelanggan terdaftar. Password tidak pernah dapat dilihat.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--muted-fg)' }} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama atau email…"
            className="h-11 pl-9"
            data-testid="admin-baraya-search"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-testid="admin-baraya-stats">
        {[
          { id: 'total', label: 'Total Baraya', value: stats?.total },
          { id: 'active', label: 'Aktif', value: stats?.active },
          { id: 'inactive', label: 'Nonaktif', value: stats?.inactive },
          { id: 'new', label: 'Baru Bulan Ini', value: stats?.new_this_month },
        ].map((stat) => (
          <div key={stat.id} className="als-card p-5" data-testid={`admin-baraya-stat-${stat.id}`}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
              {stat.label}
            </p>
            <p className="font-display mt-2 text-2xl font-extrabold tabular-nums">{stat.value ?? 0}</p>
          </div>
        ))}
      </div>

      <MemberCardDesign />

      {loading ? (
        <LoadingState variant="table" rows={4} testId="admin-baraya-loading" />
      ) : error ? (
        <ErrorState message={error} onRetry={load} testId="admin-baraya-error" />
      ) : items.length === 0 ? (
        <EmptyState icon={Users} title="Belum ada akun Baraya" description="Akun pelanggan akan tampil di sini setelah pendaftaran." testId="admin-baraya-empty" />
      ) : (
        <div className="als-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-2)' }}>
                {['No. Member', 'Nama', 'Email', 'WhatsApp', 'Status', 'Daftar', 'Login Terakhir', 'Aksi'].map((head) => (
                  <th key={head} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((customer) => (
                <tr key={customer.id} className="border-t" style={{ borderColor: 'var(--border-soft)' }} data-testid={`admin-baraya-row-${customer.id}`}>
                  <td className="px-4 py-3 font-mono text-xs font-bold" data-testid={`admin-baraya-member-number-${customer.id}`}>
                    {customer.member_number || '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    <span className="flex items-center gap-2">
                      {customer.photo_url ? (
                        <img src={customer.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : null}
                      {customer.full_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">{customer.email}</td>
                  <td className="px-4 py-3">{customer.phone}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" style={{ backgroundColor: customer.status === 'ACTIVE' ? 'rgba(22,163,74,0.12)' : 'rgba(0,0,0,0.06)' }}>
                      {customer.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">{formatDate(customer.created_at)}</td>
                  <td className="px-4 py-3">{formatDate(customer.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <span className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCard(customer)}
                        data-testid={`admin-baraya-card-${customer.id}`}
                      >
                        <CreditCard className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        Kartu
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(customer)}
                        data-testid={`admin-baraya-toggle-${customer.id}`}
                      >
                        <Power className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        {customer.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'}
                      </Button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!previewCard} onOpenChange={(open) => !open && setPreviewCard(null)}>
        <DialogContent className="max-w-xl bg-white" data-testid="admin-baraya-card-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Pratinjau Kartu Member</DialogTitle>
            <DialogDescription>
              Renderer sama dengan kartu milik Baraya. Tidak menampilkan kata sandi maupun token.
            </DialogDescription>
          </DialogHeader>
          {previewCard ? <MemberCard card={previewCard} testId="admin-member-card" /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
