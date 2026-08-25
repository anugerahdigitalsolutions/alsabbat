import React from 'react';
import { Images } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminGalleryPage() {
  const { meta } = useClub();

  return (
    <ResourceManager
      title="Gallery Album"
      description="Struktur Gallery Album → Media Items. Album dapat dikaitkan ke pertandingan."
      endpoint="/gallery/albums"
      writePermission="gallery:write"
      testPrefix="admin-gallery"
      emptyIcon={Images}
      emptyTitle="Belum ada album"
      emptyDescription="Unggah foto pertandingan atau latihan setelah membuat album."
      defaults={{ status: 'ACTIVE' }}
      filters={[
        { name: 'status', label: 'Status', options: opts(meta?.entity_status) },
        { name: 'match_id', label: 'Match', optionsFrom: { endpoint: '/matches', labelKey: 'id' } },
      ]}
      columns={[
        { key: 'title', label: 'Judul Album' },
        { key: 'slug', label: 'Slug', className: 'font-mono text-xs' },
        { key: 'date', label: 'Tanggal' },
        { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]}
      fields={[
        { name: 'title', label: 'Judul Album', type: 'text', required: true, full: true },
        { name: 'slug', label: 'Slug', type: 'text', help: 'Kosongkan untuk otomatis.' },
        { name: 'status', label: 'Status', type: 'select', options: opts(meta?.entity_status), required: true },
        { name: 'date', label: 'Tanggal', type: 'date' },
        { name: 'match_id', label: 'Terkait Match', type: 'select', optionsFrom: { endpoint: '/matches', labelKey: 'id' } },
        { name: 'team_id', label: 'Terkait Tim', type: 'select', optionsFrom: { endpoint: '/teams', labelKey: 'name' } },
        { name: 'cover_url', label: 'Cover URL', type: 'text', full: true },
        { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
      ]}
    />
  );
}
