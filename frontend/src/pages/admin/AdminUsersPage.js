import React from 'react';
import { UserCog } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';

export default function AdminUsersPage() {
  const { meta } = useClub();
  const roleOptions = (meta?.roles || [])
    .filter((r) => r.selectable !== false)
    .map((r) => ({ value: r.value, label: r.label }));

  return (
    <ResourceManager
      title="Admin User"
      description="Pengelolaan akun admin. Role & permission diterapkan di backend, bukan hanya di UI."
      endpoint="/users"
      writePermission="user:write"
      testPrefix="admin-users"
      searchable={false}
      emptyIcon={UserCog}
      emptyTitle="Belum ada admin lain"
      emptyDescription="Tambahkan admin dengan role sesuai kebutuhan."
      defaults={{ role: 'MEDIA_CONTENT_ADMIN', is_active: true }}
      columns={[
        { key: 'name', label: 'Nama' },
        { key: 'email', label: 'Email' },
        {
          key: 'role',
          label: 'Role',
          render: (r) => (
            <Badge
              variant="outline"
              style={{
                backgroundColor: r.role === 'SUPER_ADMIN' ? 'rgba(252,207,43,0.16)' : 'rgba(1,40,145,0.05)',
                borderColor: r.role === 'SUPER_ADMIN' ? 'rgba(252,207,43,0.55)' : 'var(--border-soft)',
              }}
            >
              {r.role}
            </Badge>
          ),
        },
        {
          key: 'is_active',
          label: 'Aktif',
          render: (r) => <Badge variant="outline">{r.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge>,
        },
        { key: 'last_login_at', label: 'Login Terakhir' },
      ]}
      fields={[
        { name: 'name', label: 'Nama', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'text', required: true },
        { name: 'role', label: 'Role', type: 'select', options: roleOptions, required: true },
        { name: 'is_active', label: 'Aktif', type: 'switch' },
        {
          name: 'password',
          label: 'Password',
          type: 'password',
          full: true,
          help: 'Minimal 8 karakter. Wajib saat membuat admin baru; diabaikan saat mengedit.',
        },
      ]}
    />
  );
}
