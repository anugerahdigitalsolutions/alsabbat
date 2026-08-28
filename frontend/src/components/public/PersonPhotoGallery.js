import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Shirt, X } from 'lucide-react';
import { resolveMediaUrl } from './gallery/mediaUtils';

/**
 * Galeri foto orang (pemain & staf) — satu renderer untuk kedua halaman detail.
 * 1 foto: tampil tanpa arrow/dot. 2–3 foto: crossfade + arrow + dot + swipe + keyboard.
 */
export const PersonPhotoGallery = ({
  photos = [],
  alt = '',
  testId = 'person-gallery',
  className = '',
  fallbackIcon: FallbackIcon = Shirt,
  enableLightbox = true,
}) => {
  const list = (Array.isArray(photos) ? photos : [photos]).filter(Boolean);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const touchStartRef = useRef(null);

  const total = list.length;
  const go = useCallback(
    (next) => {
      if (!total) return;
      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  useEffect(() => {
    setIndex(0);
  }, [total]);

  useEffect(() => {
    if (!lightbox) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setLightbox(false);
      if (event.key === 'ArrowRight') go(index + 1);
      if (event.key === 'ArrowLeft') go(index - 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox, index, go]);

  const onTouchStart = (event) => {
    touchStartRef.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event) => {
    if (touchStartRef.current === null) return;
    const delta = (event.changedTouches[0]?.clientX ?? 0) - touchStartRef.current;
    touchStartRef.current = null;
    if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1));
  };

  if (!total) {
    return (
      <div className={`relative overflow-hidden ${className}`} data-testid={`${testId}-empty`}>
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <FallbackIcon className="h-16 w-16" style={{ color: 'rgba(252,207,43,0.5)' }} />
        </span>
      </div>
    );
  }

  const Frame = (
    <div
      className={`relative overflow-hidden ${className}`}
      role={total > 1 ? 'group' : undefined}
      aria-label={total > 1 ? `Galeri foto ${alt}` : undefined}
      tabIndex={total > 1 ? 0 : undefined}
      onKeyDown={(event) => {
        if (total < 2) return;
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          go(index + 1);
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          go(index - 1);
        }
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid={testId}
    >
      {list.map((photo, i) => (
        <img
          key={`${photo}-${i}`}
          src={resolveMediaUrl(photo)}
          alt={i === index ? alt : ''}
          className="absolute inset-0 h-full w-full object-cover object-top"
          style={{
            opacity: i === index ? 1 : 0,
            transform: i === index ? 'scale(1)' : 'scale(1.03)',
            pointerEvents: i === index ? 'auto' : 'none',
            transition: 'opacity 340ms cubic-bezier(0.22,1,0.36,1), transform 340ms cubic-bezier(0.22,1,0.36,1)',
            cursor: enableLightbox ? 'zoom-in' : undefined,
          }}
          loading={i === 0 ? 'eager' : 'lazy'}
          onClick={() => enableLightbox && setLightbox(true)}
          data-testid={`${testId}-photo-${i}`}
        />
      ))}

      {total > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur transition-colors duration-200"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#FCCF2B', border: '1px solid rgba(252,207,43,0.45)' }}
            aria-label="Foto sebelumnya"
            data-testid={`${testId}-prev`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full backdrop-blur transition-colors duration-200"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', color: '#FCCF2B', border: '1px solid rgba(252,207,43,0.45)' }}
            aria-label="Foto berikutnya"
            data-testid={`${testId}-next`}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-1.5"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            data-testid={`${testId}-dots`}
          >
            {list.map((photo, i) => (
              <button
                key={`dot-${photo}-${i}`}
                type="button"
                onClick={() => go(i)}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: i === index ? 18 : 8,
                  backgroundColor: i === index ? '#FCCF2B' : 'rgba(254,254,254,0.5)',
                }}
                aria-label={`Foto ${i + 1} dari ${total}`}
                aria-current={i === index ? 'true' : undefined}
                data-testid={`${testId}-dot-${i}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <>
      {Frame}
      {lightbox ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.92)' }}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ${alt}`}
          onClick={() => setLightbox(false)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          data-testid={`${testId}-lightbox`}
        >
          <img
            src={resolveMediaUrl(list[index])}
            alt={alt}
            className="max-h-[86vh] max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
            data-testid={`${testId}-lightbox-photo`}
          />
          <button
            type="button"
            onClick={() => setLightbox(false)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(254,254,254,0.12)', color: '#FCCF2B' }}
            aria-label="Tutup foto"
            data-testid={`${testId}-lightbox-close`}
          >
            <X className="h-5 w-5" />
          </button>
          {total > 1 ? (
            <>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  go(index - 1);
                }}
                className="absolute left-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(254,254,254,0.12)', color: '#FCCF2B' }}
                aria-label="Foto sebelumnya"
                data-testid={`${testId}-lightbox-prev`}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  go(index + 1);
                }}
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(254,254,254,0.12)', color: '#FCCF2B' }}
                aria-label="Foto berikutnya"
                data-testid={`${testId}-lightbox-next`}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

export default PersonPhotoGallery;
