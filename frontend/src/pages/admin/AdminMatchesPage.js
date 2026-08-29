import React, { useState } from 'react';
import { Share2, Swords } from 'lucide-react';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { MatchScoreCardGenerator } from '../../components/public/matchcenter/MatchScoreCardGenerator';
import { MatchCardDesign } from '../../components/admin/MatchCardDesign';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';
import { MEDIA_SPECS } from '../../lib/mediaHints';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminMatchesPage() {
  const { meta, club, clubName, shortName } = useClub();
  const [socialMatch, setSocialMatch] = useState(null);

  return (
    <>
    <div className="mb-6">
      <MatchCardDesign />
    </div>
    <ResourceManager
      rowActions={(row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setSocialMatch(row);
          }}
          data-testid={`admin-matches-social-${row.id}`}
        >
          <Share2 className="mr-2 h-3.5 w-3.5" />
          Kartu Sosial
        </Button>
      )}
      title="Matches"
      description="Domain utama klub. Relasi ke tim, musim, dan kompetisi sudah disiapkan untuk Match Center pada fase berikutnya."
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
          help: 'Setelah pertandingan selesai, pilih FINISHED lalu isi kedua skor di bawah. Pertandingan berstatus FINISHED (atau yang skornya sudah terisi) otomatis tidak lagi muncul sebagai "Pertandingan Berikutnya" di beranda.',
        },
        {
          name: 'home_score',
          label: 'Skor Tim Kandang (Home)',
          type: 'number',
          placeholder: '0',
          help: 'Isi angka gol tim kandang. Untuk laga AWAY, tim kandang adalah lawan.',
        },
        {
          name: 'away_score',
          label: 'Skor Tim Tandang (Away)',
          type: 'number',
          placeholder: '0',
          help: 'Isi angka gol tim tandang. Kedua skor harus diisi agar hasil tampil di website.',
        },
        { name: 'match_cover', label: 'Gambar Pertandingan', type: 'media', full: true, spec: MEDIA_SPECS.matchCover, help: 'Gambar landscape untuk kartu & halaman detail pertandingan.' },
        {
          name: 'card_feed_background',
          label: 'Background Kartu — Feed (4:5)',
          type: 'media',
          full: true,
          help: 'Khusus pertandingan ini. Kosongkan untuk memakai background global dari Pengaturan Kartu Pertandingan.',
        },
        {
          name: 'card_feed_focus_x',
          label: 'Crop Feed — Posisi Horizontal (%)',
          type: 'number',
          placeholder: '50',
          help: '0 = geser ke kiri, 50 = tengah, 100 = geser ke kanan.',
        },
        {
          name: 'card_feed_focus_y',
          label: 'Crop Feed — Posisi Vertikal (%)',
          type: 'number',
          placeholder: '50',
          help: '0 = bagian atas foto, 50 = tengah, 100 = bagian bawah.',
        },
        {
          name: 'card_feed_zoom',
          label: 'Crop Feed — Zoom (%)',
          type: 'number',
          placeholder: '100',
          help: '100 = pas menutupi kartu, maksimal 250 untuk memperbesar area crop.',
        },
        {
          name: 'card_story_background',
          label: 'Background Kartu — Story (9:16)',
          type: 'media',
          full: true,
          help: 'Khusus pertandingan ini. Kosongkan untuk memakai background global.',
        },
        {
          name: 'card_story_focus_x',
          label: 'Crop Story — Posisi Horizontal (%)',
          type: 'number',
          placeholder: '50',
        },
        {
          name: 'card_story_focus_y',
          label: 'Crop Story — Posisi Vertikal (%)',
          type: 'number',
          placeholder: '50',
        },
        {
          name: 'card_story_zoom',
          label: 'Crop Story — Zoom (%)',
          type: 'number',
          placeholder: '100',
        },
        {
          name: 'formation',
          label: 'Formasi AL SABBAT',
          type: 'text',
          placeholder: '4-3-3',
          help: 'Dipakai untuk Visual Formation di Match Center. Kosongkan bila belum ditentukan.',
        },
        { name: 'opponent_formation', label: 'Formasi Lawan', type: 'text', placeholder: '4-4-2' },
        { name: 'referee', label: 'Wasit', type: 'text' },
        { name: 'attendance', label: 'Jumlah Penonton', type: 'number' },
        { name: 'result_summary', label: 'Ringkasan Hasil', type: 'textarea', full: true },
        { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
      ]}
    />

    <Dialog open={!!socialMatch} onOpenChange={(v) => !v && setSocialMatch(null)}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto bg-white" data-testid="admin-matches-social-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Kartu Sosial Pertandingan</DialogTitle>
          <DialogDescription>
            Preview Feed 4:5 dan Story 9:16 memakai renderer yang sama dengan hasil unduhan.
          </DialogDescription>
        </DialogHeader>
        {socialMatch ? (
          <MatchScoreCardGenerator
            match={socialMatch}
            clubName={shortName || clubName}
            clubLogo={club?.logo}
            competitionName={socialMatch.competition?.name}
            seasonName={socialMatch.season?.name}
          />
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  );
}
