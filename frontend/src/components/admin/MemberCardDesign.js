import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { MemberCard } from '../member/MemberCard';
import { MediaPicker } from '../shared/MediaPicker';
import { MEDIA_SPECS } from '../../lib/mediaHints';
import { Button } from '../ui/button';

const PREVIEW_CARD = {
  member_number: 'ALS-000001',
  member_code: 'contoh-pratinjau-kartu-member',
  full_name: 'Nama Baraya ALSABBAT',
  photo_url: null,
  status: 'ACTIVE',
  joined_at: new Date().toISOString(),
};

const BACKGROUND_KEY = 'member.card.background_url';

/** Admin: latar Kartu Member (Media Library) + pratinjau memakai renderer kartu yang sama. */
export const MemberCardDesign = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('content:write');
  const [background, setBackground] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/site-content/public');
      setBackground(data?.items?.[BACKGROUND_KEY] || '');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat desain kartu'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (value, message) => {
    setSaving(true);
    try {
      await api.put('/site-content/bulk', {
        items: [{ key: BACKGROUND_KEY, value, label: 'Latar Kartu (URL gambar)', group: 'Kartu Member' }],
      });
      setBackground(value);
      toast.success(message);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan desain kartu'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="als-card p-6" data-testid="admin-member-card-design">
      <h2 className="font-display text-lg font-semibold">Desain Kartu Member</h2>
      <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--muted-fg)' }}>
        Latar berlaku untuk semua kartu Baraya. Kosongkan untuk memakai latar default ALSABBAT. Overlay navy otomatis
        dipasang agar nama, nomor, dan QR tetap terbaca. Pilih gambar dengan area kosong yang cukup (hindari wajah atau
        teks di tengah) dan utamakan berkas dari Media Library agar tombol Simpan Kartu berfungsi optimal.
      </p>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)]">
          <div className="space-y-4">
            <MediaPicker
              value={background}
              onChange={setBackground}
              testId="admin-card-background"
              spec={MEDIA_SPECS.memberCardBackground}
              hint="Gunakan gambar dengan area kosong yang cukup (hindari wajah/teks di tengah) agar nama, nomor, dan QR tetap terbaca."
            />
            {canWrite ? (
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => persist((background || '').trim(), 'Latar kartu member tersimpan')}
                  disabled={saving}
                  className="font-semibold"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                  data-testid="admin-card-background-save"
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Simpan Latar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setBackground('');
                    persist('', 'Latar dikembalikan ke default ALSABBAT');
                  }}
                  disabled={saving}
                  data-testid="admin-card-background-reset"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset ke Default
                </Button>
              </div>
            ) : (
              <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
                Anda tidak memiliki izin mengubah konten.
              </p>
            )}
          </div>

          <div>
            <p className="als-section-label mb-3">Pratinjau Kartu</p>
            <MemberCard card={PREVIEW_CARD} design={{ background_url: background }} testId="admin-card-preview" />
            <p className="mt-3 text-xs" style={{ color: 'var(--muted-fg)' }}>
              Data pada pratinjau hanya contoh tampilan dan tidak pernah disimpan ke database.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberCardDesign;
