/**
 * Nama publik klub ditampilkan sebagai "AL SABBAT" (dua kata).
 * Helper ini hanya memperbaiki TAMPILAN teks yang berasal dari data/CMS —
 * tidak mengubah data, identifier teknis, storage key, atau URL.
 */
export const brandText = (value) => {
  if (value === null || value === undefined) return value;
  return String(value).replace(/ALSABBAT/g, 'AL SABBAT').replace(/Alsabbat/g, 'Al Sabbat');
};

export default brandText;
