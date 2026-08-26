import React from 'react';
import { FolderTree, Newspaper, Tag, UserSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { useClub } from '../../context/ClubContext';
import { matchOptions, mediaOptions } from './adminOptions';

const opts = (values = []) => values.map((v) => ({ value: v, label: v }));

export default function AdminContentPage() {
  const { meta } = useClub();
  const statusOptions = opts(meta?.entity_status);

  return (
    <div className="space-y-6" data-testid="page-admin-content">
      <div>
        <p className="als-section-label mb-2">Content Management</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Content</h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--muted-fg)' }}>
          Fondasi CMS: Post, Category, Tag, dan Author. Post dapat dikaitkan ke match, tim, pemain, dan kompetisi.
        </p>
      </div>

      <Tabs defaultValue="posts">
        <TabsList data-testid="content-tabs">
          <TabsTrigger value="posts" data-testid="content-tab-posts">Posts</TabsTrigger>
          <TabsTrigger value="categories" data-testid="content-tab-categories">Categories</TabsTrigger>
          <TabsTrigger value="tags" data-testid="content-tab-tags">Tags</TabsTrigger>
          <TabsTrigger value="authors" data-testid="content-tab-authors">Authors</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          <ResourceManager
            title="Post"
            description="Berita, artikel, dan Match Report klub dengan slug SEO-friendly."
            endpoint="/content/posts"
            writePermission="content:write"
            testPrefix="admin-posts"
            emptyIcon={Newspaper}
            emptyTitle="Belum ada berita"
            emptyDescription="Tulis berita pertama klub."
            defaults={{ status: 'DRAFT', post_type: 'ARTICLE' }}
            filters={[
              { name: 'status', label: 'Status', options: opts(meta?.post_status) },
              { name: 'post_type', label: 'Tipe', options: opts(meta?.post_types) },
              { name: 'category_id', label: 'Kategori', optionsFrom: { endpoint: '/content/categories', labelKey: 'name' } },
            ]}
            columns={[
              { key: 'title', label: 'Judul' },
              { key: 'post_type', label: 'Tipe', render: (r) => <Badge variant="outline">{r.post_type || 'ARTICLE'}</Badge> },
              { key: 'slug', label: 'Slug', className: 'font-mono text-xs' },
              { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
              { key: 'published_at', label: 'Dipublikasikan' },
            ]}
            fields={[
              { name: 'title', label: 'Judul', type: 'text', required: true, full: true },
              { name: 'slug', label: 'Slug', type: 'text', help: 'Kosongkan untuk dibuat otomatis dari judul.' },
              {
                name: 'post_type',
                label: 'Tipe Konten',
                type: 'select',
                options: opts(meta?.post_types),
                required: true,
                help: 'Pilih MATCH_REPORT agar tampil sebagai laporan pertandingan di Match Center.',
              },
              { name: 'status', label: 'Status', type: 'select', options: opts(meta?.post_status), required: true },
              { name: 'thumbnail', label: 'Thumbnail', type: 'media', full: true, optionsFrom: mediaOptions },
              { name: 'excerpt', label: 'Ringkasan', type: 'textarea', full: true },
              { name: 'content', label: 'Isi Berita', type: 'textarea', full: true, rows: 8 },
              { name: 'category_id', label: 'Kategori', type: 'select', optionsFrom: { endpoint: '/content/categories', labelKey: 'name' } },
              { name: 'author_id', label: 'Author', type: 'select', optionsFrom: { endpoint: '/content/authors', labelKey: 'name' } },
              { name: 'match_id', label: 'Terkait Match', type: 'select', optionsFrom: matchOptions },
              { name: 'team_id', label: 'Terkait Tim', type: 'select', optionsFrom: { endpoint: '/teams', labelKey: 'name' } },
              { name: 'published_at', label: 'Tanggal Publikasi', type: 'date' },
              { name: 'seo.title', label: 'SEO Title', type: 'text', full: true },
              { name: 'seo.description', label: 'SEO Description', type: 'textarea', full: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <ResourceManager
            title="Category"
            endpoint="/content/categories"
            writePermission="content:write"
            testPrefix="admin-categories"
            emptyIcon={FolderTree}
            emptyTitle="Belum ada kategori"
            emptyDescription="Tambahkan kategori seperti “Match Report” atau “Club News”."
            defaults={{ status: 'ACTIVE' }}
            filters={[{ name: 'status', label: 'Status', options: statusOptions }]}
            columns={[
              { key: 'name', label: 'Nama' },
              { key: 'slug', label: 'Slug', className: 'font-mono text-xs' },
              { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
            ]}
            fields={[
              { name: 'name', label: 'Nama', type: 'text', required: true },
              { name: 'slug', label: 'Slug', type: 'text' },
              { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
              { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="tags" className="mt-6">
          <ResourceManager
            title="Tag"
            endpoint="/content/tags"
            writePermission="content:write"
            testPrefix="admin-tags"
            emptyIcon={Tag}
            emptyTitle="Belum ada tag"
            emptyDescription="Tag membantu pengelompokan konten."
            defaults={{ status: 'ACTIVE' }}
            columns={[
              { key: 'name', label: 'Nama' },
              { key: 'slug', label: 'Slug', className: 'font-mono text-xs' },
              { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
            ]}
            fields={[
              { name: 'name', label: 'Nama', type: 'text', required: true },
              { name: 'slug', label: 'Slug', type: 'text' },
              { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="authors" className="mt-6">
          <ResourceManager
            title="Author"
            endpoint="/content/authors"
            writePermission="content:write"
            testPrefix="admin-authors"
            emptyIcon={UserSquare}
            emptyTitle="Belum ada author"
            emptyDescription="Tambahkan media officer klub sebagai author."
            defaults={{ status: 'ACTIVE' }}
            columns={[
              { key: 'name', label: 'Nama' },
              { key: 'slug', label: 'Slug', className: 'font-mono text-xs' },
              { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
            ]}
            fields={[
              { name: 'name', label: 'Nama', type: 'text', required: true },
              { name: 'slug', label: 'Slug', type: 'text' },
              { name: 'status', label: 'Status', type: 'select', options: statusOptions, required: true },
              { name: 'photo', label: 'Foto URL', type: 'text', full: true },
              { name: 'bio', label: 'Bio', type: 'textarea', full: true },
              { name: 'social_media.instagram', label: 'Instagram', type: 'text' },
            ]}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
