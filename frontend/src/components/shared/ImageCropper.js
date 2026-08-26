import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const NUDGE = 24;
const MAX_OUTPUT_WIDTH = 1920;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * UniversalImageCropper — satu editor crop untuk SEMUA jenis gambar.
 * Frame preview memakai aspect ratio komponen publik masing-masing (lihat lib/mediaHints).
 * Menghasilkan berkas baru; berkas asli di Media Library tidak diubah.
 */
export const ImageCropper = ({
  open,
  onOpenChange,
  source,
  aspect = 1,
  spec,
  label = 'Sesuaikan Gambar',
  onConfirm,
  busy = false,
}) => {
  const frameRef = useRef(null);
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const pointersRef = useRef(new Map());
  const pinchRef = useRef(null);

  const [objectUrl, setObjectUrl] = useState(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [frame, setFrame] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const src = useMemo(() => {
    if (!source) return null;
    return typeof source === 'string' ? source : objectUrl;
  }, [source, objectUrl]);

  useEffect(() => {
    if (source && typeof source !== 'string') {
      const url = URL.createObjectURL(source);
      setObjectUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setObjectUrl(null);
    return undefined;
  }, [source]);

  useEffect(() => {
    if (!open) return;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [open, src]);

  const measure = useCallback(() => {
    const node = frameRef.current;
    if (!node) return;
    const width = node.clientWidth;
    setFrame({ w: width, h: Math.round(width / aspect) });
  }, [aspect]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(measure, 60);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [open, measure]);

  const baseScale = natural.w && frame.w ? Math.max(frame.w / natural.w, frame.h / natural.h) : 1;
  const displayW = natural.w * baseScale * zoom;
  const displayH = natural.h * baseScale * zoom;
  const maxX = Math.max(0, (displayW - frame.w) / 2);
  const maxY = Math.max(0, (displayH - frame.h) / 2);

  const setClampedOffset = useCallback(
    (next) => setOffset({ x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) }),
    [maxX, maxY]
  );

  useEffect(() => {
    setOffset((prev) => ({ x: clamp(prev.x, -maxX, maxX), y: clamp(prev.y, -maxY, maxY) }));
  }, [maxX, maxY]);

  const onPointerDown = (event) => {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      pinchRef.current = { distance: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      dragRef.current = null;
    } else {
      dragRef.current = { x: event.clientX, y: event.clientY, offset };
    }
  };

  const onPointerMove = (event) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointersRef.current.size === 2 && pinchRef.current) {
      const [a, b] = [...pointersRef.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const ratio = distance / (pinchRef.current.distance || 1);
      setZoom(clamp(pinchRef.current.zoom * ratio, MIN_ZOOM, MAX_ZOOM));
      return;
    }
    if (!dragRef.current) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    setClampedOffset({ x: dragRef.current.offset.x + dx, y: dragRef.current.offset.y + dy });
  };

  const onPointerUp = (event) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (pointersRef.current.size === 0) dragRef.current = null;
  };

  const reset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const confirm = async () => {
    const image = imgRef.current;
    if (!image || !natural.w) return;
    const scale = baseScale * zoom;
    const left = (frame.w - displayW) / 2 + offset.x;
    const top = (frame.h - displayH) / 2 + offset.y;
    const sx = clamp(-left / scale, 0, natural.w);
    const sy = clamp(-top / scale, 0, natural.h);
    const sw = Math.min(frame.w / scale, natural.w - sx);
    const sh = Math.min(frame.h / scale, natural.h - sy);

    const outW = Math.min(MAX_OUTPUT_WIDTH, Math.max(320, Math.round(sw)));
    const outH = Math.max(1, Math.round(outW / aspect));
    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outW, outH);

    const type = typeof source !== 'string' && source?.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.92));
    if (blob) await onConfirm(blob, { zoom, offset, aspect, type });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto bg-white" data-testid="image-cropper-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">{label}</DialogTitle>
          <DialogDescription>
            Geser (drag) untuk memilih bagian foto, gunakan zoom bila perlu. Frame di bawah ini sama dengan frame di
            website{spec ? ` (${spec.ratio} · ${spec.size})` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={frameRef}
          className="relative w-full touch-none overflow-hidden rounded-[var(--radius-sm)] bg-black"
          style={{ height: frame.h || undefined, aspectRatio: frame.h ? undefined : String(aspect), cursor: 'grab' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          data-testid="image-cropper-frame"
        >
          {src ? (
            <img
              ref={imgRef}
              src={src}
              alt=""
              onLoad={(e) => {
                setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight });
                measure();
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: displayW || undefined,
                height: displayH || undefined,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
              data-testid="image-cropper-image"
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0" style={{ boxShadow: 'inset 0 0 0 1px rgba(252,207,43,0.5)' }} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => clamp(z + 0.2, MIN_ZOOM, MAX_ZOOM))} data-testid="image-cropper-zoom-in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => clamp(z - 0.2, MIN_ZOOM, MAX_ZOOM))} data-testid="image-cropper-zoom-out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setClampedOffset({ x: offset.x + NUDGE, y: offset.y })} aria-label="Geser kanan" data-testid="image-cropper-right">
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setClampedOffset({ x: offset.x - NUDGE, y: offset.y })} aria-label="Geser kiri" data-testid="image-cropper-left">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setClampedOffset({ x: offset.x, y: offset.y + NUDGE })} aria-label="Geser bawah" data-testid="image-cropper-down">
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setClampedOffset({ x: offset.x, y: offset.y - NUDGE })} aria-label="Geser atas" data-testid="image-cropper-up">
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={reset} data-testid="image-cropper-reset">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <span className="text-xs tabular-nums" style={{ color: 'var(--muted-fg)' }} data-testid="image-cropper-zoom-value">
            Zoom {zoom.toFixed(1)}×
          </span>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="image-cropper-cancel">
            Batal
          </Button>
          <Button
            type="button"
            onClick={confirm}
            disabled={busy || !natural.w}
            className="font-semibold"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            data-testid="image-cropper-save"
          >
            {busy ? 'Menyimpan…' : 'Simpan Crop'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropper;
