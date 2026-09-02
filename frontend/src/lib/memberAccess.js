/** Fase 3/4A/4B — peran Baraya: Guest → Member → Pemain → Pemain + Staf. */
export const GALLERY_ROLES = ['PEMAIN', 'STAFF'];

export const ROLE_LABELS = {
  GUEST: 'Pengunjung',
  MEMBER: 'Member',
  PEMAIN: 'Pemain',
  STAFF: 'Staf',
};

export const roleOf = (customer) => (customer ? customer.role || 'MEMBER' : 'GUEST');

/** Satu akun bisa punya beberapa profil sekaligus (Pemain + Staf). */
export const rolesOf = (customer) => {
  if (!customer) return [];
  const roles = Array.isArray(customer.roles) ? customer.roles : null;
  return roles && roles.length ? roles : [roleOf(customer)];
};

export const hasRole = (customer, role) => rolesOf(customer).includes(role);

export const roleLabel = (customer) => {
  const roles = rolesOf(customer);
  // Peran STAFF hanya diberikan backend setelah Admin menyetujui pengajuan,
  // sehingga label ini otomatis mengikuti status approval.
  if (roles.includes('STAFF')) return 'Staf & Pemain';
  return ROLE_LABELS[roles[0]] || 'Member';
};

/** Galeri & Sorotan Pemain hanya untuk Pemain dan Staf (juga dipaksa di backend). */
export const canAccessGallery = (customer) =>
  rolesOf(customer).some((role) => GALLERY_ROLES.includes(role));

/** Hanya Member murni yang boleh mengajukan Pemain. */
export const canApplyPlayer = (customer) => {
  const roles = rolesOf(customer);
  return roles.length === 1 && roles[0] === 'MEMBER';
};

/** Pemain boleh mengajukan Staf berkali-kali (bagian & jabatan berbeda). */
export const canApplyStaff = (customer) => hasRole(customer, 'PEMAIN');
