import React from 'react';
import { BannerManager } from '../../components/admin/BannerManager';
import { SiteContentForm } from '../../components/admin/SiteContentForm';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { useClub } from '../../context/ClubContext';

export default function AdminHomeContentPage() {
  const { shortName } = useClub();
  const clubName = shortName || 'ALSABBAT';

  return (
    <div className="space-y-6" data-testid="admin-home-content-page">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight" data-testid="admin-home-content-title">
          Konten Homepage
        </h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--muted-fg)' }}>
          Kelola banner hero dan teks editorial homepage tanpa mengubah kode.
        </p>
      </div>

      <Tabs defaultValue="banners">
        <TabsList data-testid="admin-home-content-tabs">
          <TabsTrigger value="banners" data-testid="admin-home-content-tab-banners">
            Banner Hero
          </TabsTrigger>
          <TabsTrigger value="content" data-testid="admin-home-content-tab-content">
            Konten Situs
          </TabsTrigger>
        </TabsList>
        <TabsContent value="banners" className="mt-6">
          <BannerManager clubName={clubName} />
        </TabsContent>
        <TabsContent value="content" className="mt-6">
          <SiteContentForm clubName={clubName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
