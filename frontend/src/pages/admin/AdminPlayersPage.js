import React from 'react';
import { User } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminPlayersPage() {
  const { meta } = useClub();

  return (
    <ResourceManager
      title="Players"
      description="Skuad pemain per tim. Tidak ada data pemain yang di-hard-code."
      endpoint="/players"
      writePermission="player:write"
      testPrefix="admin-players"
      emptyIcon={User}
      emptyTitle="Belum ada pemain"
      emptyDescription="Tambahkan pemain pertama untuk mulai menyusun skuad."
      defaults={{ position: 'MIDFIELDER', status: 'ACTIVE' }}
      filters={[
        { name: 'team_id', label: 'Tim', optionsFrom: { endpoint: '/teams', labelKey: 'name' } },
        { name: 'position', label: 'Posisi', options: opts(meta?.player_positions) },
        { name: 'status', label: 'Status', options: opts(meta?.player_status) },
      ]}
      columns={[
        {
          key: 'jersey_number',
          label: 'No.',
          className: 'w-[60px]',
          render: (r) => (
            <span className="font-display font-bold tabular-nums">{r.jersey_number ?? '—'}</span>
          ),
        },
        { key: 'full_name', label: 'Nama Lengkap' },
        { key: 'display_name', label: 'Display Name' },
        { key: 'position', label: 'Posisi', render: (r) => <Badge variant="outline">{r.position}</Badge> },
        { key: 'nationality', label: 'Kebangsaan' },
        { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]}
      fields={[
        {
          name: 'team_id',
          label: 'Tim',
          type: 'select',
          required: true,
          optionsFrom: { endpoint: '/teams', labelKey: 'name' },
        },
        { name: 'full_name', label: 'Nama Lengkap', type: 'text', required: true },
        { name: 'display_name', label: 'Display Name', type: 'text' },
        { name: 'jersey_number', label: 'Nomor Punggung', type: 'number', help: '0–99' },
        { name: 'position', label: 'Posisi', type: 'select', options: opts(meta?.player_positions), required: true },
        { name: 'status', label: 'Status', type: 'select', options: opts(meta?.player_status), required: true },
        { name: 'date_of_birth', label: 'Tanggal Lahir', type: 'date' },
        { name: 'nationality', label: 'Kebangsaan', type: 'text' },
        { name: 'height_cm', label: 'Tinggi (cm)', type: 'number' },
        { name: 'weight_kg', label: 'Berat (kg)', type: 'number' },
        { name: 'photo', label: 'Foto URL', type: 'text', full: true },
        { name: 'bio', label: 'Bio', type: 'textarea', full: true },
        { name: 'social_media.instagram', label: 'Instagram', type: 'text' },
        { name: 'social_media.twitter', label: 'X / Twitter', type: 'text' },
      ]}
    />
  );
}
