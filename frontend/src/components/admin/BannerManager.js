import React, { useState } from 'react';
import { Eye, ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { bannerToSlide } from '../../lib/banners';
import { ResourceManager } from './ResourceManager';
import { CinematicHero } from '../public/CinematicHero';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'ACTIVE (tampil di homepage)' },
  { value: 'INACTIVE', label: 'INACTIVE (draft)' },
  { value: 'ARCHIVED', label: 'ARCHIVED' },
];

const PreviewDialog = ({ open, onOpenChange, clubName }) => {
  const [loading, setLoading] = useState(false);
  const [banners, setBanners] = useState([]);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get('/banners/preview')
      .then(({ data }) => setBanners(data?.items || []))
      .catch((e) => toast.error(apiErrorMessage(e, 'Gagal memuat preview')))
      .finally(() => setLoading(false));
  }, [open]);

  const slides = banners.map(bannerToSlide);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-6xl overflow-y-auto bg-white" data-testid="admin-banners-preview-dialog">
        <DialogHeader>
          <DialogTitle className="font-display">Preview Hero</DialogTitle>
          <DialogDescription>
            Renderer identik dengan homepage. Preview menampilkan semua banner (termasuk draft) agar bisa diperiksa
            sebelum dipublikasikan.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : slides.length ? (
          <CinematicHero slides={slides} clubName={clubName} />
        ) : (
          <p className="py-8 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="admin-banners-preview-empty">
            Belum ada banner. Homepage akan memakai hero fallback ALSABBAT (teks dari tab Konten Situs).
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export const BannerManager = ({ clubName = 'ALSABBAT' }) => {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <ResourceManager
        title="Banner Hero"
        description="Slider hero homepage. Gambar dipilih dari Media Library. Hanya status ACTIVE yang tampil di website; jika tidak ada banner aktif, homepage memakai hero fallback ALSABBAT."
        endpoint="/banners"
        writePermission="content:write"
        testPrefix="admin-banners"
        emptyIcon={ImageIcon}
        emptyTitle="Belum ada banner hero"
        emptyDescription="Tambahkan banner pertama untuk mengatur slider hero homepage."
        defaults={{ status: 'INACTIVE', display_order: 0 }}
        filters={[{ name: 'status', label: 'Status', options: STATUS_OPTIONS }]}
        extraActions={
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)} data-testid="admin-banners-preview-button">
            <Eye className="mr-2 h-3.5 w-3.5" />
            Preview Hero
          </Button>
        }
        columns={[
          { key: 'display_order', label: 'Urutan', className: 'w-[80px]' },
          { key: 'eyebrow', label: 'Eyebrow' },
          {
            key: 'headline_line_1',
            label: 'Headline',
            render: (r) => [r.headline_line_1, r.headline_line_2, r.headline_line_3].filter(Boolean).join(' / ') || '—',
          },
          {
            key: 'image_media_id',
            label: 'Gambar',
            render: (r) => (r.image_media_id ? 'Media Library' : r.image_url ? 'URL' : '—'),
          },
          { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
        ]}
        fields={[
          { name: 'eyebrow', label: 'Eyebrow', type: 'text', placeholder: `${clubName} Football Club` },
          { name: 'display_order', label: 'Urutan Tampilan', type: 'number' },
          { name: 'headline_line_1', label: 'Headline Baris 1', type: 'text', required: true },
          { name: 'headline_line_2', label: 'Headline Baris 2', type: 'text' },
          {
            name: 'headline_line_3',
            label: 'Headline Baris 3',
            type: 'text',
            help: 'Baris terakhir otomatis berwarna emas.',
          },
          { name: 'subheadline', label: 'Subheadline', type: 'text' },
          { name: 'meta', label: 'Deskripsi', type: 'textarea', full: true },
          {
            name: 'image_media_id',
            label: 'Gambar (Media Library)',
            type: 'select',
            full: true,
            optionsFrom: { endpoint: '/media', labelFn: (m) => `${m.file_name} · ${m.file_type}` },
            help: 'Upload gambar di menu Media, lalu pilih di sini.',
          },
          {
            name: 'image_url',
            label: 'Gambar (URL eksternal)',
            type: 'text',
            full: true,
            help: 'Opsional. Diabaikan jika gambar Media Library dipilih.',
          },
          { name: 'image_alt', label: 'Alt Text Gambar', type: 'text', full: true },
          { name: 'cta_label', label: 'Tombol Utama — Label', type: 'text' },
          { name: 'cta_url', label: 'Tombol Utama — Tautan', type: 'text', placeholder: '/matches' },
          { name: 'cta_secondary_label', label: 'Tombol Sekunder — Label', type: 'text' },
          { name: 'cta_secondary_url', label: 'Tombol Sekunder — Tautan', type: 'text', placeholder: '/club' },
          { name: 'starts_at', label: 'Mulai Tampil (opsional)', type: 'date' },
          { name: 'ends_at', label: 'Berhenti Tampil (opsional)', type: 'date' },
          { name: 'status', label: 'Status', type: 'select', options: STATUS_OPTIONS, required: true },
        ]}
      />
      <PreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} clubName={clubName} />
    </>
  );
};

export default BannerManager;
