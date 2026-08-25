import React, { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { resolveMediaUrl } from './mediaUtils';

/**
 * Lightweight photo lightbox (no extra dependency).
 * Keyboard: Escape closes, ArrowLeft / ArrowRight navigate.
 */
export const MediaLightbox = ({ items = [], index = 0, onClose, onPrev, onNext }) => {
  const item = items[index];

  const handleKey = useCallback(
    (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onPrev();
      if (event.key === 'ArrowRight') onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [handleKey]);

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 200, backgroundColor: 'rgba(34,34,34,0.92)', backdropFilter: 'blur(14px)' }}
      role="dialog"
      aria-modal="true"
      aria-label={item.alt_text || item.file_name}
      data-testid="gallery-lightbox"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2"
        style={{ backgroundColor: 'rgba(254,254,254,0.12)', color: 'var(--club-light)' }}
        data-testid="gallery-lightbox-close"
      >
        <X className="h-5 w-5" />
      </button>

      {items.length > 1 ? (
        <button
          type="button"
          onClick={onPrev}
          aria-label="Sebelumnya"
          className="absolute left-3 inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 sm:left-6"
          style={{ backgroundColor: 'rgba(254,254,254,0.12)', color: 'var(--club-light)' }}
          data-testid="gallery-lightbox-prev"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      ) : null}

      <figure className="als-reveal max-h-full max-w-5xl">
        <img
          src={resolveMediaUrl(item.url)}
          alt={item.alt_text || item.file_name}
          className="mx-auto max-h-[76vh] w-auto rounded-[var(--radius-md)] object-contain"
        />
        <figcaption className="mt-4 text-center text-sm" style={{ color: 'rgba(254,254,254,0.82)' }}>
          {item.caption || item.alt_text || item.file_name}
          <span className="ml-2 text-xs" style={{ color: 'rgba(254,254,254,0.5)' }}>
            {index + 1} / {items.length}
          </span>
        </figcaption>
      </figure>

      {items.length > 1 ? (
        <button
          type="button"
          onClick={onNext}
          aria-label="Berikutnya"
          className="absolute right-3 inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 sm:right-6"
          style={{ backgroundColor: 'rgba(254,254,254,0.12)', color: 'var(--club-light)' }}
          data-testid="gallery-lightbox-next"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      ) : null}
    </div>
  );
};

export default MediaLightbox;
