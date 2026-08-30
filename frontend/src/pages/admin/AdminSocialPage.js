import React from 'react';
import { AppStoreLinksPanel } from '../../components/admin/AppStoreLinksPanel';

/** Admin → Aplikasi Mobile. Hanya konfigurasi tautan App Store & Play Store.
 *  Section social publishing lain disembunyikan dari UI (data/API existing tidak diubah). */
export default function AdminSocialPage() {
  return (
    <div className="space-y-8" data-testid="admin-social-page">
      <div>
        <h1 className="font-display text-2xl font-bold" data-testid="admin-mobile-app-title">
          Aplikasi Mobile
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--muted-fg)' }}>
          Kelola tautan aplikasi AL SABBAT untuk App Store dan Google Play.
        </p>
      </div>

      <AppStoreLinksPanel />
    </div>
  );
}
