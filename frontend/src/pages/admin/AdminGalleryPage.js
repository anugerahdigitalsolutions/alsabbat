import React from 'react';
import { Link } from 'react-router-dom';
import { Images, Settings2 } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { useClub } from '../../context/ClubContext';
import { matchOptions, mediaOptions } from './adminOptions';
import { MEDIA_SPECS } from '../../lib/mediaHints';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

const PUBLISH_STYLE = {
  PUBLISHED: { backgroundColor: 'rgba(22,163,74,0.12)', color: '#166534' },
  DRAFT: { backgroundColor: 'rgba(245,158,11,0.14)', color: '#92400E' },
  ARCHIVED: { backgroundColor: 'rgba(0,0,0,0.08)', color: '#3F3F46' },
};

export default function AdminGalleryPage() {
  const { meta } = useClub();

  return (
    <ResourceManager
      title="Gallery Album"
      description="Match → Gallery Album → Media. Album DRAFT tidak tampil di website; publikasikan setelah media dan cover siap."
      endpoint="/gallery/albums"
      writePermission="gallery:write"
      testPrefix="admin-gallery"
      emptyIcon={Images}
      emptyTitle="Belum ada album"
      emptyDescription="Buat album, hubungkan ke pertandingan, lalu pilih media dari Media Library."
      defaults={{ status: 'ACTIVE', publish_status: 'DRAFT' }}
      filters={[
        { name: 'publish_status', label: 'Publikasi', options: opts(meta?.gallery_status) },
        { name: 'match_id', label: 'Match', optionsFrom: matchOptions },
      ]}
      rowActions={(row) => (
        <Link to={`/admin/gallery/${row.id}`} data-testid={`admin-gallery-manage-${row.id}`}>
          <Button variant="ghost" size="icon" aria-label="Kelola media album">
            <Settings2 className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
          </Button>
        </Link>
      )}
      columns={[
        { key: 'title', label: 'Judul Album' },
        { key: 'date', label: 'Tanggal' },
        { key: 'media_count', label: 'Media' },
        {
          key: 'publish_status',
          label: 'Publikasi',
          render: (r) => (
            <Badge variant="outline" style={PUBLISH_STYLE[r.publish_status || 'DRAFT']}>
              {r.publish_status || 'DRAFT'}
            </Badge>
          ),
        },
        { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]}
      fields={[
        { name: 'title', label: 'Judul Album', type: 'text', required: true, full: true },
        { name: 'slug', label: 'Slug', type: 'text', help: 'Kosongkan untuk otomatis.' },
        {
          name: 'publish_status',
          label: 'Publikasi',
          type: 'select',
          required: true,
          options: opts(meta?.gallery_status),
          help: 'Hanya PUBLISHED yang tampil di website publik.',
        },
        { name: 'date', label: 'Tanggal', type: 'date' },
        {
          name: 'drive_folder_url',
          label: 'Link Folder Google Drive',
          type: 'text',
          full: true,
          help: 'Satu link folder saja (contoh: https://drive.google.com/drive/folders/XXXX). Folder harus di-share "Anyone with the link". Foto diambil otomatis, tidak perlu upload satu per satu.',
        },
        {
          name: 'match_id',
          label: 'Terkait Match',
          type: 'select',
          optionsFrom: matchOptions,
        },
        { name: 'status', label: 'Status Entitas', type: 'select', options: opts(meta?.entity_status), required: true },
        { name: 'cover_url', label: 'Cover Album (opsional)', type: 'media', full: true, optionsFrom: mediaOptions, spec: MEDIA_SPECS.albumCover, help: 'Pilih dari Media Library, atau atur cover pada halaman kelola album.' },
        { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
      ]}
    />
  );
}
