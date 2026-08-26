import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImageIcon, Loader2, Search, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { resolveMediaUrl } from '../public/gallery/mediaUtils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

const defaultUploader = async (file, onProgress) => {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post('/media/upload', form, {
    headers: { 'Content-Type': undefined },
    onUploadProgress: (event) => {
      if (event.total) onProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return data;
};

const LibraryDialog = ({ open, onOpenChange, onPick, testId }) => {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get('/media', { params: { limit: 60, ...(query ? { q: query } : {}) } })
      .then(({ data }) => setItems((data?.items || []).filter((item) => item.url)))
      .catch((e) => toast.error(apiErrorMessage(e, 'Gagal memuat Media Library')))
      .finally(() => setLoading(false));
  }, [open, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto bg-white" data-testid={`${testId}-library`}>
        <DialogHeader>
          <DialogTitle className="font-display">Media Library</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--muted-fg)' }} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama berkas…"
            className="pl-9"
            data-testid={`${testId}-library-search`}
          />
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : items.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item)}
                className="als-focus overflow-hidden rounded-[var(--radius-sm)] text-left transition-transform hover:scale-[1.02]"
                style={{ border: '1px solid var(--border-soft)' }}
                data-testid={`${testId}-library-item-${item.id}`}
              >
                {item.file_type === 'IMAGE' ? (
                  <img src={resolveMediaUrl(item.thumbnail_url || item.url)} alt="" className="h-24 w-full object-cover" loading="lazy" />
                ) : (
                  <span className="grid h-24 w-full place-items-center" style={{ backgroundColor: 'var(--surface-2)' }}>
                    <ImageIcon className="h-6 w-6" style={{ color: 'var(--muted-fg)' }} />
                  </span>
                )}
                <span className="block truncate px-2 py-1.5 text-[11px]">{item.file_name}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm" style={{ color: 'var(--muted-fg)' }} data-testid={`${testId}-library-empty`}>
            Media Library masih kosong. Unggah berkas pertama Anda.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

/**
 * Satu komponen media untuk seluruh aplikasi: upload dari perangkat (drag & drop / HP),
 * pilih ulang dari Media Library, ganti, dan hapus. Tidak ada uploader kedua.
 */
export const MediaPicker = ({
  value,
  onChange,
  previewUrl,
  testId = 'media',
  accept = 'image/*',
  uploader = defaultUploader,
  libraryEnabled = true,
  returns = 'url',
  hint,
}) => {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [localPreview, setLocalPreview] = useState(null);

  const preview = resolveMediaUrl(previewUrl || localPreview || (returns === 'url' ? value : null));

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      if (!file.type.startsWith('image/') && accept === 'image/*') {
        toast.error('Hanya berkas gambar (JPG, PNG, WEBP) yang diizinkan.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran berkas maksimal 10MB.');
        return;
      }
      setUploading(true);
      setProgress(0);
      try {
        const media = await uploader(file, setProgress);
        const next = returns === 'id' ? media.id : media.url;
        setLocalPreview(media.url || null);
        onChange(next);
        toast.success('Gambar berhasil diunggah.');
      } catch (e) {
        toast.error(apiErrorMessage(e, 'Gagal mengunggah gambar.'));
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [accept, onChange, returns, uploader]
  );

  return (
    <div className="space-y-3" data-testid={`${testId}-picker`}>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className="relative flex min-h-[132px] items-center justify-center overflow-hidden rounded-[var(--radius-sm)] bg-white p-3 transition-colors"
        style={{
          border: `1px dashed ${dragging ? 'var(--club-primary)' : 'var(--border-soft)'}`,
          backgroundColor: dragging ? 'rgba(252,207,43,0.08)' : undefined,
        }}
        data-testid={`${testId}-dropzone`}
      >
        {uploading ? (
          <span className="flex flex-col items-center gap-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
            <Loader2 className="h-5 w-5 animate-spin" />
            Mengunggah… {progress}%
          </span>
        ) : preview ? (
          <img src={preview} alt="" className="max-h-[160px] w-auto rounded-[var(--radius-sm)] object-contain" data-testid={`${testId}-preview`} />
        ) : value ? (
          <span className="text-xs" style={{ color: 'var(--muted-fg)' }} data-testid={`${testId}-selected`}>
            Media terpilih
          </span>
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-center text-xs" style={{ color: 'var(--muted-fg)' }}>
            <ImageIcon className="h-6 w-6" />
            Tarik gambar ke sini, atau gunakan tombol di bawah
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        data-testid={`${testId}-file-input`}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="font-semibold"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          data-testid={`${testId}-upload-button`}
        >
          <Upload className="mr-2 h-3.5 w-3.5" />
          Upload dari Perangkat
        </Button>
        {libraryEnabled ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setLibraryOpen(true)} data-testid={`${testId}-library-button`}>
            <ImageIcon className="mr-2 h-3.5 w-3.5" />
            Pilih dari Media Library
          </Button>
        ) : null}
        {value ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLocalPreview(null);
              onChange('');
            }}
            data-testid={`${testId}-clear-button`}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            Hapus
          </Button>
        ) : null}
      </div>

      {hint ? (
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
          {hint}
        </p>
      ) : null}

      {libraryEnabled ? (
        <LibraryDialog
          open={libraryOpen}
          onOpenChange={setLibraryOpen}
          testId={testId}
          onPick={(item) => {
            setLocalPreview(item.url);
            onChange(returns === 'id' ? item.id : item.url);
            setLibraryOpen(false);
          }}
        />
      ) : null}
    </div>
  );
};

export default MediaPicker;
