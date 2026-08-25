import React from 'react';
import { Shield } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { useClub } from '../../context/ClubContext';
import { Badge } from '../../components/ui/badge';

export default function AdminClubPage() {
  const { meta, reload } = useClub();
  const statusOptions = (meta?.entity_status || ['ACTIVE', 'INACTIVE', 'ARCHIVED']).map((v) => ({
    value: v,
    label: v,
  }));

  return (
    <ResourceManager
      title="Club"
      description="Konfigurasi terpusat identitas klub — dipakai oleh seluruh website dan admin panel."
      endpoint="/club"
      writePermission="club:write"
      testPrefix="admin-club"
      singleRecordMode
      allowDelete={false}
      searchable={false}
      emptyIcon={Shield}
      emptyTitle="Belum ada konfigurasi klub"
      emptyDescription="Buat entitas klub untuk mengaktifkan identitas terpusat."
      onChanged={reload}
      defaults={{
        primary_color: '#FCCF2B',
        secondary_color: '#012891',
        tertiary_color: '#000000',
        light_color: '#FEFEFE',
        status: 'ACTIVE',
      }}
      columns={[
        { key: 'name', label: 'Nama Klub' },
        { key: 'short_name', label: 'Short Name' },
        {
          key: 'colors',
          label: 'Brand Colors',
          render: (row) => (
            <div className="flex gap-1.5">
              {[row.primary_color, row.secondary_color, row.tertiary_color, row.light_color].map((color, i) => (
                <span
                  key={i}
                  className="h-5 w-5 rounded"
                  style={{ backgroundColor: color, border: '1px solid var(--border-soft)' }}
                  title={color}
                />
              ))}
            </div>
          ),
        },
        { key: 'location', label: 'Lokasi' },
        {
          key: 'status',
          label: 'Status',
          render: (row) => <Badge variant="outline">{row.status}</Badge>,
        },
      ]}
      fields={[
        { name: 'name', label: 'Nama Klub', type: 'text', required: true, full: true },
        { name: 'short_name', label: 'Short Name', type: 'text', required: true },
        { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
        { name: 'logo', label: 'Logo URL', type: 'text', full: true, help: 'Gunakan URL dari Media Library atau CDN.' },
        { name: 'primary_color', label: 'Primary Color', type: 'color' },
        { name: 'secondary_color', label: 'Secondary Color', type: 'color' },
        { name: 'tertiary_color', label: 'Tertiary Color', type: 'color' },
        { name: 'light_color', label: 'Light Color', type: 'color' },
        { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
        { name: 'founded_date', label: 'Tanggal Berdiri', type: 'date' },
        { name: 'location', label: 'Lokasi', type: 'text' },
        { name: 'stadium', label: 'Markas / Stadion', type: 'text' },
        { name: 'official_website', label: 'Website Resmi', type: 'text' },
        { name: 'contact.email', label: 'Email Kontak', type: 'text' },
        { name: 'contact.phone', label: 'Telepon', type: 'text' },
        { name: 'contact.whatsapp', label: 'WhatsApp', type: 'text' },
        { name: 'contact.address', label: 'Alamat', type: 'textarea', full: true },
        { name: 'social_media.instagram', label: 'Instagram', type: 'text' },
        { name: 'social_media.facebook', label: 'Facebook', type: 'text' },
        { name: 'social_media.youtube', label: 'YouTube', type: 'text' },
        { name: 'social_media.tiktok', label: 'TikTok', type: 'text' },
        { name: 'social_media.twitter', label: 'X / Twitter', type: 'text' },
        { name: 'social_media.website', label: 'Website Lain', type: 'text' },
        { name: 'seo.title', label: 'SEO Title', type: 'text', full: true },
        { name: 'seo.description', label: 'SEO Description', type: 'textarea', full: true },
        { name: 'seo.keywords', label: 'SEO Keywords', type: 'multiselect', full: true, help: 'Pisahkan dengan koma.' },
        { name: 'seo.og_image', label: 'Open Graph Image', type: 'text', full: true },
        { name: 'seo.canonical_url', label: 'Canonical URL', type: 'text', full: true },
      ]}
    />
  );
}
