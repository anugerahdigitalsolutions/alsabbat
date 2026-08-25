import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Send, Share2, XCircle } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { EmptyState } from '../../components/shared/EmptyState';
import { toast } from 'sonner';

const STATUS_TONE = {
  PUBLISHED: { bg: 'rgba(22,163,74,0.12)', fg: '#166534' },
  FAILED: { bg: 'rgba(220,38,38,0.10)', fg: '#991B1B' },
  PUBLISHING: { bg: 'rgba(1,40,145,0.08)', fg: '#012891' },
  DRAFT: { bg: 'rgba(0,0,0,0.06)', fg: '#3F3F46' },
  CANCELLED: { bg: 'rgba(0,0,0,0.06)', fg: '#3F3F46' },
  QUEUED: { bg: 'rgba(252,207,43,0.18)', fg: '#7A5A00' },
};

const CONNECTION_TONE = {
  CONNECTED: { bg: 'rgba(22,163,74,0.12)', fg: '#166534' },
  NOT_CONFIGURED: { bg: 'rgba(0,0,0,0.06)', fg: '#3F3F46' },
  REQUIRES_APPROVAL: { bg: 'rgba(252,207,43,0.18)', fg: '#7A5A00' },
  EXPIRED: { bg: 'rgba(220,38,38,0.10)', fg: '#991B1B' },
  REQUIRES_REAUTH: { bg: 'rgba(220,38,38,0.10)', fg: '#991B1B' },
};

const Pill = ({ value, tones }) => {
  const tone = tones[value] || tones.DRAFT || { bg: 'rgba(0,0,0,0.06)', fg: '#3F3F46' };
  return (
    <Badge variant="outline" style={{ backgroundColor: tone.bg, color: tone.fg, borderColor: 'transparent' }}>
      {value}
    </Badge>
  );
};

export default function AdminSocialPage() {
  const [platforms, setPlatforms] = useState([]);
  const [summary, setSummary] = useState([]);
  const [posts, setPosts] = useState([]);
  const [media, setMedia] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    platforms: [],
    post_id: '',
    media_ids: [],
    caption: '',
    title: '',
    description: '',
    tags: '',
    visibility: 'private',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [p, s, pubs, postRes, mediaRes] = await Promise.all([
        api.get('/social/platforms'),
        api.get('/social/summary'),
        api.get('/social/publications', { params: { limit: 50 } }),
        api.get('/content/posts', { params: { limit: 50 } }),
        api.get('/media', { params: { limit: 50 } }),
      ]);
      setPlatforms(p.data?.items || []);
      setSummary(s.data?.items || []);
      setItems(pubs.data?.items || []);
      setPosts(postRes.data?.items || []);
      setMedia(mediaRes.data?.items || []);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat data Social Publishing.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const togglePlatform = (platform) =>
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(platform)
        ? f.platforms.filter((p) => p !== platform)
        : [...f.platforms, platform],
    }));

  const toggleMedia = (id) =>
    setForm((f) => ({
      ...f,
      media_ids: f.media_ids.includes(id) ? f.media_ids.filter((m) => m !== id) : [...f.media_ids, id],
    }));

  const selectedMedia = useMemo(
    () => media.filter((m) => form.media_ids.includes(m.id)),
    [media, form.media_ids]
  );

  const submit = async () => {
    if (!form.platforms.length) {
      toast.error('Pilih minimal satu platform.');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        platforms: form.platforms,
        post_id: form.post_id || null,
        media_ids: form.media_ids,
        caption: form.caption,
        title: form.title || null,
        description: form.description || null,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        visibility: form.visibility,
      };
      const { data } = await api.post('/social/publications', payload);
      toast.success(`${data.total} draft publikasi dibuat.`);
      setForm({ platforms: [], post_id: '', media_ids: [], caption: '', title: '', description: '', tags: '', visibility: 'private' });
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal membuat publikasi.'));
    } finally {
      setCreating(false);
    }
  };

  const act = async (id, action) => {
    setBusyId(id);
    try {
      const { data } = await api.post(`/social/publications/${id}/${action}`);
      if (data.status === 'PUBLISHED') toast.success(`${data.platform}: PUBLISHED`);
      else toast.error(`${data.platform}: ${data.status} — ${data.error_message || data.error_code || ''}`);
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Aksi gagal.'));
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await api.delete(`/social/publications/${id}`);
      toast.success('Publikasi dihapus.');
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menghapus publikasi.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8" data-testid="admin-social-page">
      <div>
        <h1 className="font-display text-2xl font-bold">Social Publishing</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
          Buat satu konten, lalu pilih platform tujuan secara eksplisit. Hanya API resmi platform yang digunakan.
        </p>
      </div>

      {/* Platform dashboard */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="social-platform-cards">
        {platforms.map((p) => {
          const stat = summary.find((s) => s.platform === p.platform);
          return (
            <div key={p.platform} className="als-card p-5" data-testid={`social-platform-${p.platform}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-display text-base font-bold">{p.label}</p>
                <Pill value={p.status} tones={CONNECTION_TONE} />
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
                {p.official_api}
              </p>
              {p.missing_env.length ? (
                <p className="mt-3 flex items-start gap-1.5 text-xs" style={{ color: '#991B1B' }}>
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Env belum diisi: {p.missing_env.join(', ')}
                </p>
              ) : null}
              <ul className="mt-3 space-y-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
                {p.requirements.slice(0, 3).map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
              {stat ? (
                <p className="mt-3 text-xs tabular-nums" style={{ color: 'var(--muted-fg)' }}>
                  {stat.published_total} published · {stat.failed_total} failed
                </p>
              ) : null}
            </div>
          );
        })}
      </section>

      {/* Composer */}
      <section className="als-card p-6" data-testid="social-composer">
        <p className="als-section-label mb-5">Composer</p>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <Label className="mb-1.5 block">Post / Berita (untuk publish Website)</Label>
              <Select value={form.post_id || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, post_id: v === 'none' ? '' : v }))}>
                <SelectTrigger data-testid="social-post-select">
                  <SelectValue placeholder="Tanpa post" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tanpa post</SelectItem>
                  {posts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1.5 block">Caption</Label>
              <Textarea
                value={form.caption}
                onChange={(e) => setForm((f) => ({ ...f, caption: e.target.value }))}
                maxLength={2200}
                rows={4}
                placeholder="Caption untuk Instagram / TikTok"
                data-testid="social-caption-input"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">Judul (YouTube)</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={100}
                  data-testid="social-title-input"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Visibility (YouTube)</Label>
                <Select value={form.visibility} onValueChange={(v) => setForm((f) => ({ ...f, visibility: v }))}>
                  <SelectTrigger data-testid="social-visibility-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">private</SelectItem>
                    <SelectItem value="unlisted">unlisted</SelectItem>
                    <SelectItem value="public">public</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">Tags (pisahkan dengan koma)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                data-testid="social-tags-input"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Platform (pilih manual)</Label>
              <div className="space-y-2" data-testid="social-platform-selector">
                {platforms.map((p) => (
                  <label
                    key={p.platform}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2"
                    style={{ backgroundColor: 'var(--surface-2)' }}
                  >
                    <Checkbox
                      checked={form.platforms.includes(p.platform)}
                      onCheckedChange={() => togglePlatform(p.platform)}
                      data-testid={`social-platform-checkbox-${p.platform}`}
                    />
                    <span className="text-sm font-medium">{p.label}</span>
                    <Pill value={p.status} tones={CONNECTION_TONE} />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 block">Media dari Media Library</Label>
              {media.length ? (
                <div className="max-h-52 space-y-2 overflow-y-auto pr-1" data-testid="social-media-selector">
                  {media.map((m) => (
                    <label
                      key={m.id}
                      className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2"
                      style={{ backgroundColor: 'var(--surface-2)' }}
                    >
                      <Checkbox
                        checked={form.media_ids.includes(m.id)}
                        onCheckedChange={() => toggleMedia(m.id)}
                        data-testid={`social-media-checkbox-${m.id}`}
                      />
                      <span className="min-w-0 flex-1 truncate text-sm">{m.file_name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {m.file_type}
                      </Badge>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                  Media Library masih kosong. Unggah media terlebih dahulu di menu Media.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 rounded-[var(--radius-md)] p-4" style={{ backgroundColor: '#000000' }} data-testid="social-preview">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--club-primary)' }}>
            Preview
          </p>
          <p className="mt-2 whitespace-pre-line text-sm" style={{ color: 'var(--club-light)' }}>
            {form.caption || 'Caption belum diisi.'}
          </p>
          <p className="mt-3 text-xs" style={{ color: 'rgba(254,254,254,0.6)' }}>
            {form.platforms.length ? form.platforms.join(' · ') : 'Belum ada platform dipilih'} ·{' '}
            {selectedMedia.length} media
          </p>
        </div>

        <Button
          className="mt-5 min-h-[44px] font-semibold"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          onClick={submit}
          disabled={creating}
          data-testid="social-create-button"
        >
          {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
          Buat Draft Publikasi
        </Button>
      </section>

      {/* Publications */}
      <section data-testid="social-publications">
        <div className="mb-4 flex items-center justify-between">
          <p className="als-section-label">Publikasi</p>
          <Button variant="outline" size="sm" onClick={load} data-testid="social-reload-button">
            <RefreshCw className="mr-2 h-3.5 w-3.5" /> Muat ulang
          </Button>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
            Memuat…
          </p>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Share2}
            title="Belum ada publikasi"
            description="Buat draft publikasi melalui Composer di atas, lalu publish per platform."
            testId="social-publications-empty"
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="als-card flex flex-wrap items-center gap-4 p-4" data-testid={`social-publication-${item.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-bold">{item.platform}</span>
                    <Pill value={item.status} tones={STATUS_TONE} />
                    <span className="text-xs tabular-nums" style={{ color: 'var(--muted-fg)' }}>
                      attempt {item.attempt_count}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm" style={{ color: 'var(--muted-fg)' }}>
                    {item.caption || item.title || item.post?.title || '—'}
                  </p>
                  {item.error_message ? (
                    <p className="mt-1 flex items-start gap-1.5 text-xs" style={{ color: '#991B1B' }}>
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      [{item.error_code}] {item.error_message}
                    </p>
                  ) : null}
                  {item.external_url ? (
                    <a
                      href={item.external_url}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1.5 text-xs underline"
                      style={{ color: 'var(--club-secondary)' }}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {item.external_url}
                    </a>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {item.status === 'DRAFT' || item.status === 'QUEUED' ? (
                    <Button
                      size="sm"
                      style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                      disabled={busyId === item.id}
                      onClick={() => act(item.id, 'publish')}
                      data-testid={`social-publish-${item.id}`}
                    >
                      {busyId === item.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-2 h-3.5 w-3.5" />}
                      Publish
                    </Button>
                  ) : null}
                  {item.status === 'FAILED' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === item.id}
                      onClick={() => act(item.id, 'retry')}
                      data-testid={`social-retry-${item.id}`}
                    >
                      {busyId === item.id ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
                      Retry
                    </Button>
                  ) : null}
                  {item.status !== 'PUBLISHED' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === item.id}
                      onClick={() => remove(item.id)}
                      data-testid={`social-delete-${item.id}`}
                    >
                      Hapus
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
