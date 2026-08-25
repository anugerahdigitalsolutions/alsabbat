import React from 'react';
import { Trophy } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminCompetitionsPage() {
  const { meta } = useClub();

  return (
    <ResourceManager
      title="Competitions"
      description="Liga, cup, turnamen, atau friendly — dikaitkan ke musim tertentu."
      endpoint="/competitions"
      writePermission="competition:write"
      testPrefix="admin-competitions"
      emptyIcon={Trophy}
      emptyTitle="Belum ada kompetisi"
      emptyDescription="Tambahkan kompetisi untuk musim yang sudah dibuat."
      defaults={{ type: 'LEAGUE', status: 'ACTIVE' }}
      filters={[
        { name: 'season_id', label: 'Musim', optionsFrom: { endpoint: '/seasons', labelKey: 'name' } },
        { name: 'type', label: 'Tipe', options: opts(meta?.competition_types) },
        { name: 'status', label: 'Status', options: opts(meta?.entity_status) },
      ]}
      columns={[
        { key: 'name', label: 'Nama Kompetisi' },
        { key: 'type', label: 'Tipe', render: (r) => <Badge variant="outline">{r.type}</Badge> },
        { key: 'organizer', label: 'Penyelenggara' },
        { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]}
      fields={[
        {
          name: 'season_id',
          label: 'Musim',
          type: 'select',
          required: true,
          optionsFrom: { endpoint: '/seasons', labelKey: 'name' },
        },
        { name: 'name', label: 'Nama Kompetisi', type: 'text', required: true },
        { name: 'type', label: 'Tipe', type: 'select', options: opts(meta?.competition_types), required: true },
        { name: 'organizer', label: 'Penyelenggara', type: 'text' },
        { name: 'status', label: 'Status', type: 'select', options: opts(meta?.entity_status), required: true },
        { name: 'logo', label: 'Logo URL', type: 'text', full: true },
        { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
      ]}
    />
  );
}
