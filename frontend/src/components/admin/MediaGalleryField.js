import React from 'react';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { MediaPicker } from '../shared/MediaPicker';
import { Button } from '../ui/button';

/**
 * Galeri foto orang (pemain/staf) — TEPAT `max` slot tetap & independen.
 *
 * Perbaikan bug: sebelumnya komponen ini hanya merender slot sebanyak foto yang
 * sudah ada (+1 slot "tambah") dan memakai `splice`, sehingga satu aksi bisa
 * menggeser/menghapus foto slot lain. Sekarang setiap slot punya posisi sendiri:
 * mengubah/menghapus Slot 2 tidak pernah menyentuh Slot 1 atau Slot 3.
 *
 * Catatan penyimpanan: API existing (`normalise_gallery`) menyimpan hanya foto
 * nyata, berurutan, tanpa duplikat — jadi tidak ada media ganda hanya karena
 * ditampilkan di beberapa slot. Duplikat dicegah di UI dengan pesan yang jelas.
 */
export const MediaGalleryField = ({ value, onChange, max = 3, spec, testId, label = 'Galeri Foto' }) => {
  const stored = Array.isArray(value) ? value : value ? [value] : [];
  // Selalu render `max` slot tetap.
  const slots = Array.from({ length: max }, (_, i) => stored[i] || '');
  const used = slots.filter(Boolean).length;

  // Kirim apa adanya dengan POSISI slot dipertahankan (slot kosong = "").
  // Hanya kosong di ekor yang dipangkas, supaya data lama tetap identik.
  const commit = (list) => {
    const next = list.slice(0, max).map((s) => s || '');
    while (next.length && !next[next.length - 1]) next.pop();
    onChange(next);
  };

  const setSlot = (index, next) => {
    if (next && slots.some((s, i) => i !== index && s === next)) {
      toast.error('Foto itu sudah dipakai di slot lain. Pilih foto yang berbeda.');
      return;
    }
    const list = [...slots];
    list[index] = next || '';
    commit(list);
  };

  const clearSlot = (index) => {
    const list = [...slots];
    list[index] = '';
    commit(list);
  };

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= max) return;
    const list = [...slots];
    [list[index], list[target]] = [list[target], list[index]];
    commit(list);
  };

  return (
    <div className="space-y-4" data-testid={`${testId}-gallery`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold" data-testid={`${testId}-gallery-count`}>
          {label} — {used}/{max}
        </p>
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
          {max} slot terpisah. Foto pertama menjadi foto utama; urutan slot = urutan slider publik.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((item, index) => (
          <div
            key={`slot-${index}`}
            className="rounded-[var(--radius-sm)] border p-3"
            style={{ borderColor: item ? 'rgba(1,40,145,0.18)' : 'rgba(252,207,43,0.55)' }}
            data-testid={`${testId}-gallery-item-${index}`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span
                className="text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: 'var(--club-secondary)' }}
              >
                Slot {index + 1}
                {index === 0 ? ' · Utama' : ''}
              </span>
              <span className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={`Pindahkan foto slot ${index + 1} ke kiri`}
                  data-testid={`${testId}-gallery-move-left-${index}`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={index === max - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Pindahkan foto slot ${index + 1} ke kanan`}
                  data-testid={`${testId}-gallery-move-right-${index}`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={!item}
                  onClick={() => clearSlot(index)}
                  aria-label={`Hapus foto slot ${index + 1}`}
                  data-testid={`${testId}-gallery-clear-${index}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </span>
            </div>
            <MediaPicker
              value={item}
              onChange={(next) => setSlot(index, next)}
              testId={`${testId}-gallery-${index}`}
              spec={spec}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default MediaGalleryField;
