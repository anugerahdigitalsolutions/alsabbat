import React, { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { LoadingState } from '../shared/LoadingState';
import { parseYoutubeId, YOUTUBE_VIDEOS_KEY } from '../public/home/YoutubeShowcase';

const rowId = () => `yt-${Math.random().toString(36).slice(2, 10)}`;

/** Modal tambah video — memakai logic ekstraksi ID & penyimpanan existing. */
const AddVideoDialog = ({ open, onOpenChange, onSubmit, saving }) => {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (open) {
      setUrl('');
      setTitle('');
      setEnabled(true);
    }
  }, [open]);

  const videoId = parseYoutubeId(url);
  const invalid = Boolean(url.trim()) && !videoId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white" data-testid="admin-youtube-add-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Tambah Video YouTube</DialogTitle>
          <DialogDescription>
            Tempel link YouTube (watch, youtu.be, atau shorts). Video baru langsung menjadi urutan paling atas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="relative w-full overflow-hidden rounded-[var(--radius-sm)]"
            style={{ aspectRatio: '16 / 9', backgroundColor: 'rgba(1,40,145,0.08)' }}
          >
            {videoId ? (
              <img
                src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                alt="Pratinjau video"
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
                data-testid="admin-youtube-add-preview"
              />
            ) : (
              <span className="absolute inset-0 grid place-items-center">
                <Youtube className="h-8 w-8" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
              </span>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
              Link YouTube
            </Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=xxxxxxxxxxx"
              className="bg-white"
              autoFocus
              data-testid="admin-youtube-add-url"
            />
            {invalid ? (
              <p className="mt-1 text-xs font-semibold" style={{ color: '#991B1B' }} data-testid="admin-youtube-add-invalid">
                Link YouTube tidak valid.
              </p>
            ) : null}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
              Judul (opsional)
            </Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul video di Beranda"
              className="bg-white"
              data-testid="admin-youtube-add-title"
            />
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
            <Switch checked={enabled} onCheckedChange={setEnabled} data-testid="admin-youtube-add-enabled" />
            {enabled ? 'Aktif' : 'Nonaktif'}
          </label>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="admin-youtube-add-cancel">
            Batal
          </Button>
          <Button
            type="button"
            onClick={() => onSubmit({ url: url.trim(), title: title.trim(), enabled })}
            disabled={saving || !videoId}
            className="font-semibold"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            data-testid="admin-youtube-add-submit"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Admin → Konten Halaman → Video YouTube.
 * Disimpan pada CMS existing (site_content) dengan key `home.youtube.videos` (JSON).
 */
export const YoutubeVideosManager = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('content:write');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/site-content', { params: { limit: 200 } });
      const map = {};
      (data?.items || []).forEach((item) => {
        map[item.key] = item.value || '';
      });

      let list = [];
      if (map[YOUTUBE_VIDEOS_KEY]) {
        try {
          const parsed = JSON.parse(map[YOUTUBE_VIDEOS_KEY]);
          if (Array.isArray(parsed)) list = parsed;
        } catch (e) {
          list = [];
        }
      }
      if (!list.length) {
        // migrasi ringan dari key lama (video_1..3) tanpa mengubah database
        list = [1, 2, 3]
          .map((n) => ({ url: map[`home.youtube.video_${n}`] || '', title: map[`home.youtube.title_${n}`] || '' }))
          .filter((item) => item.url);
      }

      // Urutan admin = urutan tampil di Beranda: terbaru (order tertinggi) di paling atas.
      setRows(
        list
          .map((item, i) => ({
            key: rowId(),
            url: item.url || item.id || '',
            title: item.title || '',
            enabled: item.enabled !== false,
            order: Number.isFinite(Number(item.order)) ? Number(item.order) : i,
            _i: i,
          }))
          .sort((a, b) => b.order - a.order || b._i - a._i)
      );
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat daftar video YouTube'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const update = (key, patch) =>
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const remove = (key) => setRows((prev) => prev.filter((row) => row.key !== key));

  const move = (index, delta) =>
    setRows((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const add = () => setAddOpen(true);

  // Simpan daftar ke CMS. Baris paling atas mendapat `order` tertinggi
  // supaya urutan admin sama dengan urutan tampil di Beranda (terbaru di atas).
  const persist = async (list) => {
    const invalid = list.filter((row) => row.url.trim() && !parseYoutubeId(row.url));
    if (invalid.length) {
      toast.error('Ada link YouTube yang tidak valid. Contoh: https://www.youtube.com/watch?v=xxxxxxxxxxx');
      return false;
    }
    setSaving(true);
    try {
      const kept = list.filter((row) => row.url.trim());
      const payload = kept.map((row, i) => ({
        url: row.url.trim(),
        title: row.title.trim(),
        enabled: row.enabled !== false,
        order: kept.length - 1 - i,
      }));
      await api.put('/site-content/bulk', {
        items: [
          {
            key: YOUTUBE_VIDEOS_KEY,
            value: payload.length ? JSON.stringify(payload) : '',
            label: 'Daftar Video YouTube Beranda',
            group: 'YouTube',
          },
        ],
      });
      toast.success('Video YouTube tersimpan');
      await load();
      return true;
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan video YouTube'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = () => persist(rows);

  const submitNew = async (video) => {
    const ok = await persist([{ key: rowId(), ...video }, ...rows]);
    if (ok) setAddOpen(false);
  };

  if (loading) return <LoadingState rows={3} testId="admin-youtube-loading" />;

  const activeCount = rows.filter((row) => row.url.trim() && row.enabled !== false).length;

  return (
    <div className="space-y-5" data-testid="admin-youtube-videos">
      <AddVideoDialog open={addOpen} onOpenChange={setAddOpen} onSubmit={submitNew} saving={saving} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm" style={{ color: 'var(--muted-fg)' }}>
          Tempel link YouTube biasa (watch, youtu.be, atau shorts) — ID video diambil otomatis. Video aktif tampil
          sebagai slider 16:9 di Beranda dan berpindah otomatis saat video selesai. Bila tidak ada video aktif,
          section YouTube tidak ditampilkan. Video terbaru otomatis berada di urutan paling atas.
        </p>
        {canWrite ? (
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={add} className="font-semibold" data-testid="admin-youtube-add">
              <Plus className="mr-2 h-4 w-4" />
              Tambah Video
            </Button>
            <Button
              type="button"
              onClick={save}
              disabled={saving}
              className="font-semibold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
              data-testid="admin-youtube-save"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Simpan
            </Button>
          </div>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="als-card flex flex-col items-center gap-3 px-6 py-10 text-center" data-testid="admin-youtube-empty">
          <Youtube className="h-8 w-8" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
          <p className="font-display text-base font-semibold">Belum ada video YouTube</p>
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            Klik “Tambah Video” lalu tempel link YouTube.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, index) => {
            const videoId = parseYoutubeId(row.url);
            const invalid = Boolean(row.url.trim()) && !videoId;
            return (
              <div
                key={row.key}
                className="als-card p-4"
                data-testid={`admin-youtube-row-${index}`}
              >
                <div className="flex flex-wrap items-start gap-4">
                  <div
                    className="relative w-full shrink-0 overflow-hidden rounded-[var(--radius-sm)] sm:w-40"
                    style={{ aspectRatio: '16 / 9', backgroundColor: 'rgba(1,40,145,0.08)' }}
                  >
                    {videoId ? (
                      <img
                        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                        alt={row.title || 'Pratinjau video'}
                        className="absolute inset-0 h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center">
                        <Youtube className="h-6 w-6" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                        Link YouTube
                      </Label>
                      <Input
                        value={row.url}
                        onChange={(e) => update(row.key, { url: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=xxxxxxxxxxx"
                        disabled={!canWrite}
                        className="bg-white"
                        data-testid={`admin-youtube-url-${index}`}
                      />
                      {invalid ? (
                        <p className="mt-1 text-xs font-semibold" style={{ color: '#991B1B' }} data-testid={`admin-youtube-invalid-${index}`}>
                          Link YouTube tidak valid.
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                        Judul (opsional)
                      </Label>
                      <Input
                        value={row.title}
                        onChange={(e) => update(row.key, { title: e.target.value })}
                        placeholder="Judul video di Beranda"
                        disabled={!canWrite}
                        className="bg-white"
                        data-testid={`admin-youtube-title-${index}`}
                      />
                    </div>
                  </div>

                  <div className="flex w-full shrink-0 items-center justify-between gap-2 sm:w-auto sm:flex-col sm:items-end">
                    <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                      <Switch
                        checked={row.enabled !== false}
                        onCheckedChange={(checked) => update(row.key, { enabled: checked })}
                        disabled={!canWrite}
                        data-testid={`admin-youtube-enabled-${index}`}
                      />
                      {row.enabled !== false ? 'Aktif' : 'Nonaktif'}
                    </label>
                    {canWrite ? (
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          aria-label="Naikkan urutan"
                          data-testid={`admin-youtube-up-${index}`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => move(index, 1)}
                          disabled={index === rows.length - 1}
                          aria-label="Turunkan urutan"
                          data-testid={`admin-youtube-down-${index}`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => remove(row.key)}
                          aria-label="Hapus video"
                          data-testid={`admin-youtube-delete-${index}`}
                        >
                          <Trash2 className="h-4 w-4" style={{ color: '#991B1B' }} />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
          <p className="text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="admin-youtube-count">
            {activeCount} video aktif akan tampil di Beranda.
          </p>
        </div>
      )}
    </div>
  );
};

export default YoutubeVideosManager;
