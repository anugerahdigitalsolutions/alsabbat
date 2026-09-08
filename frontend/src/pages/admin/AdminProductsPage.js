import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';
import { MEDIA_SPECS } from '../../lib/mediaHints';

const STATUS = ['DRAFT', 'ACTIVE', 'ARCHIVED'].map((v) => ({ value: v, label: v }));

export default function AdminProductsPage() {
  return (
    <ResourceManager
      title="Produk Merchandise"
      description="Katalog merchandise resmi AL SABBAT. Harga dalam rupiah (tanpa desimal) dan divalidasi server saat checkout."
      endpoint="/merchandise/catalog/products"
      writePermission="merchandise:write"
      testPrefix="admin-products"
      emptyIcon={ShoppingBag}
      emptyTitle="Belum ada produk"
      emptyDescription="Tambahkan produk merchandise resmi klub."
      defaults={{ status: 'DRAFT', currency: 'IDR', price: 0, stock_quantity: 0, display_order: 0 }}
      filters={[{ name: 'status', label: 'Status', options: STATUS }]}
      columns={[
        { key: 'display_order', label: 'Urutan', className: 'w-[80px]' },
        { key: 'name', label: 'Nama' },
        { key: 'price', label: 'Harga', render: (r) => `Rp ${Number(r.price || 0).toLocaleString('id-ID')}` },
        { key: 'stock_quantity', label: 'Stok' },
        { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
      ]}
      fields={[
        { name: 'name', label: 'Nama Produk', type: 'text', required: true, full: true },
        { name: 'slug', label: 'Slug (opsional)', type: 'text' },
        { name: 'sku', label: 'SKU', type: 'text' },
        {
          name: 'category_id',
          label: 'Kategori',
          type: 'select',
          optionsFrom: { endpoint: '/merchandise/catalog/categories', labelKey: 'name' },
        },
        { name: 'status', label: 'Status', type: 'select', options: STATUS, required: true },
        { name: 'price', label: 'Harga (Rp)', type: 'number', required: true },
        { name: 'compare_at_price', label: 'Harga Sebelum Diskon (Rp)', type: 'number' },
        { name: 'stock_quantity', label: 'Stok (tanpa varian)', type: 'number' },
        { name: 'display_order', label: 'Urutan', type: 'number' },
        {
          name: 'cover_media_id',
          label: 'Gambar Produk',
          type: 'media',
          returns: 'id',
          optionsFrom: { endpoint: '/media', labelKey: 'file_name', valueKey: 'id' },
          full: true,
          spec: MEDIA_SPECS.productImage,
          help: 'Upload dari perangkat atau pilih dari Media Library. Editor crop terbuka otomatis dengan frame 4:5 (potret) — geser & zoom untuk memilih bagian yang tampil.',
        },
        {
          name: 'media_ids',
          label: 'Galeri Produk (Foto & Video)',
          type: 'gallery',
          max: 6,
          full: true,
          spec: MEDIA_SPECS.productImage,
          // Fase 1B: satu galeri untuk foto + video, memakai MediaPicker & Media Library existing.
          accept: 'image/*,video/mp4,video/webm,video/quicktime',
          resolveTypes: true,
          galleryHint: '6 slot terpisah untuk foto dan/atau video, boleh dicampur. Urutan slot = urutan tampil di halaman produk.',
          help: 'Foto: editor crop/zoom 4:5 terbuka otomatis. Video: MP4/WEBM/MOV (maks 200MB) langsung masuk Media Library tanpa crop, lalu ditampilkan dalam frame 4:5 dan bisa diputar pembeli. Gambar utama produk tetap "Gambar Produk" di atas.',
        },
        { name: 'weight_grams', label: 'Berat (gram)', type: 'number', help: 'Berat kirim per item. Diperlukan untuk perhitungan ongkir pada fase berikutnya.' },
        { name: 'length_cm', label: 'Panjang (cm)', type: 'number' },
        { name: 'width_cm', label: 'Lebar (cm)', type: 'number' },
        { name: 'height_cm', label: 'Tinggi (cm)', type: 'number' },
        { name: 'short_description', label: 'Deskripsi Singkat', type: 'textarea', full: true },
        { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
      ]}
    />
  );
}
