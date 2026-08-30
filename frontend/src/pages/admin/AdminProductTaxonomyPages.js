import React from 'react';
import { Layers, Tags } from 'lucide-react';
import { ResourceManager } from '../../components/admin/ResourceManager';
import { Badge } from '../../components/ui/badge';

const STATUS = ['DRAFT', 'ACTIVE', 'ARCHIVED'].map((v) => ({ value: v, label: v }));

export const AdminProductCategoriesPage = () => (
  <ResourceManager
    title="Kategori Produk"
    description="Kategori merchandise (mis. Jersey, Apparel, Accessories) ditentukan sepenuhnya oleh admin."
    endpoint="/merchandise/catalog/categories"
    writePermission="merchandise:write"
    testPrefix="admin-product-categories"
    emptyIcon={Tags}
    emptyTitle="Belum ada kategori"
    emptyDescription="Tambahkan kategori merchandise."
    defaults={{ status: 'ACTIVE', display_order: 0 }}
    filters={[{ name: 'status', label: 'Status', options: STATUS }]}
    columns={[
      { key: 'display_order', label: 'Urutan', className: 'w-[80px]' },
      { key: 'name', label: 'Nama' },
      { key: 'slug', label: 'Slug' },
      { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
    ]}
    fields={[
      { name: 'name', label: 'Nama Kategori', type: 'text', required: true, full: true },
      { name: 'slug', label: 'Slug (opsional)', type: 'text' },
      { name: 'status', label: 'Status', type: 'select', options: STATUS, required: true },
      { name: 'display_order', label: 'Urutan', type: 'number' },
      { name: 'description', label: 'Deskripsi', type: 'textarea', full: true },
    ]}
  />
);

export const AdminProductVariantsPage = () => (
  <ResourceManager
    title="Varian Produk"
    description="Varian & stok per ukuran/warna. Stok divalidasi server saat checkout dan dikurangi hanya setelah pembayaran terverifikasi."
    endpoint="/merchandise/catalog/variants"
    writePermission="merchandise:write"
    testPrefix="admin-product-variants"
    emptyIcon={Layers}
    emptyTitle="Belum ada varian"
    emptyDescription="Tambahkan varian bila produk memiliki pilihan ukuran atau warna."
    defaults={{ status: 'ACTIVE', stock_quantity: 0, display_order: 0 }}
    filters={[
      { name: 'status', label: 'Status', options: STATUS },
      {
        name: 'product_id',
        label: 'Produk',
        optionsFrom: { endpoint: '/merchandise/catalog/products', labelKey: 'name' },
      },
    ]}
    columns={[
      { key: 'display_order', label: 'Urutan', className: 'w-[80px]' },
      { key: 'name', label: 'Varian' },
      { key: 'sku', label: 'SKU' },
      { key: 'stock_quantity', label: 'Stok' },
      { key: 'status', label: 'Status', render: (r) => <Badge variant="outline">{r.status}</Badge> },
    ]}
    fields={[
      {
        name: 'product_id',
        label: 'Produk',
        type: 'select',
        optionsFrom: { endpoint: '/merchandise/catalog/products', labelKey: 'name' },
        required: true,
        full: true,
      },
      { name: 'name', label: 'Nama Varian', type: 'text', required: true },
      { name: 'sku', label: 'SKU', type: 'text' },
      { name: 'price_override', label: 'Harga Khusus (Rp)', type: 'number' },
      { name: 'stock_quantity', label: 'Stok', type: 'number', required: true },
      { name: 'status', label: 'Status', type: 'select', options: STATUS, required: true },
      { name: 'display_order', label: 'Urutan', type: 'number' },
    ]}
  />
);

export default AdminProductCategoriesPage;
