/**
 * Master Bagian & Jabatan Staff — sumber data tunggal dari `/api/meta`
 * (`staff_departments`), jadi tidak ada daftar hardcode di frontend.
 */
export const departmentOptions = (meta) =>
  (meta?.staff_departments || []).map((item) => ({
    value: item.value ?? item.label,
    label: item.label,
  }));

export const positionOptions = (meta, department) => {
  const list = meta?.staff_departments || [];
  const found = list.find((item) => (item.value ?? item.label) === department);
  const positions = found ? found.positions || [] : list.flatMap((item) => item.positions || []);
  return positions.map((position) => ({ value: position, label: position }));
};

/** Jabatan yang ditampilkan: entry baru pakai `position_title`, data lama tetap `role_label`/`role`. */
export const staffPositionLabel = (member) =>
  member?.position_title || member?.role_label || member?.role || 'Staf';

/** Bagian hanya ada pada entry baru — data lama mengembalikan null. */
export const staffDepartmentLabel = (member) => member?.department || null;
