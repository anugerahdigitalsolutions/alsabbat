import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, Eye, Loader2, MapPin, RefreshCw, Save, Trash2, Truck } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

const GROUP_ICONS = {
  MIDTRANS: CreditCard,
  RAJAONGKIR: Truck,
  SHIPPING_ORIGIN: MapPin,
};

const StatusPill = ({ configured, source }) => (
  <span
    className="font-display shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider"
    style={
      configured
        ? { backgroundColor: 'rgba(22,163,74,0.16)', color: '#166534' }
        : { backgroundColor: 'rgba(220,38,38,0.12)', color: '#991B1B' }
    }
  >
    {configured ? `Terkonfigurasi${source === 'ENV' ? ' (ENV)' : ''}` : 'Belum dikonfigurasi'}
  </span>
);

/**
 * Merchandise Fase 1 — konfigurasi integrasi commerce (Midtrans, RajaOngkir,
 * alamat asal pengiriman).
 *
 * Rahasia bersifat write-only: backend hanya mengembalikan status + nilai
 * ter-mask, jadi input rahasia selalu kosong dan hanya dikirim bila admin
 * benar-benar mengisinya. Tidak ada pemanggilan API Midtrans/RajaOngkir di sini.
 */
export const CommerceIntegrationPanel = () => {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(null);

  const applyPayload = useCallback((payload) => {
    const list = payload?.items || [];
    setItems(list);
    setGroups(payload?.groups || []);
    const next = {};
    list.forEach((item) => {
      // Rahasia: selalu mulai kosong (plaintext tidak pernah dikirim ke browser).
      next[item.key] = item.secret ? '' : item.value ?? '';
    });
    setDrafts(next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/settings/integrations');
      applyPayload(data);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat integration settings.'));
    } finally {
      setLoading(false);
    }
  }, [applyPayload]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = {};
    items.forEach((item) => {
      map[item.group] = map[item.group] || [];
      map[item.group].push(item);
    });
    return map;
  }, [items]);

  const setDraft = (key, value) => setDrafts((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    const values = {};
    items.forEach((item) => {
      const draft = drafts[item.key];
      if (item.secret) {
        // Kosong = tidak diubah (gunakan tombol hapus untuk mengosongkan).
        if (String(draft || '').trim()) values[item.key] = String(draft).trim();
        return;
      }
      values[item.key] = String(draft ?? '').trim();
    });
    if (!Object.keys(values).length) {
      toast.error('Tidak ada perubahan untuk disimpan.');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.put('/settings/integrations', { values });
      applyPayload(data);
      toast.success('Integration settings tersimpan.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan integration settings.'));
    } finally {
      setSaving(false);
    }
  };

  const clearSecret = async (item) => {
    if (!window.confirm(`Hapus ${item.label}? Sistem akan kembali memakai environment variable bila ada.`)) return;
    setClearing(item.key);
    try {
      const { data } = await api.put('/settings/integrations', { values: { [item.key]: '' } });
      applyPayload(data);
      toast.success(`${item.label} dihapus.`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menghapus setting.'));
    } finally {
      setClearing(null);
    }
  };

  const renderField = (item) => {
    const testId = `commerce-setting-${item.key}`;

    if (item.type === 'BOOL') {
      const enabled = String(drafts[item.key] ?? '').toLowerCase() === 'true';
      return (
        <div className="rounded-[var(--radius-sm)] p-4" style={{ backgroundColor: 'var(--surface-2)' }} data-testid={testId}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{item.label}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
                Mode aktif:{' '}
                <span className="font-display font-bold" style={{ color: enabled ? '#991B1B' : 'var(--club-secondary)' }}>
                  {enabled ? 'PRODUCTION' : 'SANDBOX'}
                </span>
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={(next) => setDraft(item.key, next ? 'true' : 'false')}
              data-testid={`${testId}-switch`}
            />
          </div>
          {item.help ? (
            <p className="mt-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
              {item.help}
            </p>
          ) : null}
        </div>
      );
    }

    return (
      <div className="rounded-[var(--radius-sm)] p-4" style={{ backgroundColor: 'var(--surface-2)' }} data-testid={testId}>
        <div className="flex items-start justify-between gap-3">
          <Label className="font-semibold" htmlFor={testId}>
            {item.label}
          </Label>
          <StatusPill configured={item.configured} source={item.source} />
        </div>

        {item.secret && item.masked_value ? (
          <p className="mt-2 flex items-center gap-2 break-all font-mono text-xs" style={{ color: 'var(--muted-fg)' }} data-testid={`${testId}-masked`}>
            <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {item.masked_value}
          </p>
        ) : null}

        <div className="mt-2 flex items-center gap-2">
          <Input
            id={testId}
            className="bg-white"
            type={item.secret ? 'password' : 'text'}
            autoComplete="off"
            inputMode={['LAT', 'LONG', 'INT'].includes(item.type) ? 'decimal' : undefined}
            value={drafts[item.key] ?? ''}
            placeholder={item.secret ? (item.configured ? 'Biarkan kosong bila tidak diubah' : 'Belum dikonfigurasi') : ''}
            onChange={(e) => setDraft(item.key, e.target.value)}
            data-testid={`${testId}-input`}
          />
          {item.secret && item.source === 'ADMIN' ? (
            <Button
              variant="outline"
              size="icon"
              onClick={() => clearSecret(item)}
              disabled={clearing === item.key}
              aria-label={`Hapus ${item.label}`}
              data-testid={`${testId}-clear`}
            >
              {clearing === item.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          ) : null}
        </div>

        {item.help ? (
          <p className="mt-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
            {item.help}
          </p>
        ) : null}
        {item.updated_at ? (
          <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-fg)' }}>
            Diubah {String(item.updated_at).slice(0, 16).replace('T', ' ')}
            {item.updated_by ? ` oleh ${item.updated_by}` : ''}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="als-card space-y-5 p-5" data-testid="commerce-integration-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-base font-bold md:text-lg">Integrasi Merchandise</p>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            Kredensial disimpan di koleksi khusus dengan akses terbatas (permission <span className="font-mono">store:manage</span>)
            dan tidak pernah dibaca endpoint publik. Nilai rahasia tidak pernah dikirim balik ke browser —
            hanya status dan 4 karakter terakhir.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading || saving} data-testid="commerce-settings-reload">
            <RefreshCw className="mr-2 h-4 w-4" /> Muat ulang
          </Button>
          <Button onClick={save} disabled={loading || saving} data-testid="commerce-settings-save">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
          Memuat…
        </p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const list = grouped[group.key] || [];
            if (!list.length) return null;
            const Icon = GROUP_ICONS[group.key] || CreditCard;
            return (
              <div key={group.key} data-testid={`commerce-settings-group-${group.key}`}>
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <Icon className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
                  {group.label}
                </p>
                <div className="grid gap-3 lg:grid-cols-2">{list.map((item) => renderField(item))}</div>
              </div>
            );
          })}
          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
            Fase 1: konfigurasi saja. Belum ada panggilan API RajaOngkir/COD, dan perilaku pembayaran
            Midtrans tidak berubah — bila setting di sini kosong, environment variable server tetap dipakai.
          </p>
        </div>
      )}
    </div>
  );
};

export default CommerceIntegrationPanel;
