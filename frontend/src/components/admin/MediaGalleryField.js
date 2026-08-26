import React from 'react';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { MediaPicker } from '../shared/MediaPicker';
import { Button } from '../ui/button';

/**
 * Galeri foto orang (pemain/staf) — maksimal `max` foto, memakai Universal Media Upload.
 * Urutan array = urutan slider publik (satu sumber sorting).
 */
export const MediaGalleryField = ({ value, onChange, max = 3, spec, testId, label = 'Galeri Foto' }) => {
  const items = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  const full = items.length >= max;

  const replaceAt = (index, next) => {
    const list = [...items];
    if (!next) list.splice(index, 1);
    else list[index] = next;
    onChange(list.slice(0, max));
  };

  const move = (index, direction) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const list = [...items];
    [list[index], list[target]] = [list[target], list[index]];
    onChange(list);
  };

  return (
    <div className="space-y-4" data-testid={`${testId}-gallery`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold" data-testid={`${testId}-gallery-count`}>
          {label} — {items.length}/{max}
        </p>
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
          {full ? `Maksimal ${max} foto.` : `${items.length} dari ${max} foto digunakan. Urutan di bawah = urutan slider publik.`}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="rounded-[var(--radius-sm)] border p-3"
            style={{ borderColor: 'rgba(1,40,145,0.18)' }}
            data-testid={`${testId}-gallery-item-${index}`}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: 'var(--club-secondary)' }}>
                Foto {index + 1}
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
                  aria-label={`Pindahkan foto ${index + 1} ke kiri`}
                  data-testid={`${testId}-gallery-move-left-${index}`}
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2"
                  disabled={index === items.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={`Pindahkan foto ${index + 1} ke kanan`}
                  data-testid={`${testId}-gallery-move-right-${index}`}
                >
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </span>
            </div>
            <MediaPicker
              value={item}
              onChange={(next) => replaceAt(index, next)}
              testId={`${testId}-gallery-${index}`}
              spec={spec}
            />
          </div>
        ))}

        {!full ? (
          <div
            className="rounded-[var(--radius-sm)] border border-dashed p-3"
            style={{ borderColor: 'rgba(252,207,43,0.6)' }}
            data-testid={`${testId}-gallery-add`}
          >
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em]">
              <Plus className="h-3.5 w-3.5" />
              Tambah Foto {items.length + 1}
            </p>
            <MediaPicker
              value=""
              onChange={(next) => {
                if (next) onChange([...items, next].slice(0, max));
              }}
              testId={`${testId}-gallery-new`}
              spec={spec}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default MediaGalleryField;
