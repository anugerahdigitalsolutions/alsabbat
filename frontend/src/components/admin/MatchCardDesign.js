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
  clampTransparency,
} from '../../lib/matchCardDesign';
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
      const raw = content?.data?.items?.[MATCH_CARD_TRANSPARENCY_KEY];
      setTransparency(raw === undefined || raw === null || raw === '' ? MATCH_CARD_DEFAULT_TRANSPARENCY : clampTransparency(raw));
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

  return (
    <div className="als-card p-6" data-testid="admin-match-card-design">
      <h2 className="font-display text-lg font-semibold">Desain Kartu Pertandingan</h2>
      <p className="mt-1 max-w-3xl text-sm" style={{ color: 'var(--muted-fg)' }}>
        Gambar pertandingan dipakai sebagai latar (cover), lalu dilapisi overlay & pattern warna ALSABBAT. Atur
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
                0% = warna kartu ALSABBAT paling kuat · 100% = foto pertandingan paling terlihat. Preview di samping
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
                    persist(MATCH_CARD_DEFAULT_TRANSPARENCY, 'Desain dikembalikan ke default ALSABBAT');
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
