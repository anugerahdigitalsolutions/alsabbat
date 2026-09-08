import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const ENDPOINT = '/merchandise/catalog/variants';
const STATUS = ['ACTIVE', 'DRAFT', 'ARCHIVED'];

const formatIDR = (value) => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

const toRow = (variant) => ({
  id: variant.id,
  name: variant.name ?? '',
  sku: variant.sku ?? '',
  price_override: variant.price_override ?? '',
  stock_quantity: variant.stock_quantity ?? 0,
  weight_grams: variant.weight_grams ?? '',
  status: variant.status || 'ACTIVE',
  display_order: variant.display_order ?? 0,
});

const numberOrNull = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
};

/**
 * Editor Varian Produk di dalam form Create/Edit Produk.
 *
 * Memakai endpoint CRUD varian EXISTING (`/api/merchandise/catalog/variants`)
 * dan koleksi `product_variants` yang sudah ada — tidak ada endpoint,
 * collection, atau sumber data varian baru. Harga/stok/SKU/berat per varian
 * disimpan di backend sehingga Website, Mobile, Cart, Checkout, dan Order
 * otomatis memakai nilai yang sama.
 */
export const ProductVariantsEditor = ({ productId, productName, basePrice = 0, canWrite = true }) => {
  const [rows, setRows] = useState([]);
  const [original, setOriginal] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(ENDPOINT, { params: { product_id: productId, limit: 100 } });
      const items = (data?.items || []).map(toRow);
      setRows(items);
      setOriginal(Object.fromEntries(items.map((item) => [item.id, JSON.stringify(item)])));
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal memuat varian produk.'));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const setCell = (index, key) => (value) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  const addRow = () =>
    setRows((current) => [
      ...current,
      {
        id: null,
        name: '',
        sku: '',
        price_override: '',
        stock_quantity: 0,
        weight_grams: '',
        status: 'ACTIVE',
        display_order: current.length,
      },
    ]);

  const removeRow = async (index) => {
    const row = rows[index];
    if (!row.id) {
      setRows((current) => current.filter((_, i) => i !== index));
      return;
    }
    if (!window.confirm(`Hapus varian "${row.name}"? Produk utama tetap ada.`)) return;
    try {
      await api.delete(`${ENDPOINT}/${row.id}`);
      toast.success('Varian dihapus.');
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Varian gagal dihapus.'));
    }
  };

  const validate = () => {
    const names = new Set();
    for (const [index, row] of rows.entries()) {
      const label = `Baris ${index + 1}`;
      if (!String(row.name || '').trim()) return `${label}: nama/label varian wajib diisi.`;
      const key = String(row.name).trim().toLowerCase();
      if (names.has(key)) return `${label}: nama varian "${row.name}" duplikat pada produk ini.`;
      names.add(key);
      const price = numberOrNull(row.price_override);
      if (row.price_override !== '' && (price === null || price < 0)) {
        return `${label}: harga varian tidak valid.`;
      }
      const stock = numberOrNull(row.stock_quantity);
      if (stock === null || stock < 0) return `${label}: stok tidak boleh kosong atau negatif.`;
      const weight = numberOrNull(row.weight_grams);
      if (row.weight_grams !== '' && (weight === null || weight < 0)) {
        return `${label}: berat varian tidak valid.`;
      }
    }
    return null;
  };

  const saveAll = async () => {
    const invalid = validate();
    if (invalid) {
      setError(invalid);
      toast.error(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    let created = 0;
    let updated = 0;
    try {
      for (const [index, row] of rows.entries()) {
        const payload = {
          name: String(row.name).trim(),
          sku: String(row.sku || '').trim() || null,
          price_override: numberOrNull(row.price_override),
          stock_quantity: numberOrNull(row.stock_quantity) ?? 0,
          weight_grams: numberOrNull(row.weight_grams),
          status: row.status || 'ACTIVE',
          display_order: numberOrNull(row.display_order) ?? index,
        };
        if (!row.id) {
          await api.post(ENDPOINT, { ...payload, product_id: productId });
          created += 1;
        } else if (original[row.id] !== JSON.stringify(row)) {
          await api.patch(`${ENDPOINT}/${row.id}`, payload);
          updated += 1;
        }
      }
      if (created || updated) {
        toast.success(`Varian disimpan (${created} baru, ${updated} diperbarui).`);
      } else {
        toast.info('Tidak ada perubahan varian.');
      }
      load();
    } catch (e) {
      setError(apiErrorMessage(e, 'Varian gagal disimpan.'));
      toast.error(apiErrorMessage(e, 'Varian gagal disimpan.'));
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    if (!rows.length) return null;
    const prices = rows.map((row) => numberOrNull(row.price_override) ?? Number(basePrice || 0));
    const stock = rows.reduce((sum, row) => sum + (numberOrNull(row.stock_quantity) ?? 0), 0);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, stock };
  }, [rows, basePrice]);

  return (
    <section className="rounded-[var(--radius-md)] border p-4" data-testid="admin-product-variants-editor">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
            Varian Produk
          </Label>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
            Opsional. Kosongkan bila produk tidak punya pilihan (mis. Topi) — harga & stok produk
            yang dipakai. Harga varian kosong = memakai harga produk ({formatIDR(basePrice)}).
          </p>
        </div>
        {productId ? (
          <Button type="button" variant="outline" size="sm" onClick={load} disabled={loading} data-testid="admin-product-variants-reload">
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Muat ulang
          </Button>
        ) : null}
      </div>

      {!productId ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="admin-product-variants-need-save">
          Simpan produk terlebih dahulu, lalu buka Edit produk untuk menambahkan varian
          (ukuran/warna) beserta harga dan stok masing-masing.
        </p>
      ) : (
        <>
          {error ? (
            <p className="mt-3 text-sm" style={{ color: '#991B1B' }} data-testid="admin-product-variants-error">
              {error}
            </p>
          ) : null}

          <div className="mt-3 space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.id || `draft-${index}`}
                className="grid grid-cols-2 gap-2 rounded-[var(--radius-sm)] border p-3 sm:grid-cols-7"
                data-testid={`admin-product-variant-row-${index}`}
              >
                <div className="col-span-2 sm:col-span-1">
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                    Varian *
                  </Label>
                  <Input
                    value={row.name}
                    onChange={(event) => setCell(index, 'name')(event.target.value)}
                    placeholder="S / M / L / XL"
                    maxLength={80}
                    disabled={!canWrite}
                    data-testid={`admin-product-variant-name-${index}`}
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                    Harga (Rp)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.price_override}
                    onChange={(event) => setCell(index, 'price_override')(event.target.value)}
                    placeholder={String(basePrice || 0)}
                    disabled={!canWrite}
                    data-testid={`admin-product-variant-price-${index}`}
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                    Stok *
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.stock_quantity}
                    onChange={(event) => setCell(index, 'stock_quantity')(event.target.value)}
                    disabled={!canWrite}
                    data-testid={`admin-product-variant-stock-${index}`}
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                    SKU
                  </Label>
                  <Input
                    value={row.sku}
                    onChange={(event) => setCell(index, 'sku')(event.target.value)}
                    maxLength={60}
                    disabled={!canWrite}
                    data-testid={`admin-product-variant-sku-${index}`}
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                    Berat (g)
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={row.weight_grams}
                    onChange={(event) => setCell(index, 'weight_grams')(event.target.value)}
                    disabled={!canWrite}
                    data-testid={`admin-product-variant-weight-${index}`}
                  />
                </div>
                <div className="sm:col-span-1">
                  <Label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                    Status
                  </Label>
                  <Select
                    value={row.status}
                    onValueChange={(value) => setCell(index, 'status')(value)}
                    disabled={!canWrite}
                  >
                    <SelectTrigger data-testid={`admin-product-variant-status-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end sm:col-span-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => removeRow(index)}
                    disabled={!canWrite || saving}
                    aria-label={`Hapus varian ${row.name || index + 1}`}
                    data-testid={`admin-product-variant-delete-${index}`}
                  >
                    <Trash2 className="h-4 w-4" style={{ color: '#991B1B' }} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {!rows.length && !loading ? (
            <p className="mt-3 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="admin-product-variants-empty">
              Belum ada varian untuk {productName || 'produk ini'}.
            </p>
          ) : null}

          {summary ? (
            <p className="mt-3 text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="admin-product-variants-summary">
              {summary.min === summary.max
                ? `Semua varian ${formatIDR(summary.min)}`
                : `Rentang harga ${formatIDR(summary.min)} – ${formatIDR(summary.max)}`}
              {` · total stok varian ${summary.stock}`}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={!canWrite || saving} data-testid="admin-product-variant-add">
              <Plus className="mr-2 h-4 w-4" /> Tambah Varian
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={saveAll}
              disabled={!canWrite || saving || !rows.length}
              className="als-press font-semibold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              data-testid="admin-product-variant-save"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan Varian
            </Button>
          </div>
        </>
      )}
    </section>
  );
};

export default ProductVariantsEditor;
