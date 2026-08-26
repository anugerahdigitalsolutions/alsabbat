import React, { useEffect, useState } from 'react';
import { Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useClub } from '../../context/ClubContext';
import { DEFAULT_FAVICON, SITE_FAVICON_KEY, applyFavicon, faviconHref, parseFaviconConfig } from '../../lib/siteIcons';
import { MediaPicker } from '../shared/MediaPicker';
import { Button } from '../ui/button';
import { Label } from '../ui/label';

const FAVICON_SPEC = { aspect: 1, ratio: '1:1 (persegi)', size: '512 × 512 px', note: 'Logo akan dipotong persegi dan ditampilkan sangat kecil di tab browser.' };
const PREVIEW_SIZES = [16, 32, 48];

export const FaviconManager = () => {
  const { hasPermission } = useAuth();
  const { clubName } = useClub();
  const canWrite = hasPermission('content:write');
  const [config, setConfig] = useState({ url: '', version: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get('/site-content/public')
      .then(({ data }) => setConfig(parseFaviconConfig(data?.items?.[SITE_FAVICON_KEY])))
      .catch((e) => toast.error(apiErrorMessage(e, 'Gagal memuat favicon')))
      .finally(() => setLoading(false));
  }, []);

  const previewHref = config.url ? faviconHref(config) : DEFAULT_FAVICON;

  const persist = async (next, message) => {
    setSaving(true);
    try {
      await api.put('/site-content/bulk', {
        items: [
          {
            key: SITE_FAVICON_KEY,
            value: next.url ? JSON.stringify(next) : '',
            label: 'Favicon Website',
            group: 'Pengaturan Website',
          },
        ],
      });
      setConfig(next);
      applyFavicon(next.url ? next : null);
      toast.success(message);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan favicon'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center" data-testid="admin-favicon-loading">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-favicon-page">
      <div className="als-card space-y-4 p-5">
        <div>
          <p className="font-display text-sm font-semibold">Favicon Website</p>
          <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
            Ikon kecil yang tampil di tab browser dan saat website disimpan ke layar utama HP.
          </p>
        </div>
        <MediaPicker
          value={config.url || ''}
          onChange={(url) => setConfig((prev) => ({ ...prev, url: url || '' }))}
          testId="admin-favicon"
          spec={FAVICON_SPEC}
          hint="Upload dari perangkat atau pilih dari Media Library. Editor crop akan terbuka dengan frame persegi."
        />
      </div>

      <div className="als-card space-y-4 p-5">
        <Label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
          Preview
        </Label>
        <div
          className="flex max-w-sm items-center gap-2 rounded-t-[12px] px-3 py-2"
          style={{ backgroundColor: '#EDEFF3', border: '1px solid rgba(0,0,0,0.08)' }}
          data-testid="admin-favicon-tab-preview"
        >
          <img src={previewHref} alt="" width={16} height={16} style={{ width: 16, height: 16, objectFit: 'contain' }} />
          <span className="truncate text-xs" style={{ color: 'var(--fg)' }}>
            {clubName || 'ALSABBAT Football Club'}
          </span>
        </div>
        <div className="flex items-end gap-5">
          {PREVIEW_SIZES.map((size) => (
            <div key={size} className="text-center">
              <div
                className="flex items-center justify-center rounded-[6px]"
                style={{ width: size, height: size, backgroundColor: 'rgba(0,0,0,0.03)' }}
              >
                <img
                  src={previewHref}
                  alt={`Favicon ${size}px`}
                  style={{ width: size, height: size, objectFit: 'contain' }}
                  data-testid={`admin-favicon-preview-${size}`}
                />
              </div>
              <span className="mt-1 block text-[10px]" style={{ color: 'var(--muted-fg)' }}>
                {size}px
              </span>
            </div>
          ))}
          <div className="text-center">
            <img
              src={previewHref}
              alt="Apple touch icon"
              className="rounded-[12px]"
              style={{ width: 60, height: 60, objectFit: 'contain', backgroundColor: 'rgba(0,0,0,0.03)' }}
              data-testid="admin-favicon-preview-180"
            />
            <span className="mt-1 block text-[10px]" style={{ color: 'var(--muted-fg)' }}>
              180px (iOS)
            </span>
          </div>
        </div>
        <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
          Pastikan logo masih terbaca pada ukuran 16px. Logo dengan detail halus sebaiknya disederhanakan.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => persist({ url: config.url, version: String(Date.now()) }, 'Favicon website tersimpan')}
          disabled={!canWrite || saving || !config.url}
          className="als-press font-semibold"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          data-testid="admin-favicon-save"
        >
          {saving ? 'Menyimpan…' : 'Simpan Favicon'}
        </Button>
        <Button
          variant="outline"
          onClick={() => persist({ url: '', version: '' }, 'Favicon dikembalikan ke default ALSABBAT')}
          disabled={!canWrite || saving}
          data-testid="admin-favicon-reset"
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reset ke Favicon Default
        </Button>
      </div>
    </div>
  );
};

export default FaviconManager;
