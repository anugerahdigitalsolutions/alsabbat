import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

/**
 * Full-screen media viewer for the mobile gallery.
 * `items` are the real media objects returned by the gallery API.
 */
export const BrzLightbox = ({ items = [], index = 0, onClose, onIndexChange }) => {
  const [current, setCurrent] = useState(index);

  useEffect(() => setCurrent(index), [index]);

  const move = useCallback(
    (delta) => {
      setCurrent((value) => {
        const next = Math.min(Math.max(value + delta, 0), items.length - 1);
        onIndexChange?.(next);
        return next;
      });
    },
    [items.length, onIndexChange]
  );

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
      if (event.key === 'ArrowRight') move(1);
      if (event.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, onClose]);

  const item = items[current];
  if (!item) return null;

  const src = item.url || item.thumbnail_url;
  const isVideo = item.file_type === 'VIDEO';

  return (
    <div className="brz-lightbox" role="dialog" aria-modal="true" data-testid="brz-lightbox">
      <button type="button" className="brz-icon-btn absolute right-4 top-4 z-10" onClick={onClose} aria-label="Tutup">
        <X size={19} aria-hidden="true" />
      </button>

      <div className="flex flex-1 items-center justify-center px-3">
        {isVideo ? (
          <video src={src} controls className="max-h-[74vh] w-full rounded-[var(--brz-r-md)]" />
        ) : (
          <img
            src={src}
            alt={item.alt_text || item.caption || item.file_name || 'Media'}
            className="max-h-[74vh] w-full rounded-[var(--brz-r-md)] object-contain"
          />
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-4 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-3">
        <button
          type="button"
          className="brz-icon-btn"
          onClick={() => move(-1)}
          disabled={current === 0}
          aria-label="Sebelumnya"
          style={{ opacity: current === 0 ? 0.4 : 1 }}
        >
          <ChevronLeft size={19} aria-hidden="true" />
        </button>
        <span className="brz-clamp-1 flex-1 text-center text-[12px]" style={{ color: 'var(--brz-text-muted)' }}>
          {item.caption || item.alt_text || `${current + 1} / ${items.length}`}
        </span>
        <button
          type="button"
          className="brz-icon-btn"
          onClick={() => move(1)}
          disabled={current === items.length - 1}
          aria-label="Berikutnya"
          style={{ opacity: current === items.length - 1 ? 0.4 : 1 }}
        >
          <ChevronRight size={19} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default BrzLightbox;
