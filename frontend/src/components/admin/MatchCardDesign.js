import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useClub } from '../../context/ClubContext';
import { MatchScoreCardGenerator } from '../public/matchcenter/MatchScoreCardGenerator';
import {
  MATCH_CARD_TRANSPARENCY_KEY,
  MATCH_CARD_DEFAULT_TRANSPARENCY,
  MATCH_CARD_KEYS,
  MATCH_CARD_DEFAULTS,
  LOGO_ZOOM_MIN,
  LOGO_ZOOM_MAX,
  clampTransparency,
  clampPercent,
  clampLogoZoom,
} from '../../lib/matchCardDesign';
import { MediaPicker } from '../shared/MediaPicker';
import { Button } from '../ui/button';
import { Slider } from '../ui/slider';

/**
 * Admin: desain Kartu Pertandingan (Feed 4:5 & Story 9:16).
 * Preview memakai renderer yang sama dengan output final (MatchScoreCardGenerator).
 */
export const MatchCardDesign = () => {
  const { hasPermission } = useAuth();
  const { club, clubName, shortName } = useClub();
  const canWrite = hasPermission('content:write');

  const [transparency, setTransparency] = useState(MATCH_CARD_DEFAULT_TRANSPARENCY);
  const [feedBackground, setFeedBackground] = useState('');
  const [storyBackground, setStoryBackground] = useState('');
  const [overlayEnabled, setOverlayEnabled] = useState(MATCH_CARD_DEFAULTS.overlayEnabled);
  const [overlayColor, setOverlayColor] = useState(MATCH_CARD_DEFAULTS.overlayColor);
  const [overlayOpacity, setOverlayOpacity] = useState(MATCH_CARD_DEFAULTS.overlayOpacity);
  const [logoZoom, setLogoZoom] = useState(MATCH_CARD_DEFAULTS.logoZoom);
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [content, matches] = await Promise.all([
        api.get('/site-content/public'),
        api.get('/matches', { params: { limit: 1 } }),
      ]);
      const items = content?.data?.items || {};
      const raw = items[MATCH_CARD_TRANSPARENCY_KEY];
      setTransparency(raw === undefined || raw === null || raw === '' ? MATCH_CARD_DEFAULT_TRANSPARENCY : clampTransparency(raw));
      setFeedBackground(String(items[MATCH_CARD_KEYS.feedBackground] || '').trim());
      setStoryBackground(String(items[MATCH_CARD_KEYS.storyBackground] || '').trim());
      const enabledRaw = items[MATCH_CARD_KEYS.overlayEnabled];
      setOverlayEnabled(
        enabledRaw === undefined || enabledRaw === null || enabledRaw === ''
          ? MATCH_CARD_DEFAULTS.overlayEnabled
          : String(enabledRaw).trim().toLowerCase() === 'true',
      );
      setOverlayColor(String(items[MATCH_CARD_KEYS.overlayColor] || '').trim() || MATCH_CARD_DEFAULTS.overlayColor);
      setOverlayOpacity(clampPercent(items[MATCH_CARD_KEYS.overlayOpacity], MATCH_CARD_DEFAULTS.overlayOpacity));
      setLogoZoom(clampLogoZoom(items[MATCH_CARD_KEYS.logoZoom]));
      setMatch(matches?.data?.items?.[0] || null);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat desain kartu pertandingan'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (value, message) => {
    setSaving(true);
    try {
      await api.put('/site-content/bulk', {
        items: [
          {
            key: MATCH_CARD_TRANSPARENCY_KEY,
            value: String(value),
            label: 'Transparansi Overlay Kartu Pertandingan (%)',
            group: 'Kartu Pertandingan',
          },
        ],
      });
      setTransparency(value);
      toast.success(message);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan desain kartu pertandingan'));
    } finally {
      setSaving(false);
    }
  };

  const persistDesign = async () => {
    setSaving(true);
    try {
      await api.put('/site-content/bulk', {
        items: [
          { key: MATCH_CARD_KEYS.feedBackground, value: String(feedBackground || '').trim(), label: 'Background Kartu — Feed', group: 'Kartu Pertandingan' },
          { key: MATCH_CARD_KEYS.storyBackground, value: String(storyBackground || '').trim(), label: 'Background Kartu — Story', group: 'Kartu Pertandingan' },
          { key: MATCH_CARD_KEYS.overlayEnabled, value: overlayEnabled ? 'true' : 'false', label: 'Overlay Kartu — Aktif', group: 'Kartu Pertandingan' },
          { key: MATCH_CARD_KEYS.overlayColor, value: String(overlayColor || MATCH_CARD_DEFAULTS.overlayColor), label: 'Overlay Kartu — Warna', group: 'Kartu Pertandingan' },
          { key: MATCH_CARD_KEYS.overlayOpacity, value: String(overlayOpacity), label: 'Overlay Kartu — Opacity (%)', group: 'Kartu Pertandingan' },
          { key: MATCH_CARD_KEYS.logoZoom, value: String(logoZoom), label: 'Zoom Logo Kartu (%)', group: 'Kartu Pertandingan' },
        ],
      });
      toast.success('Background, overlay & zoom logo tersimpan');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan desain kartu pertandingan'));
    } finally {
      setSaving(false);
    }
  };

  const resetDesign = () => {
    setFeedBackground('');
    setStoryBackground('');
    setOverlayEnabled(MATCH_CARD_DEFAULTS.overlayEnabled);
    setOverlayColor(MATCH_CARD_DEFAULTS.overlayColor);
    setOverlayOpacity(MATCH_CARD_DEFAULTS.overlayOpacity);
    setLogoZoom(MATCH_CARD_DEFAULTS.logoZoom);
  };

  const designOverride = {
    feedBackground,
    storyBackground,
    overlayEnabled,
    overlayColor,
    overlayOpacity,
    logoZoom,
  };

  return (
    <div className="als-card p-6" data-testid="admin-match-card-design">
      <h2 className="font-display text-lg font-semibold">Desain Kartu Pertandingan</h2>
      <p className="mt-1 max-w-3xl text-sm" style={{ color: 'var(--muted-fg)' }}>
        Gambar pertandingan dipakai sebagai latar (cover), lalu dilapisi overlay & pattern warna AL SABBAT. Atur
        transparansi overlay di bawah: makin tinggi persentasenya, foto pertandingan makin terlihat; makin rendah, warna
        kartu makin kuat. Logo tim selalu dimuat penuh (contain) sehingga tidak pernah terpotong.
      </p>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold" htmlFor="match-card-transparency">
                  Transparansi Overlay
                </label>
                <span
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: 'var(--club-secondary)' }}
                  data-testid="admin-match-card-transparency-value"
                >
                  {transparency}%
                </span>
              </div>
              <Slider
                id="match-card-transparency"
                className="mt-3"
                value={[transparency]}
                min={0}
                max={100}
                step={5}
                onValueChange={(v) => setTransparency(clampTransparency(v?.[0]))}
                disabled={!canWrite}
                data-testid="admin-match-card-transparency"
              />
              <p className="mt-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
                0% = warna kartu AL SABBAT paling kuat · 100% = foto pertandingan paling terlihat. Preview di samping
                berubah realtime tanpa perlu menyimpan.
              </p>
            </div>

            {canWrite ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => persist(transparency, 'Desain kartu pertandingan tersimpan')}
                  disabled={saving}
                  className="font-semibold"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid="admin-match-card-save"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Simpan Desain
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTransparency(MATCH_CARD_DEFAULT_TRANSPARENCY);
                    persist(MATCH_CARD_DEFAULT_TRANSPARENCY, 'Desain dikembalikan ke default AL SABBAT');
                  }}
                  disabled={saving}
                  data-testid="admin-match-card-reset"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset ke Desain Default
                </Button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                Anda tidak memiliki izin mengubah desain kartu pertandingan.
              </p>
            )}
          </div>

          {/* Background per rasio + overlay + zoom logo (memakai media LOCAL existing) */}
          <div className="mb-6 grid gap-5 lg:grid-cols-2" data-testid="admin-match-card-backgrounds">
            <div>
              <p className="als-section-label mb-2">Background Feed · 4:5</p>
              <MediaPicker
                value={feedBackground}
                onChange={setFeedBackground}
                testId="admin-match-card-feed-bg"
              />
              <p className="mt-1.5 text-xs" style={{ color: 'var(--muted-fg)' }}>
                Kosongkan untuk memakai desain default (foto pertandingan + warna klub).
              </p>
            </div>
            <div>
              <p className="als-section-label mb-2">Background Story · 9:16</p>
              <MediaPicker
                value={storyBackground}
                onChange={setStoryBackground}
                testId="admin-match-card-story-bg"
              />
              <p className="mt-1.5 text-xs" style={{ color: 'var(--muted-fg)' }}>
                Feed dan Story bisa memakai gambar berbeda.
              </p>
            </div>
          </div>

          <div className="mb-6 rounded-[var(--radius-sm)] p-4" style={{ backgroundColor: 'rgba(1,40,145,0.04)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="als-section-label">Overlay di atas background custom</p>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={overlayEnabled}
                  onChange={(e) => setOverlayEnabled(e.target.checked)}
                  disabled={!canWrite}
                  data-testid="admin-match-card-overlay-enabled"
                />
                {overlayEnabled ? 'Aktif' : 'Nonaktif'}
              </label>
            </div>

            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold" htmlFor="match-card-overlay-color">
                  Warna overlay
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="match-card-overlay-color"
                    type="color"
                    value={overlayColor}
                    onChange={(e) => setOverlayColor(e.target.value)}
                    disabled={!canWrite || !overlayEnabled}
                    className="h-10 w-14 cursor-pointer rounded border"
                    data-testid="admin-match-card-overlay-color"
                  />
                  <span className="font-mono text-xs uppercase" style={{ color: 'var(--muted-fg)' }}>
                    {overlayColor}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold" htmlFor="match-card-overlay-opacity">
                    Opacity overlay
                  </label>
                  <span className="text-sm font-bold" data-testid="admin-match-card-overlay-opacity-value">
                    {overlayOpacity}%
                  </span>
                </div>
                <Slider
                  id="match-card-overlay-opacity"
                  className="mt-3"
                  min={0}
                  max={100}
                  step={1}
                  value={[overlayOpacity]}
                  onValueChange={(v) => setOverlayOpacity(clampPercent(v?.[0], MATCH_CARD_DEFAULTS.overlayOpacity))}
                  disabled={!canWrite || !overlayEnabled}
                  data-testid="admin-match-card-overlay-opacity"
                />
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold" htmlFor="match-card-logo-zoom">
                  Zoom logo / crest
                </label>
                <span className="text-sm font-bold" data-testid="admin-match-card-logo-zoom-value">
                  {logoZoom}%
                </span>
              </div>
              <Slider
                id="match-card-logo-zoom"
                className="mt-3"
                min={LOGO_ZOOM_MIN}
                max={LOGO_ZOOM_MAX}
                step={1}
                value={[logoZoom]}
                onValueChange={(v) => setLogoZoom(clampLogoZoom(v?.[0]))}
                disabled={!canWrite}
                data-testid="admin-match-card-logo-zoom"
              />
              <p className="mt-1.5 text-xs" style={{ color: 'var(--muted-fg)' }}>
                Logo selalu ditampilkan utuh (contain) dan tidak pernah terpotong — zoom hanya mengubah besarnya di
                dalam kotak logo, dan otomatis dibatasi agar tidak keluar area.
              </p>
            </div>

            {canWrite ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={persistDesign}
                  disabled={saving}
                  className="font-display"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid="admin-match-card-design-save"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Simpan Background & Overlay
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetDesign}
                  disabled={saving}
                  data-testid="admin-match-card-design-reset"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Kembalikan Default
                </Button>
              </div>
            ) : null}
          </div>

          {match ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="als-section-label">Preview Feed · 4:5</p>
                <div className="mt-2">
                  <MatchScoreCardGenerator
                    match={match}
                    clubName={shortName || clubName}
                    clubLogo={club?.logo}
                    competitionName={match.competition?.name}
                    seasonName={match.season?.name}
                    transparencyOverride={transparency}
                    designOverride={designOverride}
                    fixedRatio="feed"
                    bare
                  />
                </div>
              </div>
              <div>
                <p className="als-section-label">Preview Story · 9:16</p>
                <div className="mt-2">
                  <MatchScoreCardGenerator
                    match={match}
                    clubName={shortName || clubName}
                    clubLogo={club?.logo}
                    competitionName={match.competition?.name}
                    seasonName={match.season?.name}
                    transparencyOverride={transparency}
                    designOverride={designOverride}
                    fixedRatio="story"
                    bare
                  />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="admin-match-card-no-match">
              Tambahkan minimal satu pertandingan untuk melihat preview kartu.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default MatchCardDesign;
