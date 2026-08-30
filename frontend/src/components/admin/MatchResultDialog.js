import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

const selectClass = 'h-10 w-full rounded-[var(--radius-sm)] border px-2 text-sm';

/** Pertandingan yang butuh hasil: sudah lewat/hari ini, skor belum lengkap. */
export const needsResult = (match) => {
  if (!match) return false;
  if (['CANCELLED', 'POSTPONED'].includes(match.status)) return false;
  const scored = match.home_score !== null && match.home_score !== undefined
    && match.away_score !== null && match.away_score !== undefined;
  if (scored) return false;
  if (!match.date) return false;
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return new Date(`${match.date}T00:00:00`) <= today;
};

const EVENT_LABEL = {
  GOAL: 'Gol',
  OWN_GOAL: 'Gol Sendiri',
  ASSIST: 'Assist',
  PENALTY_SCORED: 'Penalti Gol',
  PENALTY_MISSED: 'Penalti Gagal',
  YELLOW_CARD: 'Kartu Kuning',
  SECOND_YELLOW_CARD: 'Kartu Kuning Kedua',
  RED_CARD: 'Kartu Merah',
  SUBSTITUTION: 'Pergantian Pemain',
  OTHER: 'Lainnya',
};

const emptyRow = () => ({
  key: Math.random().toString(36).slice(2),
  type: 'GOAL',
  side: 'CLUB',
  player_id: '',
  related_player_id: '',
  player_name: '',
  minute: '',
});

/**
 * Alur "Hasil Pertandingan" — terpisah dari form input Match.
 * Skor disimpan lewat PATCH /matches/{id}; pencetak gol, assist, kartu, dan
 * pergantian disimpan sebagai Match Events existing (POST /match-events)
 * dengan referensi `player_id` pemain AL SABBAT yang sudah terdaftar,
 * sehingga Top Scorer & statistik pemain otomatis ikut terupdate.
 */
export const MatchResultDialog = ({ open, onOpenChange, matches = [], meta, onSaved }) => {
  const [matchId, setMatchId] = useState('');
  const [clubScore, setClubScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [markFinished, setMarkFinished] = useState(true);
  const [players, setPlayers] = useState([]);
  const [existingEvents, setExistingEvents] = useState([]);
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);

  const match = useMemo(() => matches.find((m) => m.id === matchId) || null, [matches, matchId]);
  const isHome = match?.venue_type !== 'AWAY';
  const eventTypes = meta?.match_event_types || Object.keys(EVENT_LABEL);

  useEffect(() => {
    if (!open) return;
    setMatchId((prev) => (prev && matches.some((m) => m.id === prev) ? prev : matches[0]?.id || ''));
  }, [open, matches]);

  const loadContext = useCallback(async () => {
    if (!match) {
      setPlayers([]);
      setExistingEvents([]);
      return;
    }
    setClubScore('');
    setOpponentScore('');
    setRows([emptyRow()]);
    try {
      const [playerRes, eventRes] = await Promise.all([
        api.get('/players', { params: { team_id: match.team_id, status: 'ACTIVE', limit: 100 } }),
        api.get('/match-events', { params: { match_id: match.id, limit: 100 } }),
      ]);
      setPlayers(playerRes.data?.items || []);
      setExistingEvents(eventRes.data?.items || []);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Gagal memuat data pemain / kejadian.'));
    }
  }, [match]);

  useEffect(() => {
    if (open) loadContext();
  }, [open, matchId, loadContext]);

  const playerName = (id) => {
    const found = players.find((p) => p.id === id);
    return found ? found.display_name || found.full_name : null;
  };

  const save = async () => {
    if (!match) return;
    if (clubScore === '' || opponentScore === '') {
      toast.error('Isi skor AL SABBAT dan skor lawan.');
      return;
    }
    const filled = rows.filter((row) => row.player_id || row.player_name);
    setSaving(true);
    try {
      const scorePayload = {
        home_score: Number(isHome ? clubScore : opponentScore),
        away_score: Number(isHome ? opponentScore : clubScore),
      };
      if (markFinished) scorePayload.status = 'FINISHED';
      const { data } = await api.patch(`/matches/${match.id}`, scorePayload);

      for (const row of filled) {
        const payload = {
          match_id: match.id,
          team_id: match.team_id,
          side: row.side,
          type: row.type,
          minute: row.minute === '' ? null : Number(row.minute),
        };
        if (row.side === 'CLUB') {
          payload.player_id = row.player_id || null;
          if (row.related_player_id) payload.related_player_id = row.related_player_id;
        } else {
          // Pemain lawan tidak ada di database — pakai field nama existing.
          payload.player_name = row.player_name || null;
        }
        await api.post('/match-events', payload);
      }

      toast.success(
        filled.length
          ? `Hasil pertandingan & ${filled.length} kejadian tersimpan.`
          : 'Hasil pertandingan tersimpan.'
      );
      if (onSaved) onSaved(data);
      onOpenChange(false);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Gagal menyimpan hasil pertandingan.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] max-w-3xl overflow-y-auto bg-white"
        data-testid="admin-match-result-dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display">Hasil Pertandingan</DialogTitle>
          <DialogDescription>
            Isi skor dan kejadian pertandingan di sini — terpisah dari form input Match. Pencetak
            gol, assist, kartu, dan pergantian dipilih dari pemain AL SABBAT yang sudah terdaftar
            agar Top Scorer dan statistik pemain otomatis terhitung.
          </DialogDescription>
        </DialogHeader>

        {!matches.length ? (
          <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="admin-match-result-none">
            Tidak ada pertandingan yang membutuhkan hasil.
          </p>
        ) : (
          <div className="space-y-5">
            <div>
              <Label className="mb-1.5 block">Pertandingan</Label>
              <select
                value={matchId}
                onChange={(e) => setMatchId(e.target.value)}
                className={selectClass}
                style={{ borderColor: 'var(--border-soft)' }}
                data-testid="admin-match-result-match"
              >
                {matches.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.date} · {item.opponent?.name} · {item.venue_type}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="mb-1.5 block">Skor AL SABBAT</Label>
                <Input
                  type="number"
                  min={0}
                  value={clubScore}
                  onChange={(e) => setClubScore(e.target.value)}
                  placeholder="0"
                  data-testid="admin-match-result-club-score"
                />
              </div>
              <div>
                <Label className="mb-1.5 block">Skor {match?.opponent?.name || 'Lawan'}</Label>
                <Input
                  type="number"
                  min={0}
                  value={opponentScore}
                  onChange={(e) => setOpponentScore(e.target.value)}
                  placeholder="0"
                  data-testid="admin-match-result-opponent-score"
                />
              </div>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
              Laga ini {isHome ? 'HOME' : 'AWAY'} — skor otomatis dipetakan ke kolom home/away yang benar.
            </p>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={markFinished}
                onChange={(e) => setMarkFinished(e.target.checked)}
                data-testid="admin-match-result-finished"
              />
              Tandai pertandingan sebagai FINISHED
            </label>

            {existingEvents.length ? (
              <div
                className="rounded-[var(--radius-sm)] border p-3"
                style={{ borderColor: 'var(--border-soft)' }}
                data-testid="admin-match-result-existing-events"
              >
                <p className="als-section-label mb-2">Kejadian yang sudah tercatat</p>
                <div className="flex flex-wrap gap-2">
                  {existingEvents.map((event) => (
                    <Badge key={event.id} variant="outline">
                      {event.minute ? `${event.minute}' ` : ''}
                      {EVENT_LABEL[event.type] || event.type}
                      {event.player_id ? ` · ${playerName(event.player_id) || 'Pemain'}` : ''}
                      {event.player_name ? ` · ${event.player_name}` : ''}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="als-section-label">Tambah Kejadian (Match Events)</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRows((prev) => [...prev, emptyRow()])}
                  data-testid="admin-match-result-add-row"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Baris
                </Button>
              </div>

              <div className="space-y-3">
                {rows.map((row, index) => (
                  <div
                    key={row.key}
                    className="grid gap-2 rounded-[var(--radius-sm)] border p-3 sm:grid-cols-12"
                    style={{ borderColor: 'var(--border-soft)' }}
                    data-testid={`admin-match-result-row-${index}`}
                  >
                    <div className="sm:col-span-3">
                      <Label className="mb-1 block text-xs">Jenis</Label>
                      <select
                        value={row.type}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r.key === row.key ? { ...r, type: e.target.value } : r))
                          )
                        }
                        className={selectClass}
                        style={{ borderColor: 'var(--border-soft)' }}
                        data-testid={`admin-match-result-type-${index}`}
                      >
                        {eventTypes.map((type) => (
                          <option key={type} value={type}>
                            {EVENT_LABEL[type] || type}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="mb-1 block text-xs">Pihak</Label>
                      <select
                        value={row.side}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key
                                ? { ...r, side: e.target.value, player_id: '', related_player_id: '', player_name: '' }
                                : r
                            )
                          )
                        }
                        className={selectClass}
                        style={{ borderColor: 'var(--border-soft)' }}
                        data-testid={`admin-match-result-side-${index}`}
                      >
                        <option value="CLUB">AL SABBAT</option>
                        <option value="OPPONENT">Lawan</option>
                      </select>
                    </div>
                    <div className="sm:col-span-4">
                      <Label className="mb-1 block text-xs">
                        {row.side === 'CLUB' ? 'Pemain AL SABBAT' : 'Nama Pemain Lawan'}
                      </Label>
                      {row.side === 'CLUB' ? (
                        <select
                          value={row.player_id}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) => (r.key === row.key ? { ...r, player_id: e.target.value } : r))
                            )
                          }
                          className={selectClass}
                          style={{ borderColor: 'var(--border-soft)' }}
                          data-testid={`admin-match-result-player-${index}`}
                        >
                          <option value="">— pilih pemain —</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.display_name || player.full_name}
                              {player.jersey_number || player.jersey_number === 0
                                ? ` · #${player.jersey_number}`
                                : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={row.player_name}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) => (r.key === row.key ? { ...r, player_name: e.target.value } : r))
                            )
                          }
                          placeholder="Nama pemain lawan"
                          data-testid={`admin-match-result-player-name-${index}`}
                        />
                      )}
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="mb-1 block text-xs">Menit</Label>
                      <Input
                        type="number"
                        min={0}
                        max={200}
                        value={row.minute}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) => (r.key === row.key ? { ...r, minute: e.target.value } : r))
                          )
                        }
                        placeholder="45"
                        data-testid={`admin-match-result-minute-${index}`}
                      />
                    </div>
                    <div className="flex items-end sm:col-span-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setRows((prev) =>
                            prev.length > 1 ? prev.filter((r) => r.key !== row.key) : [emptyRow()]
                          )
                        }
                        data-testid={`admin-match-result-remove-${index}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    {row.side === 'CLUB' && ['SUBSTITUTION', 'GOAL', 'PENALTY_SCORED'].includes(row.type) ? (
                      <div className="sm:col-span-12">
                        <Label className="mb-1 block text-xs">
                          {row.type === 'SUBSTITUTION'
                            ? 'Pemain Masuk (opsional)'
                            : 'Assist oleh (opsional)'}
                        </Label>
                        <select
                          value={row.related_player_id}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key ? { ...r, related_player_id: e.target.value } : r
                              )
                            )
                          }
                          className={selectClass}
                          style={{ borderColor: 'var(--border-soft)' }}
                          data-testid={`admin-match-result-related-${index}`}
                        >
                          <option value="">— tidak ada —</option>
                          {players.map((player) => (
                            <option key={player.id} value={player.id}>
                              {player.display_name || player.full_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
                Baris tanpa pemain diabaikan. Kejadian assist dicatat sebagai jenis “Assist” agar
                statistik assist pemain ikut terhitung.
              </p>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
                data-testid="admin-match-result-cancel"
              >
                Batal
              </Button>
              <Button
                onClick={save}
                disabled={saving || !match}
                className="font-semibold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                data-testid="admin-match-result-save"
              >
                {saving ? <Save className="mr-2 h-4 w-4" /> : <Trophy className="mr-2 h-4 w-4" />}
                {saving ? 'Menyimpan…' : 'Simpan Hasil'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MatchResultDialog;
