import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FileVideo, ImageIcon, Link2, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { BACKEND_URL } from '../../lib/api';

const NONE = '__none__';

const resolveUrl = (url) => (url && url.startsWith('/') ? `${BACKEND_URL}${url}` : url);

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export default function AdminMediaPage() {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('media:write');
  const fileRef = useRef(null);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [storage, setStorage] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [albums, setAlbums] = useState([]);

  const [files, setFiles] = useState([]);
  const [altText, setAltText] = useState('');
  const [caption, setCaption] = useState('');
  const [albumId, setAlbumId] = useState(NONE);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [queue, setQueue] = useState([]);

  const [externalOpen, setExternalOpen] = useState(false);
  const [external, setExternal] = useState({ file_name: '', url: '', mime_type: 'image/jpeg', file_type: 'IMAGE' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 60 };
      if (typeFilter !== 'all') params.file_type = typeFilter;
      const [mediaRes, albumRes] = await Promise.all([
        api.get('/media', { params }),
        api.get('/gallery/albums', { params: { limit: 100 } }),
      ]);
      setItems(mediaRes.data?.items || []);
      setTotal(mediaRes.data?.total || 0);
      setAlbums(albumRes.data?.items || []);
    } catch (e) {
      setError(apiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!hasPermission('media:read')) return;
    api
      .get('/media/storage/status')
      .then(({ data }) => setStorage(data))
      .catch(() => setStorage(null));
  }, [hasPermission]);

  /**
   * Multiple upload: files are sent one by one through the existing
   * /api/media/upload endpoint. A failing file never aborts the rest.
   */
  const upload = async () => {
    if (!files.length) {
      toast.error('Pilih minimal satu file terlebih dahulu');
      return;
    }
    setUploading(true);
    setQueue(files.map((f) => ({ name: f.name, state: 'pending', message: '' })));
    let done = 0;
    let failed = 0;

    for (let index = 0; index < files.length; index += 1) {
      const current = files[index];
      setQueue((prev) => prev.map((q, i) => (i === index ? { ...q, state: 'uploading' } : q)));
      setProgress(0);
      try {
        const form = new FormData();
        form.append('file', current);
        if (altText) form.append('alt_text', altText);
        if (caption) form.append('caption', caption);
        if (albumId !== NONE) form.append('album_id', albumId);
        // eslint-disable-next-line no-await-in-loop
        await api.post('/media/upload', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (event) => {
            if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
          },
        });
        done += 1;
        setQueue((prev) => prev.map((q, i) => (i === index ? { ...q, state: 'done' } : q)));
      } catch (e) {
        failed += 1;
        const message = apiErrorMessage(e, 'Gagal diunggah');
        setQueue((prev) => prev.map((q, i) => (i === index ? { ...q, state: 'error', message } : q)));
      }
    }

    if (done) toast.success(`${done} file berhasil diunggah`);
    if (failed) toast.error(`${failed} file gagal diunggah — lihat detail pada daftar unggahan`);
    setFiles([]);
    setAltText('');
    setCaption('');
    setAlbumId(NONE);
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
    setProgress(0);
    await load();
  };

  const saveExternal = async () => {
    if (!external.file_name || !external.url) {
      toast.error('Nama file dan URL wajib diisi');
      return;
    }
    try {
      await api.post('/media', { ...external, storage_provider: 'EXTERNAL' });
      toast.success('Metadata media eksternal ditambahkan');
      setExternalOpen(false);
      setExternal({ file_name: '', url: '', mime_type: 'image/jpeg', file_type: 'IMAGE' });
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menambahkan metadata'));
    }
  };

  const remove = async (item) => {
    try {
      await api.delete(`/media/${item.id}/hard`);
      toast.success('Media dihapus');
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menghapus media'));
    }
  };

  return (
    <div className="space-y-6" data-testid="page-admin-media">
      <div>
        <p className="als-section-label mb-2">Media Architecture</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Media Library</h1>
        <p className="mt-1 max-w-3xl text-sm" style={{ color: 'var(--muted-fg)' }}>
          Metadata disimpan di MongoDB, file fisik disimpan pada media storage/CDN melalui Media Service.
          File besar tidak pernah disimpan sebagai data database.
        </p>
      </div>

      {storage ? (
        <div className="als-card flex flex-wrap items-center gap-3 p-4" data-testid="media-storage-status">
          <Badge variant="outline" style={{ backgroundColor: 'rgba(1,40,145,0.05)' }}>
            Provider: {storage.provider}
          </Badge>
          <Badge
            variant="outline"
            style={{
              backgroundColor: storage.configured ? 'rgba(22,163,74,0.12)' : 'rgba(245,158,11,0.14)',
              color: storage.configured ? '#166534' : '#92400E',
            }}
          >
            {storage.configured ? 'Configured' : 'Not configured'}
          </Badge>
          <Badge variant="outline">CDN: {storage.cdn_enabled ? 'Aktif' : 'Belum diatur'}</Badge>
          <span className="text-xs" style={{ color: 'var(--muted-fg)' }}>
            Limit — Image {storage.limits_mb?.IMAGE}MB · Video {storage.limits_mb?.VIDEO}MB · Document{' '}
            {storage.limits_mb?.DOCUMENT}MB
          </span>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="als-card h-fit p-5" data-testid="media-upload-panel">
          <h2 className="font-display mb-4 text-lg font-semibold">Unggah Media</h2>
          {!canWrite ? (
            <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="media-upload-forbidden">
              Role Anda tidak memiliki permission <span className="font-mono">media:write</span>.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                  File
                </Label>
                <Input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  className="bg-white"
                  data-testid="media-file-input"
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
                  Bisa memilih beberapa foto/video sekaligus. Tipe file dan ukuran divalidasi di backend.
                </p>
                {files.length ? (
                  <p className="mt-1 text-xs font-medium" style={{ color: 'var(--club-secondary)' }} data-testid="media-file-count">
                    {files.length} file dipilih
                  </p>
                ) : null}
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                  Alt Text
                </Label>
                <Input
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Deskripsi singkat gambar"
                  className="bg-white"
                  data-testid="media-alt-input"
                />
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                  Album (opsional)
                </Label>
                <Select value={albumId} onValueChange={setAlbumId}>
                  <SelectTrigger className="bg-white" data-testid="media-album-select">
                    <SelectValue placeholder="Tanpa album" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Tanpa album</SelectItem>
                    {albums.map((album) => (
                      <SelectItem key={album.id} value={album.id}>
                        {album.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                  Caption
                </Label>
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Keterangan foto/video"
                  className="bg-white"
                  data-testid="media-caption-input"
                />
              </div>

              {uploading ? <Progress value={progress} data-testid="media-upload-progress" /> : null}

              {queue.length ? (
                <ul className="space-y-1 text-xs" data-testid="media-upload-queue">
                  {queue.map((q) => (
                    <li key={q.name} className="flex items-start justify-between gap-2">
                      <span className="truncate" title={q.name}>
                        {q.name}
                      </span>
                      <span
                        className="shrink-0 font-semibold"
                        style={{
                          color:
                            q.state === 'done'
                              ? 'var(--success)'
                              : q.state === 'error'
                              ? 'var(--error)'
                              : 'var(--muted-fg)',
                        }}
                        title={q.message}
                      >
                        {q.state === 'done'
                          ? 'Selesai'
                          : q.state === 'error'
                          ? 'Gagal'
                          : q.state === 'uploading'
                          ? 'Mengunggah…'
                          : 'Menunggu'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <Button
                onClick={upload}
                disabled={uploading}
                className="w-full font-semibold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
                data-testid="media-upload-button"
              >
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Unggah
              </Button>

              <Dialog open={externalOpen} onOpenChange={setExternalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full" data-testid="media-external-button">
                    <Link2 className="mr-2 h-4 w-4" />
                    Tambah URL Eksternal / CDN
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white" data-testid="media-external-dialog">
                  <DialogHeader>
                    <DialogTitle className="font-display">Metadata Media Eksternal</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      placeholder="Nama file"
                      value={external.file_name}
                      onChange={(e) => setExternal((p) => ({ ...p, file_name: e.target.value }))}
                      className="bg-white"
                      data-testid="media-external-name"
                    />
                    <Input
                      placeholder="https://cdn.example.com/foto.jpg"
                      value={external.url}
                      onChange={(e) => setExternal((p) => ({ ...p, url: e.target.value }))}
                      className="bg-white"
                      data-testid="media-external-url"
                    />
                    <Select
                      value={external.file_type}
                      onValueChange={(v) =>
                        setExternal((p) => ({
                          ...p,
                          file_type: v,
                          mime_type: v === 'IMAGE' ? 'image/jpeg' : v === 'VIDEO' ? 'video/mp4' : 'application/pdf',
                        }))
                      }
                    >
                      <SelectTrigger className="bg-white" data-testid="media-external-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['IMAGE', 'VIDEO', 'DOCUMENT'].map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setExternalOpen(false)}>
                      Batal
                    </Button>
                    <Button
                      onClick={saveExternal}
                      style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
                      data-testid="media-external-save"
                    >
                      Simpan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        <div className="als-card p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-display text-lg font-semibold">
              Media Items <span className="text-sm font-normal" style={{ color: 'var(--muted-fg)' }}>({total})</span>
            </h2>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full bg-white sm:w-48" data-testid="media-type-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                {['IMAGE', 'VIDEO', 'DOCUMENT'].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <LoadingState rows={6} testId="media-loading" />
          ) : error ? (
            <ErrorState message={error} onRetry={load} testId="media-error" />
          ) : items.length === 0 ? (
            <EmptyState
              icon={ImageIcon}
              title="Belum ada media"
              description="Unggah foto atau video pertandingan, atau tambahkan URL eksternal/CDN."
              testId="media-empty"
            />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4" data-testid="media-grid">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-[var(--radius-md)]"
                  style={{ border: '1px solid var(--border-soft)' }}
                  data-testid={`media-item-${item.id}`}
                >
                  <div className="flex h-28 items-center justify-center" style={{ backgroundColor: 'var(--surface-3)' }}>
                    {item.file_type === 'IMAGE' ? (
                      <img
                        src={resolveUrl(item.thumbnail_url || item.url)}
                        alt={item.alt_text || item.file_name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : item.file_type === 'VIDEO' ? (
                      <FileVideo className="h-7 w-7" style={{ color: 'var(--club-secondary)' }} />
                    ) : (
                      <ImageIcon className="h-7 w-7" style={{ color: 'var(--club-secondary)' }} />
                    )}
                  </div>
                  <div className="space-y-1.5 p-3">
                    <p className="truncate text-xs font-medium" title={item.file_name}>
                      {item.file_name}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {item.file_type}
                      </Badge>
                      <span className="text-[10px]" style={{ color: 'var(--muted-fg)' }}>
                        {formatSize(item.file_size)}
                      </span>
                    </div>
                    <p className="truncate text-[10px] font-mono" style={{ color: 'var(--muted-fg)' }}>
                      {item.storage_provider}
                    </p>
                    {canWrite ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-full"
                        onClick={() => remove(item)}
                        data-testid={`media-delete-${item.id}`}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" style={{ color: 'var(--error)' }} />
                        <span className="text-xs">Hapus</span>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
