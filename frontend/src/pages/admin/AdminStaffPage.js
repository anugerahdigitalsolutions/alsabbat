import React from 'react';
import { Briefcase } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';
import { mediaOptions } from './adminOptions';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminStaffPage() {
  const { meta } = useClub();

  return (
    <ResourceManager
      title="Staff"
      description="Pelatih dan staf pendukung per tim. Struktur role dapat diperluas."
      endpoint="/staff"
      writePermission="staff:write"
      testPrefix="admin-staff"
      emptyIcon={Briefcase}
      emptyTitle="Belum ada staf"
      emptyDescription="Tambahkan pelatih atau staf tim pertama."
      defaults={{ role: 'HEAD_COACH', status: 'ACTIVE' }}
      filters={[
        { name: 'team_id', label: 'Tim', optionsFrom: { endpoint: '/teams', labelKey: 'name' } },
        { name: 'role', label: 'Role', options: opts(meta?.staff_roles) },
        { name: 'status', label: 'Status', options: opts(meta?.entity_status) },
      ]}
      columns={[
        { key: 'name', label: 'Nama' },
        { key: 'role', label: 'Role', render: (r) => <Badge variant="outline">{r.role}</Badge> },
        { key: 'role_label', label: 'Label Role' },
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
        { name: 'name', label: 'Nama', type: 'text', required: true },
        { name: 'role', label: 'Role', type: 'select', options: opts(meta?.staff_roles), required: true },
        { name: 'role_label', label: 'Label Role (opsional)', type: 'text', help: 'Untuk role kustom di luar daftar.' },
        { name: 'status', label: 'Status', type: 'select', options: opts(meta?.entity_status), required: true },
        {
          name: 'photo',
          label: 'Foto Staf',
          type: 'media',
          full: true,
          optionsFrom: mediaOptions,
          help: 'Gunakan foto portrait yang jelas. Kosongkan bila belum tersedia — jangan memakai foto orang lain.',
        },
        { name: 'bio', label: 'Bio', type: 'textarea', full: true },
        { name: 'social_media.instagram', label: 'Instagram', type: 'text' },
      ]}
    />
  );
}
