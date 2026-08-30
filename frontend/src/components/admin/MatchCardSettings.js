import React, { useEffect, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { MediaPicker } from '../shared/MediaPicker';
import { MEDIA_SPECS } from '../../lib/mediaHints';

const DEFAULTS = { focus_x: 50, focus_y: 50, zoom: 100 };

const num = (value, fallback) => {
  if (value === null || value === undefined || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const RangeRow = ({ id, label, value, min, max, onChange, testId, hint }) => (
  <div>
    <div className="mb-1 flex items-center justify-between">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <span className="text-xs font-bold tabular-nums" data-testid={`${testId}-value`}>
        {value}%
      </span>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={1}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
      data-testid={testId}
    />
    {hint ? (
      <p className="mt-1 text-[11px]" style={{ color: 'var(--muted-fg)' }}>
        {hint}
      </p>
    ) : null}
  </div>
);

/**
 * Pengaturan Kartu Pertandingan per Match (Feed 4:5 & Story 9:16).
 * Memakai MediaPicker + cropper existing dan endpoint PATCH /matches/{id} —
 * tidak ada uploader, cropper, atau sistem media baru.
 */
export const MatchCardSettings = ({ match, onChange, onSaved, prefix = 'card', title }) => {
  // `prefix` menentukan set field yang diatur: 'card' (Kartu Pertandingan) atau
  // 'result_card' (Kartu Hasil) — sepenuhnya independen satu sama lain.
  const field = (ratio, key) => `${prefix}_${ratio}_${key}`;
  const [feedBackground, setFeedBackground] = useState('');
  const [storyBackground, setStoryBackground] = useState('');
  const [feedCrop, setFeedCrop] = useState(DEFAULTS);
  const [storyCrop, setStoryCrop] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!match) return;
    setFeedBackground(match[`${prefix}_feed_background`] || '');
    setStoryBackground(match[`${prefix}_story_background`] || '');
    setFeedCrop({
      focus_x: num(match[`${prefix}_feed_focus_x`], DEFAULTS.focus_x),
      focus_y: num(match[`${prefix}_feed_focus_y`], DEFAULTS.focus_y),
      zoom: num(match[`${prefix}_feed_zoom`], DEFAULTS.zoom),
    });
    setStoryCrop({
      focus_x: num(match[`${prefix}_story_focus_x`], DEFAULTS.focus_x),
      focus_y: num(match[`${prefix}_story_focus_y`], DEFAULTS.focus_y),
      zoom: num(match[`${prefix}_story_zoom`], DEFAULTS.zoom),
    });
  }, [match, prefix]);

  // Preview kartu (renderer publik) mengikuti perubahan sebelum disimpan.
  const push = (patch) => {
    if (onChange) onChange(patch);
  };

  // Hanya field milik kartu yang sedang diatur yang dikirim → kartu lainnya aman.
  const payloadFrom = (feedBg, storyBg, feed, story) => ({
    [field('feed', 'background')]: feedBg || '',
    [field('feed', 'focus_x')]: feed.focus_x,
    [field('feed', 'focus_y')]: feed.focus_y,
    [field('feed', 'zoom')]: feed.zoom,
    [field('story', 'background')]: storyBg || '',
    [field('story', 'focus_x')]: story.focus_x,
    [field('story', 'focus_y')]: story.focus_y,
    [field('story', 'zoom')]: story.zoom,
  });

  const save = async () => {
    if (!match?.id) return;
    setSaving(true);
    try {
      const payload = payloadFrom(feedBackground, storyBackground, feedCrop, storyCrop);
      const { data } = await api.patch(`/matches/${match.id}`, payload);
      toast.success(
        prefix === 'result_card'
          ? 'Desain Kartu Hasil disimpan (Kartu Pertandingan tidak berubah).'
          : 'Desain Kartu Pertandingan disimpan (Kartu Hasil tidak berubah).'
      );
      if (onSaved) onSaved(data);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Gagal menyimpan pengaturan kartu.'));
    } finally {
      setSaving(false);
    }
  };

  const resetToGlobal = () => {
    setFeedBackground('');
    setStoryBackground('');
    setFeedCrop(DEFAULTS);
    setStoryCrop(DEFAULTS);
    push(payloadFrom('', '', DEFAULTS, DEFAULTS));
  };

  if (!match) return null;

  return (
    <div className="als-card p-4 sm:p-5" data-testid={`admin-match-card-settings-${prefix}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="als-section-label">{title || 'Desain Kartu Pertandingan Ini'}</p>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
            Background Feed dan Story boleh berbeda dan hanya berlaku untuk kartu ini. Kosongkan
            untuk memakai background global; overlay, opacity, zoom logo, dan sponsor mengikuti
            Desain Kartu Global.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetToGlobal}
            disabled={saving}
            data-testid={`admin-match-card-settings-${prefix}-reset`}
          >
            <RotateCcw className="mr-2 h-3.5 w-3.5" />
            Pakai Global
          </Button>
          <Button
            size="sm"
            onClick={save}
            disabled={saving}
            className="font-semibold"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            data-testid={`admin-match-card-settings-${prefix}-save`}
          >
            <Save className="mr-2 h-3.5 w-3.5" />
            {saving ? 'Menyimpan…' : 'Simpan Desain'}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="als-section-label">Background Feed · 4:5</p>
          <MediaPicker
            value={feedBackground}
            onChange={(url) => {
              setFeedBackground(url || '');
              push({ [field('feed', 'background')]: url || '' });
            }}
            spec={MEDIA_SPECS.matchCardFeed}
            testId={`admin-match-card-settings-${prefix}-feed-bg`}
          />
          <RangeRow
            id={`match-card-${prefix}-feed-focus-x`}
            label="Posisi Horizontal"
            value={feedCrop.focus_x}
            min={0}
            max={100}
            testId={`admin-match-card-settings-${prefix}-feed-focus-x`}
            onChange={(v) => {
              setFeedCrop((c) => ({ ...c, focus_x: v }));
              push({ [field('feed', 'focus_x')]: v });
            }}
          />
          <RangeRow
            id={`match-card-${prefix}-feed-focus-y`}
            label="Posisi Vertikal"
            value={feedCrop.focus_y}
            min={0}
            max={100}
            testId={`admin-match-card-settings-${prefix}-feed-focus-y`}
            onChange={(v) => {
              setFeedCrop((c) => ({ ...c, focus_y: v }));
              push({ [field('feed', 'focus_y')]: v });
            }}
          />
          <RangeRow
            id={`match-card-${prefix}-feed-zoom`}
            label="Zoom Background"
            value={feedCrop.zoom}
            min={100}
            max={250}
            testId={`admin-match-card-settings-${prefix}-feed-zoom`}
            onChange={(v) => {
              setFeedCrop((c) => ({ ...c, zoom: v }));
              push({ [field('feed', 'zoom')]: v });
            }}
          />
        </div>

        <div className="space-y-3">
          <p className="als-section-label">Background Story · 9:16</p>
          <MediaPicker
            value={storyBackground}
            onChange={(url) => {
              setStoryBackground(url || '');
              push({ [field('story', 'background')]: url || '' });
            }}
            spec={MEDIA_SPECS.matchCardStory}
            testId={`admin-match-card-settings-${prefix}-story-bg`}
          />
          <RangeRow
            id={`match-card-${prefix}-story-focus-x`}
            label="Posisi Horizontal"
            value={storyCrop.focus_x}
            min={0}
            max={100}
            testId={`admin-match-card-settings-${prefix}-story-focus-x`}
            onChange={(v) => {
              setStoryCrop((c) => ({ ...c, focus_x: v }));
              push({ [field('story', 'focus_x')]: v });
            }}
          />
          <RangeRow
            id={`match-card-${prefix}-story-focus-y`}
            label="Posisi Vertikal"
            value={storyCrop.focus_y}
            min={0}
            max={100}
            testId={`admin-match-card-settings-${prefix}-story-focus-y`}
            onChange={(v) => {
              setStoryCrop((c) => ({ ...c, focus_y: v }));
              push({ [field('story', 'focus_y')]: v });
            }}
          />
          <RangeRow
            id={`match-card-${prefix}-story-zoom`}
            label="Zoom Background"
            value={storyCrop.zoom}
            min={100}
            max={250}
            testId={`admin-match-card-settings-${prefix}-story-zoom`}
            onChange={(v) => {
              setStoryCrop((c) => ({ ...c, zoom: v }));
              push({ [field('story', 'zoom')]: v });
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MatchCardSettings;
