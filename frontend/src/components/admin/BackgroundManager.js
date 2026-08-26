import React, { useEffect, useState } from 'react';
import { Loader2, Monitor, RotateCcw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  BACKGROUND_DEFAULT,
  GRADIENT_DIRECTIONS,
  IMAGE_POSITIONS,
  IMAGE_SIZES,
  SITE_BACKGROUND_KEY,
  parseBackgroundConfig,
} from '../../lib/siteBackground';
import { SiteBackgroundLayers } from '../public/SiteBackgroundLayers';
import { MediaPicker } from '../shared/MediaPicker';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';

const TYPES = [
  { value: 'solid', label: 'Warna Tunggal' },
  { value: 'gradient', label: 'Gradasi' },
  { value: 'image', label: 'Gambar' },
];

const FieldLabel = ({ children }) => (
  <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
    {children}
  </Label>
);

const ColorField = ({ label, value, onChange, testId }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-10 w-12 cursor-pointer rounded-[var(--radius-sm)] border"
        style={{ borderColor: 'var(--border-soft)' }}
        aria-label={label}
        data-testid={`${testId}-picker`}
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="bg-white font-mono uppercase"
        data-testid={`${testId}-hex`}
      />
    </div>
  </div>
);

const OpacityField = ({ label, value, onChange, testId }) => (
  <div>
    <FieldLabel>{label}</FieldLabel>
    <div className="flex items-center gap-3">
      <Slider
        value={[Math.round((value ?? 0) * 100)]}
        min={0}
        max={100}
        step={1}
        onValueChange={(v) => onChange(v[0] / 100)}
        className="flex-1"
        data-testid={`${testId}-slider`}
      />
      <span className="w-12 text-right text-sm font-semibold tabular-nums" data-testid={`${testId}-value`}>
        {Math.round((value ?? 0) * 100)}%
      </span>
    </div>
  </div>
);

const FramePreview = ({ config, device }) => (
  <div
    className="relative mx-auto overflow-hidden rounded-[var(--radius-md)]"
    style={{
      width: device === 'mobile' ? 320 : '100%',
      height: device === 'mobile' ? 420 : 340,
      backgroundColor: '#f1f3f7',
    }}
    data-testid="admin-background-preview"
  >
    <SiteBackgroundLayers config={config} absolute />
    <div
      className="relative mx-auto flex h-full flex-col overflow-hidden"
      style={{
        margin: device === 'mobile' ? 0 : '18px 22px',
        height: device === 'mobile' ? '100%' : 'calc(100% - 36px)',
        backgroundColor: '#FEFEFE',
        borderRadius: device === 'mobile' ? 0 : 18,
        boxShadow: '0 18px 40px rgba(0,0,0,0.14)',
      }}
      data-testid="admin-background-preview-frame"
    >
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <span className="font-display text-[13px] font-extrabold" style={{ color: '#000000' }}>
          ALSABBAT
        </span>
        <span className="hidden gap-3 text-[9px] font-semibold tracking-[0.05em] sm:flex" style={{ color: 'var(--muted-fg)' }}>
          BERANDA KLUB PEMAIN PERTANDINGAN BERITA
        </span>
        <span
          className="rounded-full px-2 py-1 text-[9px] font-bold"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
        >
          LOGIN
        </span>
      </div>
      <div className="m-3 flex-1 rounded-[14px]" style={{ backgroundColor: 'var(--club-secondary)' }} />
      <div className="mx-3 mb-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-8 rounded-[10px]" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }} />
        ))}
      </div>
    </div>
  </div>
);

export const BackgroundManager = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('content:write');
  const [config, setConfig] = useState(BACKGROUND_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [device, setDevice] = useState('desktop');

  useEffect(() => {
    api
      .get('/site-content/public')
      .then(({ data }) => setConfig(parseBackgroundConfig(data?.items?.[SITE_BACKGROUND_KEY])))
      .catch((e) => toast.error(apiErrorMessage(e, 'Gagal memuat konfigurasi background')))
      .finally(() => setLoading(false));
  }, []);

  const patch = (partial) => setConfig((prev) => ({ ...prev, ...partial }));

  const save = async (next = config, message = 'Background website tersimpan') => {
    setSaving(true);
    try {
      await api.put('/site-content/bulk', {
        items: [
          {
            key: SITE_BACKGROUND_KEY,
            value: JSON.stringify(next),
            label: 'Background Website',
            group: 'Background Website',
          },
        ],
      });
      toast.success(message);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan background'));
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setConfig(BACKGROUND_DEFAULT);
    await save(BACKGROUND_DEFAULT, 'Background dikembalikan ke default ALSABBAT');
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center" data-testid="admin-background-loading">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="admin-background-page">
      <div className="als-card space-y-5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-sm font-semibold">Gunakan Background Website</p>
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
              OFF = memakai background default ALSABBAT. Background hanya tampil di area luar frame website.
            </p>
          </div>
          <Switch
            checked={!!config.enabled}
            onCheckedChange={(v) => patch({ enabled: v })}
            disabled={!canWrite}
            data-testid="admin-background-enabled"
          />
        </div>

        <div>
          <FieldLabel>Jenis Background</FieldLabel>
          <Select value={config.type} onValueChange={(v) => patch({ type: v })} disabled={!canWrite}>
            <SelectTrigger className="bg-white" data-testid="admin-background-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {config.type === 'solid' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Warna Background"
              value={config.color}
              onChange={(v) => patch({ color: v })}
              testId="admin-background-color"
            />
            <OpacityField
              label="Transparansi"
              value={config.opacity}
              onChange={(v) => patch({ opacity: v })}
              testId="admin-background-opacity"
            />
          </div>
        ) : null}

        {config.type === 'gradient' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Warna 1"
              value={config.gradient.color1}
              onChange={(v) => patch({ gradient: { ...config.gradient, color1: v } })}
              testId="admin-background-gradient1"
            />
            <ColorField
              label="Warna 2"
              value={config.gradient.color2}
              onChange={(v) => patch({ gradient: { ...config.gradient, color2: v } })}
              testId="admin-background-gradient2"
            />
            <div>
              <FieldLabel>Arah Gradasi</FieldLabel>
              <Select
                value={config.gradient.direction}
                onValueChange={(v) => patch({ gradient: { ...config.gradient, direction: v } })}
                disabled={!canWrite}
              >
                <SelectTrigger className="bg-white" data-testid="admin-background-gradient-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADIENT_DIRECTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <OpacityField
              label="Transparansi"
              value={config.opacity}
              onChange={(v) => patch({ opacity: v })}
              testId="admin-background-gradient-opacity"
            />
          </div>
        ) : null}

        {config.type === 'image' ? (
          <div className="space-y-4">
            <div>
              <FieldLabel>Gambar Background</FieldLabel>
              <MediaPicker
                value={config.image_url || ''}
                onChange={(v) => patch({ image_url: v || '' })}
                testId="admin-background-image"
                hint="Upload dari perangkat atau pilih dari Media Library. Gambar besar (≥1920px) membuat latar tetap tajam di desktop."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Ukuran Gambar</FieldLabel>
                <Select value={config.image_size} onValueChange={(v) => patch({ image_size: v })} disabled={!canWrite}>
                  <SelectTrigger className="bg-white" data-testid="admin-background-image-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_SIZES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <FieldLabel>Posisi Gambar</FieldLabel>
                <Select
                  value={config.image_position}
                  onValueChange={(v) => patch({ image_position: v })}
                  disabled={!canWrite}
                >
                  <SelectTrigger className="bg-white" data-testid="admin-background-image-position">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IMAGE_POSITIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <OpacityField
              label="Transparansi Gambar"
              value={config.opacity}
              onChange={(v) => patch({ opacity: v })}
              testId="admin-background-image-opacity"
            />
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-display text-sm font-semibold">Overlay</p>
                <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                  Lapisan warna sangat tipis di atas gambar untuk menjaga keterbacaan.
                </p>
              </div>
              <Switch
                checked={!!config.overlay_enabled}
                onCheckedChange={(v) => patch({ overlay_enabled: v })}
                disabled={!canWrite}
                data-testid="admin-background-overlay-enabled"
              />
            </div>
            {config.overlay_enabled ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <ColorField
                  label="Warna Overlay"
                  value={config.overlay_color}
                  onChange={(v) => patch({ overlay_color: v })}
                  testId="admin-background-overlay-color"
                />
                <OpacityField
                  label="Transparansi Overlay"
                  value={config.overlay_opacity}
                  onChange={(v) => patch({ overlay_opacity: v })}
                  testId="admin-background-overlay-opacity"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="als-card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-sm font-semibold">Preview Live</p>
          <div className="flex gap-2">
            <Button
              variant={device === 'desktop' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevice('desktop')}
              data-testid="admin-background-preview-desktop"
            >
              <Monitor className="mr-2 h-3.5 w-3.5" />
              Desktop
            </Button>
            <Button
              variant={device === 'mobile' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDevice('mobile')}
              data-testid="admin-background-preview-mobile"
            >
              <Smartphone className="mr-2 h-3.5 w-3.5" />
              Mobile
            </Button>
          </div>
        </div>
        <FramePreview config={config} device={device} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => save()}
          disabled={!canWrite || saving}
          className="als-press font-semibold"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          data-testid="admin-background-save"
        >
          {saving ? 'Menyimpan…' : 'Simpan Background'}
        </Button>
        <Button variant="outline" onClick={reset} disabled={!canWrite || saving} data-testid="admin-background-reset">
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reset ke Default
        </Button>
      </div>
    </div>
  );
};

export default BackgroundManager;
