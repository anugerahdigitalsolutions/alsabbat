import React from 'react';
import { Briefcase } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';
import { mediaOptions } from './adminOptions';
import { MEDIA_SPECS } from '../../lib/mediaHints';
import { departmentOptions, positionOptions, staffPositionLabel } from '../../lib/staffStructure';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

const playerLabel = (player) =>
  `${player.display_name || player.full_name || player.id}${
    player.jersey_number || player.jersey_number === 0 ? ` · #${player.jersey_number}` : ''
  }`;

export default function AdminStaffPage() {
  const { meta } = useClub();

  return (
    <ResourceManager
      title="Staff"
      description="Satu pemain/akun dapat memiliki beberapa Staff Entry — masing-masing dengan Bagian, Jabatan, Foto dan status sendiri."
      endpoint="/staff"
      writePermission="staff:write"
      testPrefix="admin-staff"
      emptyIcon={Briefcase}
      emptyTitle="Belum ada staf"
      emptyDescription="Tambahkan pelatih atau staf tim pertama."
      defaults={{ status: 'ACTIVE' }}
      filters={[
        { name: 'team_id', label: 'Tim', optionsFrom: { endpoint: '/teams', labelKey: 'name' } },
        { name: 'department', label: 'Bagian', options: departmentOptions(meta) },
        { name: 'role', label: 'Role (data lama)', options: opts(meta?.staff_roles) },
        { name: 'status', label: 'Status', options: opts(meta?.entity_status) },
      ]}
      columns={[
        { key: 'name', label: 'Nama' },
        { key: 'department', label: 'Bagian', render: (r) => r.department || '—' },
        {
          key: 'position_title',
          label: 'Jabatan',
          render: (r) => <Badge variant="outline">{staffPositionLabel(r)}</Badge>,
        },
        { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]}
      fields={[
        {
          name: 'player_id',
          label: 'Pilih dari Pemain Terdaftar (opsional)',
          type: 'select',
          full: true,
          optionsFrom: { endpoint: '/players', labelFn: playerLabel },
          help:
            'Memakai data pemain yang sudah ada — tidak membuat akun atau profil pemain baru. Pemain yang sama boleh dipilih berulang untuk Staff Entry berbeda.',
          onValueChange: (value, next, optionMap) => {
            const option = (optionMap['/players'] || []).find((o) => String(o.value) === String(value));
            const player = option?.item;
            if (!player) return null;
            // Nama & Tim terisi otomatis dari pemain; Foto Staff TIDAK diambil dari
            // foto Pemain agar foto per Staff Entry tetap terpisah.
            return {
              name: player.display_name || player.full_name || next.name,
              team_id: player.team_id || next.team_id,
            };
          },
        },
        {
          name: 'team_id',
          label: 'Tim',
          type: 'select',
          required: true,
          optionsFrom: { endpoint: '/teams', labelKey: 'name' },
          help: 'Terisi otomatis dari tim pemain bila dipilih dari Pemain Terdaftar; masih bisa diubah.',
        },
        { name: 'name', label: 'Nama', type: 'text', required: true },
        {
          name: 'department',
          label: 'Bagian / Department',
          type: 'select',
          options: departmentOptions(meta),
          help: 'Jabatan mengikuti Bagian yang dipilih.',
          onValueChange: () => ({ position_title: '' }),
        },
        {
          name: 'position_title',
          label: 'Jabatan / Position',
          type: 'select',
          optionsFn: (values) => positionOptions(meta, values?.department),
          help: 'Role lama terisi otomatis dari Jabatan ini (kompatibilitas data lama).',
        },
        { name: 'status', label: 'Status', type: 'select', options: opts(meta?.entity_status), required: true },
        {
          name: 'photo',
          label: 'Foto Staff (khusus entry ini)',
          type: 'media',
          full: true,
          optionsFrom: mediaOptions,
          spec: MEDIA_SPECS.staffPhoto,
          help: 'Foto khusus Staff Entry ini — tidak menimpa foto profil Pemain maupun foto Staff Entry lain.',
        },
        {
          name: 'gallery_images',
          label: 'Galeri Foto',
          type: 'gallery',
          max: 3,
          full: true,
          spec: MEDIA_SPECS.staffGallery,
          help: 'Maksimal 3 foto. Foto pertama menjadi foto utama di halaman detail staf; urutan di sini = urutan slider publik.',
        },
        { name: 'role_label', label: 'Label Role (opsional)', type: 'text', help: 'Untuk penamaan kustom di luar daftar Jabatan.' },
        { name: 'bio', label: 'Bio', type: 'textarea', full: true },
        { name: 'social_media.instagram', label: 'Instagram', type: 'text' },
      ]}
    />
  );
}
