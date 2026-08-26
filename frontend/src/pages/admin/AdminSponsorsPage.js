import React from 'react';
import { Handshake } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';
import { mediaOptions } from './adminOptions';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminSponsorsPage() {
  const { meta } = useClub();

  return (
    <ResourceManager
      title="Sponsor"
      description="Sponsor klub — tidak ada data yang di-hard-code, urutan tampilan dapat diatur."
      endpoint="/sponsors"
      writePermission="sponsor:write"
      testPrefix="admin-sponsors"
      emptyIcon={Handshake}
      emptyTitle="Belum ada sponsor"
      emptyDescription="Tambahkan sponsor resmi klub."
      defaults={{ status: 'ACTIVE', display_order: 0 }}
      filters={[{ name: 'status', label: 'Status', options: opts(meta?.entity_status) }]}
      columns={[
        { key: 'display_order', label: 'Urutan', className: 'w-[80px]' },
        { key: 'name', label: 'Nama' },
        { key: 'tier', label: 'Tier' },
        {
          key: 'website',
          label: 'Website',
          render: (r) =>
            r.website ? (
              <a href={r.website} target="_blank" rel="noreferrer" className="text-xs underline" style={{ color: 'var(--club-secondary)' }}>
                {r.website}
              </a>
            ) : (
              '—'
            ),
        },
        { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]}
      fields={[
        { name: 'name', label: 'Nama Sponsor', type: 'text', required: true },
        { name: 'tier', label: 'Tier', type: 'text', placeholder: 'Main Sponsor / Official Partner' },
        { name: 'display_order', label: 'Urutan Tampilan', type: 'number' },
        { name: 'status', label: 'Status', type: 'select', options: opts(meta?.entity_status), required: true },
        {
          name: 'logo',
          label: 'Logo Sponsor',
          type: 'media',
          full: true,
          optionsFrom: mediaOptions,
          help: 'Gunakan logo PNG berlatar transparan agar rapi di baris sponsor.',
        },
        { name: 'website', label: 'Website', type: 'text', full: true },
        { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
      ]}
    />
  );
}
