/**
 * Integration point for Baraya ALSABBAT (public customer) authentication.
 *
 * Backend endpoints for public accounts do NOT exist yet — this module is the
 * single place to wire them up in the next phase (register, login, profile,
 * order history). Nothing here fakes a session or stores credentials.
 */
export const BARAYA_AUTH_ENABLED = false;

export const BARAYA_AUTH_NOTICE =
  'Akun Baraya ALSABBAT sedang disiapkan. Login dan pendaftaran akan aktif pada fase berikutnya.';

const notReady = () => {
  const error = new Error(BARAYA_AUTH_NOTICE);
  error.code = 'BARAYA_AUTH_NOT_AVAILABLE';
  return Promise.reject(error);
};

export const barayaLogin = notReady;
export const barayaRegister = notReady;
