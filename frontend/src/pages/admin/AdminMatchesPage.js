import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image as ImageIcon, Swords, Trophy } from 'lucide-react';
import api from '../../lib/api';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { MatchScoreCardGenerator } from '../../components/public/matchcenter/MatchScoreCardGenerator';
import { MatchCardSettings } from '../../components/admin/MatchCardSettings';
import { MatchResultDialog, needsResult } from '../../components/admin/MatchResultDialog';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';
import { MEDIA_SPECS } from '../../lib/mediaHints';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

const hasScore = (match) => match?.home_score !== null && match?.home_score !== undefined;

export default function AdminMatchesPage() {
  const { meta, club, clubName, shortName } = useClub();
  const [cardMatch, setCardMatch] = useState(null);
  const [cardKind, setCardKind] = useState('fixture');
  // Pencetak gol Kartu Hasil: dibaca dari Match Events existing (tanpa API baru).
  const [cardEvents, setCardEvents] = useState([]);
  const [cardPlayers, setCardPlayers] = useState({});
  const [resultOpen, setResultOpen] = useState(false);
  const [pending, setPending] = useState([]);
  const [listKey, setListKey] = useState(0);

  // Daftar pertandingan yang membutuhkan hasil — menentukan apakah shortcut
  // "Hasil Pertandingan" ditampilkan (tidak pernah tampil permanen).
  const loadPending = useCallback(async () => {
    try {
      const { data } = await api.get('/matches', { params: { limit: 100 } });
      const items = (data?.items || []).filter(needsResult);
      items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
      setPending(items);
    } catch {
      setPending([]);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  // Dipakai setelah simpan hasil/desain kartu dari luar tabel: muat ulang daftar.
  useEffect(() => {
    if (!cardMatch?.id) {
      setCardEvents([]);
      setCardPlayers({});
      return;
    }
    let active = true;
    (async () => {
      try {
        const [eventRes, playerRes] = await Promise.all([
          api.get('/match-events', { params: { match_id: cardMatch.id, limit: 100 } }),
          api.get('/players', { params: { team_id: cardMatch.team_id, limit: 100 } }),
        ]);
        if (!active) return;
        setCardEvents(eventRes.data?.items || []);
        const map = {};
        (playerRes.data?.items || []).forEach((player) => {
          map[player.id] = player;
        });
        setCardPlayers(map);
      } catch {
        if (active) {
          setCardEvents([]);
          setCardPlayers({});
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [cardMatch?.id, cardMatch?.team_id]);

  const afterChange = useCallback(() => {
    setListKey((k) => k + 1);
    loadPending();
  }, [loadPending]);

  const extraActions = useMemo(
    () =>
      pending.length ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setResultOpen(true)}
          data-testid="admin-matches-result-button"
        >
          <Trophy className="mr-2 h-3.5 w-3.5" />
          Hasil Pertandingan ({pending.length})
        </Button>
      ) : null,
    [pending.length]
  );

  return (
    <>
      <ResourceManager
        key={listKey}
        extraActions={extraActions}
        onChanged={loadPending}
        rowActions={(row) => (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setCardKind('fixture');
              setCardMatch(row);
            }}
            data-testid={`admin-matches-card-${row.id}`}
          >
            <ImageIcon className="mr-2 h-3.5 w-3.5" />
            Kartu Pertandingan
          </Button>
        )}
        title="Matches"
        description="Input jadwal & informasi pertandingan. Hasil pertandingan diisi melalui tombol “Hasil Pertandingan”, desain kartu melalui aksi “Kartu Pertandingan” pada setiap baris."
        endpoint="/matches"
        writePermission="match:write"
        testPrefix="admin-matches"
        emptyIcon={Swords}
        emptyTitle="Belum ada jadwal pertandingan"
        emptyDescription="Buat pertandingan untuk musim ini."
        defaults={{ venue_type: 'HOME', status: 'SCHEDULED' }}
        filters={[
          { name: 'team_id', label: 'Tim', optionsFrom: { endpoint: '/teams', labelKey: 'name' } },
          { name: 'season_id', label: 'Musim', optionsFrom: { endpoint: '/seasons', labelKey: 'name' } },
          { name: 'competition_id', label: 'Kompetisi', optionsFrom: { endpoint: '/competitions', labelKey: 'name' } },
          { name: 'status', label: 'Status', options: opts(meta?.match_status) },
        ]}
        columns={[
          { key: 'date', label: 'Tanggal' },
          { key: 'opponent.name', label: 'Lawan' },
          {
            key: 'venue_type',
            label: 'H/A',
            render: (r) => <Badge variant="outline">{r.venue_type}</Badge>,
          },
          {
            key: 'score',
            label: 'Skor',
            render: (r) =>
              r.home_score === null || r.home_score === undefined ? '—' : `${r.home_score} - ${r.away_score ?? 0}`,
          },
          { key: 'venue', label: 'Venue' },
          { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
        ]}
        fields={[
          {
            name: 'team_id',
            label: 'Tim AL SABBAT',
            type: 'select',
            required: true,
            optionsFrom: { endpoint: '/teams', labelKey: 'name' },
          },
          { name: 'opponent.name', label: 'Nama Lawan', type: 'text', required: true },
          { name: 'opponent.short_name', label: 'Short Name Lawan', type: 'text' },
          { name: 'opponent.logo', label: 'Logo Lawan', type: 'media', full: true, spec: MEDIA_SPECS.opponentLogo },
          {
            name: 'season_id',
            label: 'Musim',
            type: 'select',
            optionsFrom: { endpoint: '/seasons', labelKey: 'name' },
          },
          {
            name: 'competition_id',
            label: 'Kompetisi',
            type: 'select',
            optionsFrom: { endpoint: '/competitions', labelKey: 'name' },
          },
          { name: 'date', label: 'Tanggal Pertandingan', type: 'date', required: true },
          {
            name: 'time',
            label: 'Waktu Pertandingan (WIB)',
            type: 'time',
            help: 'Format 24 jam, contoh 19:30. Dipakai untuk countdown realtime (zona waktu WIB / Asia/Jakarta).',
          },
          { name: 'venue', label: 'Venue', type: 'text' },
          { name: 'venue_type', label: 'Home / Away', type: 'select', options: opts(meta?.match_venue_types), required: true },
          {
            name: 'status',
            label: 'Status Pertandingan',
            type: 'select',
            options: opts(meta?.match_status),
            required: true,
            help: 'Skor tidak lagi diisi di sini. Setelah pertandingan selesai, gunakan tombol “Hasil Pertandingan” di atas daftar untuk mengisi skor & kejadian pertandingan.',
          },
          { name: 'match_cover', label: 'Gambar Pertandingan', type: 'media', full: true, spec: MEDIA_SPECS.matchCover, help: 'Gambar landscape untuk kartu & halaman detail pertandingan.' },
          {
            name: 'formation',
            label: 'Formasi AL SABBAT',
            type: 'text',
            placeholder: '4-3-3',
            help: 'Tampil sebagai informasi pertandingan di Match Center.',
          },
          { name: 'opponent_formation', label: 'Formasi Lawan', type: 'text', placeholder: '4-4-2' },
          { name: 'referee', label: 'Wasit', type: 'text' },
          { name: 'attendance', label: 'Jumlah Penonton', type: 'number' },
          { name: 'result_summary', label: 'Ringkasan Hasil', type: 'textarea', full: true },
          { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
        ]}
      />

      {/* Kartu Pertandingan per Match: desain khusus match ini + preview/unduh/bagikan */}
      <Dialog open={!!cardMatch} onOpenChange={(v) => !v && setCardMatch(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto bg-white" data-testid="admin-matches-card-dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Kartu Pertandingan</DialogTitle>
            <DialogDescription>
              Dua jenis kartu dengan background sendiri-sendiri: Kartu Pertandingan (pengumuman
              jadwal, tanpa skor) dan Kartu Hasil (skor + status SELESAI). Atur Feed 4:5 &amp; Story
              9:16 masing-masing — termasuk overlay, gradient, opacity, zoom logo, dan sponsor —
              lalu preview, unduh, atau bagikan. Seluruh pengaturan hanya berlaku untuk kartu ini.
            </DialogDescription>
          </DialogHeader>
          {cardMatch ? (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2" data-testid="admin-matches-card-kind-switch">
                <Button
                  size="sm"
                  variant={cardKind === 'fixture' ? 'default' : 'outline'}
                  onClick={() => setCardKind('fixture')}
                  style={cardKind === 'fixture' ? { backgroundColor: 'var(--club-secondary)', color: '#FEFEFE' } : undefined}
                  data-testid="admin-matches-card-kind-fixture"
                >
                  Kartu Pertandingan
                </Button>
                <Button
                  size="sm"
                  variant={cardKind === 'result' ? 'default' : 'outline'}
                  onClick={() => setCardKind('result')}
                  style={cardKind === 'result' ? { backgroundColor: 'var(--club-secondary)', color: '#FEFEFE' } : undefined}
                  data-testid="admin-matches-card-kind-result"
                >
                  Kartu Hasil
                </Button>
              </div>

              {cardKind === 'result' && !hasScore(cardMatch) ? (
                <p
                  className="rounded-[var(--radius-sm)] p-3 text-sm"
                  style={{ backgroundColor: 'rgba(1,40,145,0.06)', color: 'var(--muted-fg)' }}
                  data-testid="admin-matches-card-result-locked"
                >
                  Kartu Hasil tersedia setelah hasil pertandingan diisi lewat tombol “Hasil
                  Pertandingan”. Desain Kartu Hasil tetap bisa disiapkan lebih dulu di bawah.
                </p>
              ) : null}

              <MatchCardSettings
                key={cardKind}
                match={cardMatch}
                prefix={cardKind === 'result' ? 'result_card' : 'card'}
                title={cardKind === 'result' ? 'Desain Kartu Hasil Pertandingan Ini' : 'Desain Kartu Pertandingan Ini'}
                onChange={(patch) => setCardMatch((prev) => ({ ...prev, ...patch }))}
                onSaved={(updated) => {
                  setCardMatch((prev) => ({ ...prev, ...updated }));
                  afterChange();
                }}
              />
              {cardKind === 'result' && !hasScore(cardMatch) ? null : (
                <MatchScoreCardGenerator
                  match={cardMatch}
                  kind={cardKind}
                  events={cardEvents}
                  playersById={cardPlayers}
                  clubName={shortName || clubName}
                  clubLogo={club?.logo}
                  competitionName={cardMatch.competition?.name}
                  seasonName={cardMatch.season?.name}
                />
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Desain Kartu Global disembunyikan: seluruh desain kartu kini per Match. */}

      <MatchResultDialog
        open={resultOpen}
        onOpenChange={setResultOpen}
        matches={pending}
        meta={meta}
        onSaved={afterChange}
      />
    </>
  );
}
