import React, { useEffect, useState } from 'react';
import { Save, Smartphone, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

const EMPTY = {
  app_playstore_url: '',
  app_playstore_enabled: false,
  app_appstore_url: '',
  app_appstore_enabled: false,
};

const isHttps = (value) => !value || /^https:\/\/[^\s]+$/i.test(value.trim());

/** Fase 4 — konfigurasi tautan Google Play & App Store (dipakai ikon di footer website). */
export const AppStoreLinksPanel = () => {
  const [form, setForm] = useState(EMPTY);
  const [clubId, setClubId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/club/active');
      const club = data?.club || {};
      setClubId(club.id || null);
      setForm({
        app_playstore_url: club.app_playstore_url || '',
        app_playstore_enabled: !!club.app_playstore_enabled,
        app_appstore_url: club.app_appstore_url || '',
        app_appstore_enabled: !!club.app_appstore_enabled,
      });
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat konfigurasi aplikasi.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (override) => {
    const payload = { ...form, ...(override || {}) };
    if (!isHttps(payload.app_playstore_url) || !isHttps(payload.app_appstore_url)) {
      toast.error('Tautan harus memakai https:// dan tanpa spasi.');
      return;
    }
    if (!clubId) {
      toast.error('Profil klub belum tersedia.');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/club/${clubId}`, {
        app_playstore_url: payload.app_playstore_url || '',
        app_playstore_enabled: payload.app_playstore_enabled,
        app_appstore_url: payload.app_appstore_url || '',
        app_appstore_enabled: payload.app_appstore_enabled,
      });
      setForm(payload);
      toast.success('Konfigurasi aplikasi disimpan.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan konfigurasi aplikasi.'));
    } finally {
      setSaving(false);
    }
  };

  const clearOne = (key, enabledKey) => save({ [key]: '', [enabledKey]: false });

  const Row = ({ title, urlKey, enabledKey, placeholder, testId }) => (
    <div className="rounded-[var(--radius-md)] border p-4" style={{ borderColor: 'rgba(1,40,145,0.12)' }} data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-sm font-semibold">{title}</p>
        <label className="flex items-center gap-2 text-xs font-semibold" style={{ color: 'var(--muted-fg)' }}>
          <Switch
            checked={form[enabledKey]}
            onCheckedChange={(value) => setForm((f) => ({ ...f, [enabledKey]: value }))}
            data-testid={`${testId}-enabled`}
          />
          {form[enabledKey] ? 'Tampil di website' : 'Disembunyikan'}
        </label>
      </div>
      <Label className="mb-1.5 mt-3 block">URL</Label>
      <Input
        value={form[urlKey]}
        onChange={(e) => setForm((f) => ({ ...f, [urlKey]: e.target.value }))}
        placeholder={placeholder}
        data-testid={`${testId}-url`}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => save()}
          disabled={saving || loading}
          className="font-semibold"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          data-testid={`${testId}-save`}
        >
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          Simpan
        </Button>
        {form[urlKey] ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => clearOne(urlKey, enabledKey)}
            disabled={saving || loading}
            className="font-semibold"
            data-testid={`${testId}-clear`}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
            Hapus URL
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <section className="als-card p-5 sm:p-6" data-testid="admin-app-store-links">
      <h2 className="font-display text-lg font-semibold">
        <Smartphone className="mr-2 inline h-5 w-5" aria-hidden="true" />
        Aplikasi (Play Store &amp; App Store)
      </h2>
      <p className="mt-1 max-w-3xl text-sm" style={{ color: 'var(--muted-fg)' }}>
        Ikon di footer website hanya tampil bila platform diaktifkan dan URL-nya terisi. Wajib https://.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Row
          title="Google Play Store"
          urlKey="app_playstore_url"
          enabledKey="app_playstore_enabled"
          placeholder="https://play.google.com/store/apps/details?id=..."
          testId="admin-app-playstore"
        />
        <Row
          title="Apple App Store"
          urlKey="app_appstore_url"
          enabledKey="app_appstore_enabled"
          placeholder="https://apps.apple.com/id/app/..."
          testId="admin-app-appstore"
        />
      </div>
    </section>
  );
};

export default AppStoreLinksPanel;
