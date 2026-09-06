/**
 * Alur keanggotaan AL SABBAT — SAMA dengan website:
 *   TAHAP 1 Member  : dibuat saat register + verifikasi email (role MEMBER).
 *   TAHAP 2 Pemain  : `POST /api/baraya/applications` type PEMAIN,
 *                     hanya bila `/api/baraya/access.can_apply_player` true
 *                     (backend: roles === ['MEMBER']).
 *   TAHAP 3 Staf    : `POST /api/baraya/applications` type STAFF,
 *                     hanya bila `/api/baraya/access.can_apply_staff` true
 *                     (backend: role PEMAIN sudah dimiliki).
 *
 * Semua aturan/approval tetap milik backend + Admin Panel. Mobile hanya
 * membaca status aktual (`roles`, `access`, `applications/mine`) — tidak ada
 * status baru, tidak ada aturan baru, tidak ada data hardcode.
 */
export const STAGE_KEYS = { MEMBER: 'MEMBER', PEMAIN: 'PEMAIN', STAFF: 'STAFF' };

export const APPLICATION_STATUS_LABEL = {
  PENDING: 'Menunggu Persetujuan',
  APPROVED: 'Disetujui',
  REJECTED: 'Ditolak',
};

export const APPLICATION_TYPE_LABEL = { PEMAIN: 'Pemain', STAFF: 'Staf' };

export const PLAYER_POSITIONS = [
  { value: 'GOALKEEPER', label: 'Penjaga Gawang' },
  { value: 'DEFENDER', label: 'Belakang' },
  { value: 'MIDFIELDER', label: 'Tengah' },
  { value: 'FORWARD', label: 'Depan' },
];

/** Bagian staf dari `/api/meta` (sumber tunggal, sama seperti website). */
export const departmentOptions = (meta) =>
  (meta?.staff_departments || []).map((item) => ({
    value: item.value ?? item.label,
    label: item.label,
  }));

/** Jabatan mengikuti bagian yang dipilih (mengikuti util website). */
export const positionOptions = (meta, department) => {
  const list = meta?.staff_departments || [];
  const found = list.find((item) => (item.value ?? item.label) === department);
  const positions = found ? found.positions || [] : list.flatMap((item) => item.positions || []);
  return positions.map((position) => ({ value: position, label: position }));
};

const latestOf = (applications, type) =>
  applications
    .filter((item) => item.type === type)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))[0] || null;

const pendingOf = (applications, type) =>
  applications.find((item) => item.type === type && item.status === 'PENDING') || null;

/**
 * Rangkuman 3 tahap untuk UI, seluruhnya diturunkan dari data backend.
 * `state`: 'DONE' | 'PENDING' | 'AVAILABLE' | 'REJECTED' | 'LOCKED'
 */
export function buildStages({ customer, roles = [], access, applications = [] }) {
  const hasPlayer = roles.includes('PEMAIN');
  const hasStaff = roles.includes('STAFF');
  const isMember = Boolean(customer);
  const emailVerified = Boolean(customer?.email_verified);

  const playerPending = pendingOf(applications, 'PEMAIN');
  const staffPending = pendingOf(applications, 'STAFF');
  const playerLatest = latestOf(applications, 'PEMAIN');
  const staffLatest = latestOf(applications, 'STAFF');

  const canApplyPlayer = Boolean(access?.can_apply_player) && !playerPending;
  const canApplyStaff = Boolean(access?.can_apply_staff) && !staffPending;

  const memberStage = {
    key: 'MEMBER',
    step: 1,
    title: 'Daftar Member',
    state: isMember && emailVerified ? 'DONE' : isMember ? 'PENDING' : 'LOCKED',
    status:
      isMember && emailVerified
        ? `Aktif${customer?.member_number ? ` · No. ${customer.member_number}` : ''}`
        : isMember
          ? 'Menunggu verifikasi email'
          : 'Belum terdaftar',
    description:
      isMember && emailVerified
        ? 'Akun Member AL SABBAT Anda aktif.'
        : isMember
          ? 'Selesaikan verifikasi email untuk mengaktifkan keanggotaan.'
          : 'Daftar akun AL SABBAT untuk memulai tahap keanggotaan.',
    application: null,
    canApply: false,
  };

  const playerStage = {
    key: 'PEMAIN',
    step: 2,
    title: 'Daftar Pemain',
    state: hasPlayer
      ? 'DONE'
      : playerPending
        ? 'PENDING'
        : canApplyPlayer
          ? playerLatest?.status === 'REJECTED'
            ? 'REJECTED'
            : 'AVAILABLE'
          : 'LOCKED',
    status: hasPlayer
      ? 'Disetujui · Pemain'
      : playerPending
        ? APPLICATION_STATUS_LABEL.PENDING
        : playerLatest?.status === 'REJECTED'
          ? APPLICATION_STATUS_LABEL.REJECTED
          : canApplyPlayer
            ? 'Siap diajukan'
            : 'Belum memenuhi syarat',
    description: hasPlayer
      ? 'Pengajuan Pemain Anda sudah disetujui pengurus klub.'
      : playerPending
        ? 'Pengajuan Pemain Anda sedang ditinjau pengurus klub.'
        : canApplyPlayer
          ? 'Ajukan diri sebagai Pemain AL SABBAT dengan data sesuai formulir klub.'
          : 'Pengajuan Pemain hanya untuk akun Member yang belum memiliki profil klub.',
    application: playerLatest,
    canApply: canApplyPlayer,
  };

  const staffStage = {
    key: 'STAFF',
    step: 3,
    title: 'Daftar Staf',
    state: staffPending
      ? 'PENDING'
      : hasStaff
        ? 'DONE'
        : canApplyStaff
          ? staffLatest?.status === 'REJECTED'
            ? 'REJECTED'
            : 'AVAILABLE'
          : 'LOCKED',
    status: staffPending
      ? APPLICATION_STATUS_LABEL.PENDING
      : hasStaff
        ? 'Disetujui · Staf'
        : staffLatest?.status === 'REJECTED'
          ? APPLICATION_STATUS_LABEL.REJECTED
          : canApplyStaff
            ? 'Siap diajukan'
            : 'Belum memenuhi syarat',
    description: staffPending
      ? 'Pengajuan Staf Anda sedang ditinjau pengurus klub.'
      : hasStaff
        ? 'Anda terdaftar sebagai Staf klub. Pengajuan bagian/jabatan lain tetap dimungkinkan.'
        : canApplyStaff
          ? 'Ajukan diri sebagai Staf sesuai bagian dan jabatan klub.'
          : 'Pengajuan Staf terbuka setelah pengajuan Pemain Anda disetujui.',
    application: staffLatest,
    canApply: canApplyStaff,
  };

  return [memberStage, playerStage, staffStage];
}

export default buildStages;
