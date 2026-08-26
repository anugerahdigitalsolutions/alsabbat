import React from 'react';
import { Activity } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';
import { matchOptions } from './adminOptions';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminMatchEventsPage() {
  const { meta } = useClub();

  return (
    <ResourceManager
      title="Match Events"
      description="Timeline pertandingan: gol, assist, kartu, dan pergantian pemain. Urutan tampil mengikuti menit kejadian."
      endpoint="/match-events"
      writePermission="event:write"
      testPrefix="admin-match-events"
      emptyIcon={Activity}
      emptyTitle="Belum ada kejadian pertandingan"
      emptyDescription="Tambahkan kejadian untuk membangun timeline Match Center."
      defaults={{ type: 'GOAL', side: 'CLUB', display_order: 0 }}
      filters={[
        {
          name: 'match_id',
          label: 'Pertandingan',
          optionsFrom: matchOptions,
        },
        { name: 'type', label: 'Tipe', options: opts(meta?.match_event_types) },
        { name: 'side', label: 'Sisi', options: opts(meta?.match_event_sides) },
      ]}
      columns={[
        { key: 'minute', label: 'Menit' },
        { key: 'type', label: 'Tipe', render: (r) => <Badge variant="outline">{r.type}</Badge> },
        { key: 'side', label: 'Sisi', render: (r) => <Badge variant="outline">{r.side}</Badge> },
        { key: 'player_id', label: 'Player ID', className: 'font-mono text-xs' },
        { key: 'player_name', label: 'Nama (manual)' },
        { key: 'description', label: 'Keterangan' },
      ]}
      fields={[
        {
          name: 'match_id',
          label: 'Pertandingan',
          type: 'select',
          required: true,
          optionsFrom: matchOptions,
        },
        {
          name: 'type',
          label: 'Tipe Kejadian',
          type: 'select',
          required: true,
          options: opts(meta?.match_event_types),
        },
        {
          name: 'side',
          label: 'Sisi',
          type: 'select',
          required: true,
          options: opts(meta?.match_event_sides),
          help: 'CLUB untuk AL SABBAT, OPPONENT untuk tim lawan.',
        },
        {
          name: 'team_id',
          label: 'Tim AL SABBAT (opsional)',
          type: 'select',
          optionsFrom: { endpoint: '/teams', labelKey: 'name' },
        },
        { name: 'minute', label: 'Menit', type: 'number' },
        { name: 'minute_extra', label: 'Menit Tambahan', type: 'number' },
        {
          name: 'player_id',
          label: 'Pemain',
          type: 'select',
          optionsFrom: { endpoint: '/players', labelKey: 'full_name' },
        },
        {
          name: 'related_player_id',
          label: 'Pemain Terkait (assist / masuk)',
          type: 'select',
          optionsFrom: { endpoint: '/players', labelKey: 'full_name' },
        },
        {
          name: 'player_name',
          label: 'Nama Pemain Manual',
          type: 'text',
          help: 'Dipakai untuk pemain lawan yang tidak ada di database.',
        },
        { name: 'related_player_name', label: 'Nama Terkait Manual', type: 'text' },
        { name: 'display_order', label: 'Urutan Tampil', type: 'number' },
        { name: 'description', label: 'Keterangan', type: 'textarea', full: true },
      ]}
    />
  );
}
