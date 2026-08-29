/** Fase 3 — peran Baraya: Guest → Member → Pemain → Staf. */
export const GALLERY_ROLES = ['PEMAIN', 'STAFF'];

export const ROLE_LABELS = {
  GUEST: 'Pengunjung',
  MEMBER: 'Member',
  PEMAIN: 'Pemain',
  STAFF: 'Staf',
};

export const roleOf = (customer) => (customer ? customer.role || 'MEMBER' : 'GUEST');

export const roleLabel = (customer) => ROLE_LABELS[roleOf(customer)] || 'Member';

/** Galeri & Sorotan Pemain hanya untuk Pemain dan Staf (juga dipaksa di backend). */
export const canAccessGallery = (customer) => GALLERY_ROLES.includes(roleOf(customer));
