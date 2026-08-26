import React from 'react';
import { Swords } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';
import { MEDIA_SPECS } from '../../lib/mediaHints';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminMatchesPage() {
  const { meta } = useClub();

  return (
    <ResourceManager
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
          label: 'Tim ALSABBAT',
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
        { name: 'time', label: 'Waktu', type: 'text', placeholder: '19:30' },
        { name: 'venue', label: 'Venue', type: 'text' },
        { name: 'venue_type', label: 'Home / Away', type: 'select', options: opts(meta?.match_venue_types), required: true },
        { name: 'status', label: 'Status', type: 'select', options: opts(meta?.match_status), required: true },
        { name: 'home_score', label: 'Skor Home', type: 'number' },
        { name: 'away_score', label: 'Skor Away', type: 'number' },
        { name: 'match_cover', label: 'Gambar Pertandingan', type: 'media', full: true, spec: MEDIA_SPECS.matchCover, help: 'Gambar landscape untuk kartu & halaman detail pertandingan.' },
        {
          name: 'formation',
          label: 'Formasi ALSABBAT',
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
  );
}
