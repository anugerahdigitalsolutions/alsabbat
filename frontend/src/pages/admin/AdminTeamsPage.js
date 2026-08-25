import React from 'react';
import { Users } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminTeamsPage() {
  const { meta, club } = useClub();

  return (
    <ResourceManager
      title="Teams"
      description="ALSABBAT adalah satu klub dengan satu skuad utama. Entity Team dipertahankan untuk relasi pemain, staf, dan pertandingan."
      endpoint="/teams"
      writePermission="team:write"
      testPrefix="admin-teams"
      emptyIcon={Users}
      emptyTitle="Belum ada tim"
      emptyDescription="Tambahkan tim pertama untuk mulai menyusun struktur klub."
      defaults={{ club_id: club?.id || '', category: 'FIRST_TEAM', status: 'ACTIVE' }}
      filters={[
        { name: 'category', label: 'Kategori', options: opts(meta?.team_categories) },
        { name: 'status', label: 'Status', options: opts(meta?.entity_status) },
      ]}
      columns={[
        { key: 'name', label: 'Nama Tim' },
        { key: 'short_name', label: 'Short Name' },
        { key: 'category', label: 'Kategori', render: (r) => <Badge variant="outline">{r.category}</Badge> },
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
        { name: 'name', label: 'Nama Tim', type: 'text', required: true },
        { name: 'short_name', label: 'Short Name', type: 'text' },
        { name: 'category', label: 'Kategori', type: 'select', options: opts(meta?.team_categories), required: true },
        { name: 'status', label: 'Status', type: 'select', options: opts(meta?.entity_status), required: true },
        { name: 'logo', label: 'Logo URL', type: 'text', full: true },
        { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
      ]}
    />
  );
}
