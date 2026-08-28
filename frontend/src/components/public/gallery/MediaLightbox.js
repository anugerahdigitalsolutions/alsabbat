import React, { useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Share2, X } from 'lucide-react';
import { downloadPhoto, sharePhoto } from './photoActions';

export const MediaLightbox = ({
  items = [],
  index = 0,
  onClose,
  onPrev,
  onNext,
  albumTitle = '',
  shareUrl = '',
}) => {
  const item = items[index];

  const handleKey = useCallback(
    (event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && items.length > 1) onPrev();
      if (event.key === 'ArrowRight' && items.length > 1) onNext();
    },
    [onClose, onPrev, onNext, items.length]
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

  const imageUrl = item.thumbnail_url || item.url;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={item.alt_text || item.file_name || 'Foto'}
      data-testid="gallery-lightbox"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.94)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        data-testid="gallery-lightbox-close"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 100001,
          width: '44px',
          height: '44px',
          border: 0,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.16)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={22} />
      </button>

      {items.length > 1 && (
        <button
          type="button"
          onClick={onPrev}
          aria-label="Sebelumnya"
          data-testid="gallery-lightbox-prev"
          style={{
            position: 'absolute',
            left: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 100001,
            width: '48px',
            height: '48px',
            border: 0,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.16)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {items.length > 1 && (
        <button
          type="button"
          onClick={onNext}
          aria-label="Berikutnya"
          data-testid="gallery-lightbox-next"
          style={{
            position: 'absolute',
            right: '20px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 100001,
            width: '48px',
            height: '48px',
            border: 0,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.16)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronRight size={28} />
        </button>
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 100000,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <img
          key={imageUrl}
          src={imageUrl}
          alt={item.alt_text || item.file_name || 'Foto'}
          loading="eager"
          decoding="async"
          onError={(event) => {
            console.error('LIGHTBOX IMAGE ERROR:', imageUrl);
            event.currentTarget.style.display = 'none';
          }}
          style={{
            display: 'block',
            maxWidth: '90vw',
            maxHeight: '75vh',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            borderRadius: '8px',
            opacity: 1,
            visibility: 'visible',
          }}
        />

        <div
          style={{
            marginTop: '16px',
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            fontSize: '14px',
            maxWidth: '80vw',
            pointerEvents: 'auto',
          }}
        >
          {item.caption || item.alt_text || item.file_name}
          <span style={{ marginLeft: '8px', opacity: 0.55 }}>
            {index + 1} / {items.length}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
            pointerEvents: 'auto',
          }}
        >
          <button
            type="button"
            onClick={() => downloadPhoto(item, { albumTitle, index })}
            data-testid="gallery-lightbox-download"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: 0,
              borderRadius: '999px',
              padding: '10px 18px',
              background: 'var(--club-primary)',
              color: '#000',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={16} />
            Download
          </button>

          <button
            type="button"
            onClick={() => sharePhoto(item, { albumTitle, url: shareUrl })}
            data-testid="gallery-lightbox-share"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: 0,
              borderRadius: '999px',
              padding: '10px 18px',
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default MediaLightbox;
