import React from 'react';
import { Calendar } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminSeasonsPage() {
  const { meta, club } = useClub();

  return (
    <ResourceManager
      title="Seasons"
      description="Musim kompetisi klub. Match dan competition dikaitkan ke season."
      endpoint="/seasons"
      writePermission="season:write"
      testPrefix="admin-seasons"
      emptyIcon={Calendar}
      emptyTitle="Belum ada musim"
      emptyDescription="Buat musim pertama, misalnya “2026/2027”."
      defaults={{ club_id: club?.id || '', status: 'UPCOMING' }}
      filters={[{ name: 'status', label: 'Status', options: opts(meta?.season_status) }]}
      columns={[
        { key: 'name', label: 'Nama Musim' },
        { key: 'start_date', label: 'Mulai' },
        { key: 'end_date', label: 'Selesai' },
        { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]}
      fields={[
        {
          name: 'club_id',
          label: 'Club',
          type: 'select',
          required: true,
          optionsFrom: { endpoint: '/club', labelKey: 'name' },
        },
        { name: 'name', label: 'Nama Musim', type: 'text', required: true },
        { name: 'status', label: 'Status', type: 'select', options: opts(meta?.season_status), required: true },
        { name: 'start_date', label: 'Tanggal Mulai', type: 'date' },
        { name: 'end_date', label: 'Tanggal Selesai', type: 'date' },
        { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
      ]}
    />
  );
}
