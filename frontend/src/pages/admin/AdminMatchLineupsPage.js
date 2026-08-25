import React from 'react';
import { ClipboardList } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

const ROLE_LABEL = {
  STARTING: 'Starting XI',
  SUBSTITUTE: 'Cadangan',
  UNUSED_SUBSTITUTE: 'Cadangan (tidak main)',
};

export default function AdminMatchLineupsPage() {
  const { meta } = useClub();

  return (
    <ResourceManager
      title="Match Lineups"
      description="Satu baris per pemain per pertandingan. Frontend otomatis mengelompokkan menjadi Starting XI dan Cadangan."
      endpoint="/match-lineups"
      writePermission="lineup:write"
      testPrefix="admin-match-lineups"
      emptyIcon={ClipboardList}
      emptyTitle="Belum ada susunan pemain"
      emptyDescription="Tambahkan pemain ke pertandingan untuk membentuk Starting XI dan bangku cadangan."
      defaults={{ role: 'STARTING', is_captain: false, display_order: 0 }}
      searchable={false}
      filters={[
        {
          name: 'match_id',
          label: 'Pertandingan',
          optionsFrom: { endpoint: '/matches', labelKey: 'date' },
        },
        { name: 'team_id', label: 'Tim', optionsFrom: { endpoint: '/teams', labelKey: 'name' } },
        { name: 'role', label: 'Peran', options: opts(meta?.lineup_roles) },
      ]}
      columns={[
        { key: 'player_id', label: 'Player ID', className: 'font-mono text-xs' },
        {
          key: 'role',
          label: 'Peran',
          render: (r) => <Badge variant="outline">{ROLE_LABEL[r.role] || r.role}</Badge>,
        },
        { key: 'position_label', label: 'Posisi' },
        { key: 'shirt_number', label: 'No' },
        {
          key: 'is_captain',
          label: 'Kapten',
          render: (r) => (r.is_captain ? <Badge variant="outline">C</Badge> : '—'),
        },
        { key: 'display_order', label: 'Urutan' },
      ]}
      fields={[
        {
          name: 'match_id',
          label: 'Pertandingan',
          type: 'select',
          required: true,
          optionsFrom: { endpoint: '/matches', labelKey: 'date' },
          help: 'Daftar tampil sebagai tanggal pertandingan.',
        },
        {
          name: 'team_id',
          label: 'Tim ALSABBAT',
          type: 'select',
          required: true,
          optionsFrom: { endpoint: '/teams', labelKey: 'name' },
        },
        {
          name: 'player_id',
          label: 'Pemain',
          type: 'select',
          required: true,
          optionsFrom: { endpoint: '/players', labelKey: 'full_name' },
          help: 'Data pemain tidak diduplikasi — hanya direferensikan.',
        },
        {
          name: 'role',
          label: 'Peran',
          type: 'select',
          required: true,
          options: opts(meta?.lineup_roles),
        },
        {
          name: 'position',
          label: 'Posisi (enum)',
          type: 'select',
          options: opts(meta?.player_positions),
        },
        { name: 'position_label', label: 'Label Posisi', type: 'text', placeholder: 'CB / LW / DM' },
        { name: 'shirt_number', label: 'Nomor Punggung', type: 'number' },
        { name: 'pitch_slot', label: 'Slot Formasi (opsional)', type: 'text', placeholder: 'mis. DEF-2' },
        { name: 'is_captain', label: 'Kapten', type: 'switch' },
        { name: 'minutes_played', label: 'Menit Bermain', type: 'number' },
        { name: 'display_order', label: 'Urutan Tampil', type: 'number' },
        { name: 'note', label: 'Catatan', type: 'textarea', full: true },
      ]}
    />
  );
}
