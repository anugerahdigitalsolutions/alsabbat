import React from 'react';
import { Trophy } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminAchievementsPage() {
  const { meta } = useClub();

  return (
    <ResourceManager
      title="Achievement"
      description="Prestasi dan trofi klub yang ditampilkan pada halaman publik /achievements."
      endpoint="/achievements"
      writePermission="achievement:write"
      testPrefix="admin-achievements"
      emptyIcon={Trophy}
      emptyTitle="Belum ada prestasi"
      emptyDescription="Catat trofi dan pencapaian klub agar tampil di website."
      defaults={{ status: 'ACTIVE', display_order: 0 }}
      filters={[{ name: 'status', label: 'Status', options: opts(meta?.entity_status) }]}
      columns={[
        { key: 'year', label: 'Tahun', className: 'w-[90px]' },
        { key: 'title', label: 'Judul' },
        { key: 'competition_name', label: 'Kompetisi' },
        { key: 'level', label: 'Level' },
        { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]}
      fields={[
        { name: 'title', label: 'Judul Prestasi', type: 'text', required: true, full: true },
        { name: 'competition_name', label: 'Nama Kompetisi', type: 'text' },
        { name: 'year', label: 'Tahun', type: 'number' },
        { name: 'level', label: 'Level', type: 'text', placeholder: 'Juara 1 / Runner-up' },
        { name: 'display_order', label: 'Urutan Tampilan', type: 'number' },
        { name: 'status', label: 'Status', type: 'select', options: opts(meta?.entity_status), required: true },
        { name: 'team_id', label: 'Tim', type: 'select', optionsFrom: { endpoint: '/teams', labelKey: 'name' } },
        { name: 'season_id', label: 'Musim', type: 'select', optionsFrom: { endpoint: '/seasons', labelKey: 'name' } },
        { name: 'trophy_image', label: 'Gambar Trofi (URL)', type: 'text', full: true },
        { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
      ]}
    />
  );
}
