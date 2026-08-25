import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Eye,
  EyeOff,
  FileVideo,
  ImageIcon,
  Pencil,
  Plus,
  Star,
  Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import api, { BACKEND_URL, apiErrorMessage } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { EmptyState } from '../../components/shared/EmptyState';
import { useAuth } from '../../context/AuthContext';

export const resolveMediaUrl = (url) => (url && url.startsWith('/') ? `${BACKEND_URL}${url}` : url);

const MediaThumb = ({ item, className = 'h-full w-full object-cover' }) => {
  if (item.file_type === 'IMAGE') {
    return (
      <img
        src={resolveMediaUrl(item.thumbnail_url || item.url)}
        alt={item.alt_text || item.file_name}
        className={className}
        loading="lazy"
      />
    );
  }
  return (
    <div className="flex h-full w-full items-center justify-center" style={{ backgroundColor: 'var(--surface-3)' }}>
      {item.file_type === 'VIDEO' ? (
        <FileVideo className="h-6 w-6" style={{ color: 'var(--club-secondary)' }} />
      ) : (
        <ImageIcon className="h-6 w-6" style={{ color: 'var(--club-secondary)' }} />
      )}
    </div>
  );
};

export default function AdminAlbumMediaPage() {
  const { albumId } = useParams();
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('gallery:write');

  const [album, setAlbum] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [library, setLibrary] = useState([]);
  const [libraryType, setLibraryType] = useState('all');
  const [libraryQuery, setLibraryQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({ caption: '', alt_text: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/gallery/albums/${albumId}/media`, { params: { limit: 200 } });
      setAlbum(data.album);
      setItems(data.items || []);
    } catch (e) {
      setError(apiErrorMessage(e, 'Album tidak ditemukan atau gagal dimuat.'));
    } finally {
      setLoading(false);
    }
  }, [albumId]);

  useEffect(() => {
    load();
  }, [load]);

  const loadLibrary = useCallback(async () => {
    try {
      const params = { limit: 60 };
      if (libraryType !== 'all') params.file_type = libraryType;
      if (libraryQuery) params.q = libraryQuery;
      const { data } = await api.get('/media', { params });
      setLibrary(data?.items || []);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat Media Library'));
    }
  }, [libraryType, libraryQuery]);

  useEffect(() => {
    if (pickerOpen) loadLibrary();
  }, [pickerOpen, loadLibrary]);

  const attach = async () => {
    if (!selected.length) {
      toast.error('Pilih minimal satu media');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/gallery/albums/${albumId}/media`, { media_ids: selected });
      toast.success(`${selected.length} media ditambahkan ke album`);
      setSelected([]);
      setPickerOpen(false);
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menambahkan media'));
    } finally {
      setSaving(false);
    }
  };

  const move = async (index, direction) => {
    const next = [...items];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    try {
      await api.patch(`/gallery/albums/${albumId}/media/order`, { media_ids: next.map((i) => i.id) });
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan urutan'));
      await load();
    }
  };

  const detach = async (item) => {
    try {
      await api.delete(`/gallery/albums/${albumId}/media/${item.id}`);
      toast.success('Media dilepas dari album (file tetap ada di Media Library)');
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal melepas media'));
    }
  };

  const setCover = async (item) => {
    try {
      await api.patch(`/gallery/albums/${albumId}`, { cover_media_id: item.id });
      toast.success('Cover album diperbarui');
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal mengatur cover'));
    }
  };

  const togglePublish = async () => {
    const publish = album?.publish_status !== 'PUBLISHED';
    try {
      const { data } = await api.post(`/gallery/albums/${albumId}/publish`, null, { params: { publish } });
      setAlbum(data);
      toast.success(publish ? 'Album dipublikasikan' : 'Album dikembalikan ke DRAFT');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal mengubah status publikasi'));
    }
  };

  const saveMeta = async () => {
    try {
      await api.patch(`/media/${editing.id}`, {
        caption: editValues.caption || null,
        alt_text: editValues.alt_text || null,
      });
      toast.success('Caption & alt text disimpan');
      setEditing(null);
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan metadata'));
    }
  };

  if (loading) return <LoadingState rows={5} testId="admin-album-loading" />;
  if (error) return <ErrorState message={error} onRetry={load} testId="admin-album-error" />;

  const published = album?.publish_status === 'PUBLISHED';

  return (
    <div className="space-y-6" data-testid="page-admin-album-media">
      <Link
        to="/admin/gallery"
        className="inline-flex items-center gap-2 text-sm font-semibold"
        style={{ color: 'var(--club-secondary)' }}
        data-testid="admin-album-back"
      >
        <ArrowLeft className="h-4 w-4" />
        Semua album
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="als-section-label mb-2">Gallery Album</p>
          <h1 className="font-display text-2xl font-semibold tracking-tight" data-testid="admin-album-title">
            {album?.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--muted-fg)' }}>
            <Badge
              variant="outline"
              style={
                published
                  ? { backgroundColor: 'rgba(22,163,74,0.12)', color: '#166534' }
                  : { backgroundColor: 'rgba(245,158,11,0.14)', color: '#92400E' }
              }
              data-testid="admin-album-publish-badge"
            >
              {album?.publish_status || 'DRAFT'}
            </Badge>
            <span data-testid="admin-album-media-count">{items.length} media</span>
            {album?.match_id ? <span>· terhubung ke satu pertandingan</span> : <span>· belum terhubung match</span>}
          </div>
        </div>

        {canWrite ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={togglePublish} data-testid="admin-album-publish-toggle">
              {published ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
              {published ? 'Jadikan Draft' : 'Publikasikan'}
            </Button>
            <Button
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="font-semibold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
              data-testid="admin-album-add-media"
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah Media
            </Button>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="Album belum memiliki media"
          description="Pilih foto atau video yang sudah ada di Media Library, lalu atur urutan dan cover."
          actionLabel={canWrite ? 'Tambah Media' : undefined}
          onAction={canWrite ? () => setPickerOpen(true) : undefined}
          testId="admin-album-empty"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="admin-album-media-grid">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="als-card overflow-hidden"
              data-testid={`admin-album-media-${item.id}`}
            >
              <div className="relative h-40" style={{ backgroundColor: 'var(--surface-3)' }}>
                <MediaThumb item={item} />
                <span
                  className="font-display absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-bold"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
                >
                  {index + 1}
                </span>
                {album?.cover_media_id === item.id ? (
                  <Badge
                    className="absolute right-2 top-2 border-0 text-[10px] font-semibold"
                    style={{ backgroundColor: 'var(--club-secondary)', color: '#fff' }}
                  >
                    COVER
                  </Badge>
                ) : null}
              </div>
              <div className="space-y-2 p-4">
                <p className="truncate text-sm font-semibold" title={item.file_name}>
                  {item.file_name}
                </p>
                <p className="line-clamp-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
                  {item.caption || 'Belum ada caption'}
                </p>
                <p className="line-clamp-1 text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                  Alt: {item.alt_text || '—'}
                </p>
                {canWrite ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Naikkan urutan"
                      data-testid={`admin-album-up-${item.id}`}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label="Turunkan urutan"
                      data-testid={`admin-album-down-${item.id}`}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCover(item)}
                      aria-label="Jadikan cover"
                      data-testid={`admin-album-cover-${item.id}`}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setEditing(item);
                        setEditValues({ caption: item.caption || '', alt_text: item.alt_text || '' });
                      }}
                      aria-label="Edit caption dan alt text"
                      data-testid={`admin-album-edit-${item.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => detach(item)}
                      aria-label="Lepas dari album"
                      data-testid={`admin-album-detach-${item.id}`}
                    >
                      <Unlink className="h-4 w-4" style={{ color: 'var(--error)' }} />
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto bg-white" data-testid="admin-album-picker">
          <DialogHeader>
            <DialogTitle className="font-display">Pilih Media dari Library</DialogTitle>
            <DialogDescription>
              Gunakan media yang sudah diunggah. Tidak perlu mengunggah ulang file yang sama.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Cari nama file / caption…"
              className="bg-white"
              data-testid="admin-album-picker-search"
            />
            <Select value={libraryType} onValueChange={setLibraryType}>
              <SelectTrigger className="w-full bg-white sm:w-44" data-testid="admin-album-picker-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                <SelectItem value="IMAGE">Foto</SelectItem>
                <SelectItem value="VIDEO">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {library.length === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: 'var(--muted-fg)' }}>
              Media tidak ditemukan. Unggah foto/video melalui Media Library terlebih dahulu.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {library.map((item) => {
                const checked = selected.includes(item.id);
                const inAlbum = item.album_id === albumId;
                return (
                  <label
                    key={item.id}
                    className="relative block cursor-pointer overflow-hidden rounded-[var(--radius-md)] transition-transform duration-200 hover:scale-[1.02]"
                    style={{ border: `2px solid ${checked ? 'var(--club-primary)' : 'var(--border-soft)'}` }}
                    data-testid={`admin-album-picker-item-${item.id}`}
                  >
                    <div className="h-24">
                      <MediaThumb item={item} />
                    </div>
                    <div className="flex items-center gap-2 p-2">
                      <Checkbox
                        checked={checked}
                        disabled={inAlbum}
                        onCheckedChange={(v) =>
                          setSelected((prev) => (v ? [...prev, item.id] : prev.filter((id) => id !== item.id)))
                        }
                      />
                      <span className="truncate text-[11px]" title={item.file_name}>
                        {inAlbum ? 'Sudah di album' : item.file_name}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPickerOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={attach}
              disabled={saving || !selected.length}
              className="font-semibold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
              data-testid="admin-album-picker-save"
            >
              Tambahkan {selected.length ? `(${selected.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-w-lg bg-white" data-testid="admin-album-meta-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Caption &amp; Alt Text</DialogTitle>
            <DialogDescription>Alt text penting untuk accessibility dan SEO.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                Caption
              </Label>
              <Textarea
                value={editValues.caption}
                onChange={(e) => setEditValues((p) => ({ ...p, caption: e.target.value }))}
                rows={3}
                className="bg-white"
                data-testid="admin-album-meta-caption"
              />
            </div>
            <div>
              <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                Alt Text
              </Label>
              <Input
                value={editValues.alt_text}
                onChange={(e) => setEditValues((p) => ({ ...p, alt_text: e.target.value }))}
                className="bg-white"
                data-testid="admin-album-meta-alt"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>
              Batal
            </Button>
            <Button
              onClick={saveMeta}
              className="font-semibold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
              data-testid="admin-album-meta-save"
            >
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
