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
import GalleryPage from './pages/public/GalleryPage';
import ClubPage from './pages/public/ClubPage';
import NotFoundPage from './pages/public/NotFoundPage';

import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminClubPage from './pages/admin/AdminClubPage';
import AdminTeamsPage from './pages/admin/AdminTeamsPage';
import AdminPlayersPage from './pages/admin/AdminPlayersPage';
import AdminStaffPage from './pages/admin/AdminStaffPage';
import AdminSeasonsPage from './pages/admin/AdminSeasonsPage';
import AdminCompetitionsPage from './pages/admin/AdminCompetitionsPage';
import AdminMatchesPage from './pages/admin/AdminMatchesPage';
import AdminContentPage from './pages/admin/AdminContentPage';
import AdminGalleryPage from './pages/admin/AdminGalleryPage';
import AdminMediaPage from './pages/admin/AdminMediaPage';
import AdminSponsorsPage from './pages/admin/AdminSponsorsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSystemPage from './pages/admin/AdminSystemPage';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClubProvider>
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/news" element={<NewsPage />} />
              <Route path="/matches" element={<MatchesPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/club" element={<ClubPage />} />
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
              <Route path="club" element={<AdminClubPage />} />
              <Route path="teams" element={<AdminTeamsPage />} />
              <Route path="players" element={<AdminPlayersPage />} />
              <Route path="staff" element={<AdminStaffPage />} />
              <Route path="seasons" element={<AdminSeasonsPage />} />
              <Route path="competitions" element={<AdminCompetitionsPage />} />
              <Route path="matches" element={<AdminMatchesPage />} />
              <Route path="content" element={<AdminContentPage />} />
              <Route path="gallery" element={<AdminGalleryPage />} />
              <Route path="media" element={<AdminMediaPage />} />
              <Route path="sponsors" element={<AdminSponsorsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
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
          <Toaster position="top-right" richColors />
        </ClubProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
