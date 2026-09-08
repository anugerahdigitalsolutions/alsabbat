/**
 * Every network call of the app, mapped to the EXISTING ALSABBAT API.
 * No mock data, no invented endpoints — list responses are `{ items, total }`.
 */
import api from './client';

const unwrapList = ({ data }) => ({ items: data?.items || [], total: data?.total ?? 0 });

/* ------------------------------------------------------------------ club */
export const getActiveClub = () => api.get('/club/active').then(({ data }) => data);
export const getSiteContent = () => api.get('/site-content/public').then(({ data }) => data);
export const getBanners = () => api.get('/banners/public').then(unwrapList);
export const getSponsors = (params = { limit: 20, status: 'ACTIVE' }) =>
  api.get('/sponsors', { params }).then(unwrapList);
export const getAchievements = (params = { limit: 20 }) =>
  api.get('/achievements', { params }).then(unwrapList);

/* --------------------------------------------------------------- matches */
export const getMatches = (params = { limit: 60 }) => api.get('/matches', { params }).then(unwrapList);
export const getMatchRelations = (matchId) =>
  api.get(`/matches/${matchId}/relations`).then(({ data }) => data);
export const getHeadToHead = (matchId) =>
  api.get(`/matches/${matchId}/head-to-head`).then(({ data }) => data);
export const getCompetitions = (params = { limit: 50 }) =>
  api.get('/competitions', { params }).then(unwrapList);

/* ------------------------------------------------------------------ news */
export const getPosts = (params = { limit: 20, status: 'PUBLISHED' }) =>
  api.get('/content/posts', { params }).then(unwrapList);
export const getPostBySlug = (slug) =>
  api.get(`/content/posts/by-slug/${encodeURIComponent(slug)}`).then(({ data }) => data);
export const getPostById = (id) => api.get(`/content/posts/${id}`).then(({ data }) => data);
export const getCategories = (params = { limit: 50, status: 'ACTIVE' }) =>
  api.get('/content/categories', { params }).then(unwrapList);

/* ----------------------------------------------------------------- media */
export const getAlbums = (params = { limit: 24 }) =>
  api.get('/gallery/public/albums', { params }).then(unwrapList);
export const getAlbum = (albumId) =>
  api.get(`/gallery/public/albums/${albumId}`).then(({ data }) => data);
export const getAlbumDrivePhotos = (albumId) =>
  api.get(`/gallery/public/albums/${albumId}/drive-photos`).then(unwrapList);
export const getMedia = (params = { limit: 30, file_type: 'IMAGE' }) =>
  api.get('/media', { params }).then(unwrapList);

/* ----------------------------------------------------------- squad / team */
export const getPlayers = (params = { limit: 60, status: 'ACTIVE' }) =>
  api.get('/players', { params }).then(unwrapList);
export const getPlayer = (playerId) => api.get(`/players/${playerId}`).then(({ data }) => data);
export const getPlayerStatistics = (playerId) =>
  api.get(`/players/${playerId}/statistics`).then(({ data }) => data);
export const getLeaderboard = (params = { limit: 10 }) =>
  api.get('/players/stats/leaderboard', { params }).then(({ data }) => data);
export const getStaff = (params = { limit: 40, status: 'ACTIVE' }) =>
  api.get('/staff', { params }).then(unwrapList);
export const getTeams = (params = { limit: 20 }) => api.get('/teams', { params }).then(unwrapList);

/* ------------------------------------------------- auth (existing Baraya) */
export const authConfig = () => api.get('/baraya/auth/config').then(({ data }) => data);
export const login = (payload) => api.post('/baraya/login', payload).then(({ data }) => data);
export const register = (payload) => api.post('/baraya/register', payload).then(({ data }) => data);
export const requestOtp = (email, purpose = 'REGISTER') =>
  api.post('/baraya/otp/request', { email, purpose }).then(({ data }) => data);
export const verifyOtp = (payload) => api.post('/baraya/otp/verify', payload).then(({ data }) => data);
export const googleLogin = ({ code, redirectUri }) =>
  api.post('/baraya/google/login', { code, redirect_uri: redirectUri }).then(({ data }) => data);
export const forgotPassword = (email) =>
  api.post('/baraya/forgot-password', { email }).then(({ data }) => data);
export const resetPasswordOtp = (payload) =>
  api.post('/baraya/reset-password-otp', payload).then(({ data }) => data);
export const changePassword = (payload) =>
  api.post('/baraya/change-password', payload).then(({ data }) => data);
export const logoutRequest = () => api.post('/baraya/logout').then(({ data }) => data);

/* ---------------------------------------------- push device & verifikasi */
export const registerPushDevice = (payload) =>
  api.post('/baraya/push/register', payload).then(({ data }) => data);
export const unregisterPushDevice = (payload) =>
  api.post('/baraya/push/unregister', payload).then(({ data }) => data);
export const verifyMemberCode = (code) =>
  api.get(`/member/verify/${encodeURIComponent(code)}`).then(({ data }) => data);

/* ------------------------------------------------- meta & keanggotaan */
export const getMeta = () => api.get('/meta').then(({ data }) => data);
export const getMyApplications = () =>
  api.get('/baraya/applications/mine').then(unwrapList);
export const createApplication = (payload) =>
  api.post('/baraya/applications', payload).then(({ data }) => data);

/* -------------------------------------------------------------- account */
export const getMe = () => api.get('/baraya/me').then(({ data }) => data);
export const updateMe = (payload) => api.patch('/baraya/me', payload).then(({ data }) => data);
export const getAccess = () => api.get('/baraya/access').then(({ data }) => data);
export const deleteMyAccount = () => api.delete('/baraya/me/account').then(({ data }) => data);
export const getMemberCard = () => api.get('/baraya/member-card').then(({ data }) => data);
export const getNotifications = (params = { limit: 30 }) =>
  api.get('/baraya/notifications', { params }).then(unwrapList);
export const getUnreadCount = () =>
  api.get('/baraya/notifications/unread-count').then(({ data }) => data);
export const markNotificationRead = (id) =>
  api.patch(`/baraya/notifications/${id}/read`).then(({ data }) => data);
export const markAllNotificationsRead = () =>
  api.post('/baraya/notifications/read-all').then(({ data }) => data);

/* ------------------------------------------------- maintenance (existing) */
export const getMaintenance = () => api.get('/system/maintenance').then(({ data }) => data);

/* --------------------------------------------------------- teams & staf */
export const getTeam = (teamId) => api.get(`/teams/${teamId}`).then(({ data }) => data);
export const getStaffMember = (staffId) => api.get(`/staff/${staffId}`).then(({ data }) => data);

/* -------------------------------------------- merchandise / toko (public) */
export const getProducts = (params = { limit: 24 }) =>
  api.get('/merchandise/products', { params }).then(unwrapList);
export const getProductCategories = () =>
  api.get('/merchandise/categories/public').then(unwrapList);
export const getProduct = (slugOrId) =>
  api.get(`/merchandise/products/by-slug/${encodeURIComponent(slugOrId)}`).then(({ data }) => data);
export const revalidateCart = (items) =>
  api.post('/merchandise/cart/revalidate', { items }).then(({ data }) => data);
export const getShippingConfig = () =>
  api.get('/merchandise/shipping/config').then(({ data }) => data);
export const getCodStatus = () => api.get('/merchandise/cod/status').then(({ data }) => data);
export const getPaymentStatus = () =>
  api.get('/merchandise/payment/status').then(({ data }) => data);
export const searchShippingDestinations = (search, limit = 20) =>
  api.get('/merchandise/shipping/destinations', { params: { search, limit } }).then(unwrapList);
export const getShippingQuote = (payload) =>
  api.post('/merchandise/shipping/quote', payload).then(({ data }) => data);
export const checkout = (payload) =>
  api.post('/merchandise/checkout', payload).then(({ data }) => data);
export const trackOrder = (orderNumber, email) =>
  api
    .get('/merchandise/orders/track', { params: { order_number: orderNumber, email } })
    .then(({ data }) => data);

/* ------------------------------------------- pesanan milik akun (Baraya) */
export const getMyOrders = (params = { limit: 20 }) =>
  api.get('/baraya/orders', { params }).then(unwrapList);
export const getMyOrder = (orderId) =>
  api.get(`/baraya/orders/${orderId}`).then(({ data }) => data);
export const confirmOrderReceived = (orderId) =>
  api.post(`/baraya/orders/${orderId}/receive`).then(({ data }) => data);
export const rejectOrderDelivery = (orderId, payload) =>
  api.post(`/baraya/orders/${orderId}/reject`, payload).then(({ data }) => data);
export const requestOrderRefund = (orderId, payload) =>
  api.post(`/baraya/orders/${orderId}/refund`, payload).then(({ data }) => data);
export const uploadOrderEvidence = (orderId, form) =>
  api.post(`/baraya/orders/${orderId}/evidence`, form, { timeout: 60000 }).then(({ data }) => data);

/* ------------------------------------------------------ foto profil akun */
export const uploadMyPhoto = (form) =>
  api.post('/baraya/me/photo', form, { timeout: 60000 }).then(({ data }) => data);
export const deleteMyPhoto = () => api.delete('/baraya/me/photo').then(({ data }) => data);

export default {
  getActiveClub,
  getSiteContent,
  getBanners,
  getMatches,
  getMatchRelations,
  getPosts,
  getAlbums,
  getPlayers,
};
