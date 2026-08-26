import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from './components/ui/sonner';
import { AuthProvider } from './context/AuthContext';
import { ClubProvider } from './context/ClubContext';
import { PublicLayout } from './components/public/PublicLayout';
import { AdminShell } from './components/admin/AdminShell';
import { ProtectedRoute } from './components/admin/ProtectedRoute';

import HomePage from './pages/public/HomePage';
import NewsPage from './pages/public/NewsPage';
import MatchesPage from './pages/public/MatchesPage';
import MatchDetailPage from './pages/public/MatchDetailPage';
import GalleryPage from './pages/public/GalleryPage';
import GalleryDetailPage from './pages/public/GalleryDetailPage';
import ClubPage from './pages/public/ClubPage';
import TeamsPage from './pages/public/TeamsPage';
import TeamDetailPage from './pages/public/TeamDetailPage';
import StaffDetailPage from './pages/public/StaffDetailPage';
import PlayerDetailPage from './pages/public/PlayerDetailPage';
import NewsDetailPage from './pages/public/NewsDetailPage';
import AchievementsPage from './pages/public/AchievementsPage';
import SponsorsPage from './pages/public/SponsorsPage';
import ContactPage from './pages/public/ContactPage';
import NotFoundPage from './pages/public/NotFoundPage';
import BarayaLoginPage from './pages/public/BarayaLoginPage';
import BarayaRegisterPage from './pages/public/BarayaRegisterPage';
import BarayaForgotPasswordPage from './pages/public/BarayaForgotPasswordPage';
import BarayaResetPasswordPage from './pages/public/BarayaResetPasswordPage';
import BarayaAccountPage from './pages/public/BarayaAccountPage';
import BarayaOrdersPage from './pages/public/BarayaOrdersPage';
import BarayaMemberCardPage from './pages/public/BarayaMemberCardPage';
import MemberVerifyPage from './pages/public/MemberVerifyPage';
import BarayaOrderDetailPage from './pages/public/BarayaOrderDetailPage';
import { BarayaAuthProvider } from './context/BarayaAuthContext';
import { BarayaRoute } from './components/public/BarayaRoute';
import AdminBarayaPage from './pages/admin/AdminBarayaPage';

import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminReadinessPage from './pages/admin/AdminReadinessPage';
import AdminClubPage from './pages/admin/AdminClubPage';
import AdminTeamsPage from './pages/admin/AdminTeamsPage';
import AdminPlayersPage from './pages/admin/AdminPlayersPage';
import AdminStaffPage from './pages/admin/AdminStaffPage';
import AdminSeasonsPage from './pages/admin/AdminSeasonsPage';
import AdminCompetitionsPage from './pages/admin/AdminCompetitionsPage';
import AdminMatchesPage from './pages/admin/AdminMatchesPage';
import AdminMatchLineupsPage from './pages/admin/AdminMatchLineupsPage';
import AdminMatchEventsPage from './pages/admin/AdminMatchEventsPage';
import AdminContentPage from './pages/admin/AdminContentPage';
import AdminHomeContentPage from './pages/admin/AdminHomeContentPage';
import AdminGalleryPage from './pages/admin/AdminGalleryPage';
import AdminAlbumMediaPage from './pages/admin/AdminAlbumMediaPage';
import AdminMediaPage from './pages/admin/AdminMediaPage';
import AdminSponsorsPage from './pages/admin/AdminSponsorsPage';
import AdminSocialPage from './pages/admin/AdminSocialPage';
import AdminProductsPage from './pages/admin/AdminProductsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import { AdminProductCategoriesPage, AdminProductVariantsPage } from './pages/admin/AdminProductTaxonomyPages';
import MerchandisePage from './pages/public/MerchandisePage';
import ProductDetailPage from './pages/public/ProductDetailPage';
import CartPage from './pages/public/CartPage';
import CheckoutPage from './pages/public/CheckoutPage';
import OrderTrackPage from './pages/public/OrderTrackPage';
import { CartProvider } from './context/CartContext';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSystemPage from './pages/admin/AdminSystemPage';
import AdminAchievementsPage from './pages/admin/AdminAchievementsPage';

import './App.css';
import { SiteIcons } from './lib/siteIcons';

function App() {
  return (
    <BrowserRouter>
      <SiteIcons />
      <AuthProvider>
        <ClubProvider>
          <CartProvider>
          <BarayaAuthProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/news/:slug" element={<NewsDetailPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/teams/:teamId" element={<TeamDetailPage />} />
              <Route path="/players/:playerId" element={<PlayerDetailPage />} />
              <Route path="/staff/:staffId" element={<StaffDetailPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/sponsors" element={<SponsorsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/matches/:matchId" element={<MatchDetailPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/merchandise" element={<MerchandisePage />} />
              <Route path="/merchandise/:slug" element={<ProductDetailPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order" element={<OrderTrackPage />} />
              <Route path="/gallery/:albumId" element={<GalleryDetailPage />} />
              <Route path="/club" element={<ClubPage />} />
              <Route path="/login" element={<BarayaLoginPage />} />
              <Route path="/daftar" element={<BarayaRegisterPage />} />
              <Route path="/lupa-password" element={<BarayaForgotPasswordPage />} />
              <Route path="/reset-password" element={<BarayaResetPasswordPage />} />
              <Route
                path="/akun"
                element={
                  <BarayaRoute>
                    <BarayaAccountPage />
                  </BarayaRoute>
                }
              />
              <Route
                path="/akun/kartu"
                element={
                  <BarayaRoute>
                    <BarayaMemberCardPage />
                  </BarayaRoute>
                }
              />
              <Route path="/member/verifikasi/:code" element={<MemberVerifyPage />} />
              <Route
                path="/akun/pesanan"
                element={
                  <BarayaRoute>
                    <BarayaOrdersPage />
                  </BarayaRoute>
                }
              />
              <Route
                path="/akun/pesanan/:orderId"
                element={
                  <BarayaRoute>
                    <BarayaOrderDetailPage />
                  </BarayaRoute>
                }
              />
            </Route>

            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route path="readiness" element={<AdminReadinessPage />} />
              <Route path="club" element={<AdminClubPage />} />
              <Route path="teams" element={<AdminTeamsPage />} />
              <Route path="players" element={<AdminPlayersPage />} />
              <Route path="staff" element={<AdminStaffPage />} />
              <Route path="seasons" element={<AdminSeasonsPage />} />
              <Route path="competitions" element={<AdminCompetitionsPage />} />
              <Route path="matches" element={<AdminMatchesPage />} />
              <Route path="match-lineups" element={<AdminMatchLineupsPage />} />
              <Route path="match-events" element={<AdminMatchEventsPage />} />
              <Route path="content" element={<AdminContentPage />} />
              <Route path="home-content" element={<AdminHomeContentPage />} />
              <Route path="gallery" element={<AdminGalleryPage />} />
              <Route path="gallery/:albumId" element={<AdminAlbumMediaPage />} />
              <Route path="media" element={<AdminMediaPage />} />
              <Route path="sponsors" element={<AdminSponsorsPage />} />
              <Route path="social" element={<AdminSocialPage />} />
              <Route path="products" element={<AdminProductsPage />} />
              <Route path="product-categories" element={<AdminProductCategoriesPage />} />
              <Route path="product-variants" element={<AdminProductVariantsPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="achievements" element={<AdminAchievementsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="baraya" element={<AdminBarayaPage />} />
              <Route path="system" element={<AdminSystemPage />} />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Route>

            <Route
              path="*"
              element={
                <div className="als-app">
                  <NotFoundPage />
                </div>
              }
            />
          </Routes>
          </BarayaAuthProvider>
          </CartProvider>
          <Toaster position="top-right" richColors />
        </ClubProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
