import React, { useCallback, useEffect, useState } from 'react';
import { Info, Instagram, Link2, Loader2, Music2, Unlink, Youtube } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';

const ICONS = { INSTAGRAM: Instagram, TIKTOK: Music2, YOUTUBE: Youtube };

const STATUS_LABEL = {
  CONNECTED: 'TERHUBUNG',
  DISCONNECTED: 'BELUM TERHUBUNG',
  NOT_CONNECTED: 'BELUM TERHUBUNG',
  NOT_CONFIGURED: 'BELUM DIKONFIGURASI',
  EXPIRED: 'PERLU HUBUNGKAN ULANG',
  ERROR: 'ERROR',
};

const STATUS_TONE = {
  CONNECTED: { bg: 'rgba(22,163,74,0.12)', fg: '#166534' },
  DISCONNECTED: { bg: 'rgba(0,0,0,0.06)', fg: '#3F3F46' },
  NOT_CONNECTED: { bg: 'rgba(0,0,0,0.06)', fg: '#3F3F46' },
  NOT_CONFIGURED: { bg: 'rgba(0,0,0,0.06)', fg: '#3F3F46' },
  EXPIRED: { bg: 'rgba(220,38,38,0.10)', fg: '#991B1B' },
  ERROR: { bg: 'rgba(220,38,38,0.10)', fg: '#991B1B' },
};

const CALLBACK_MESSAGE = {
  connected: ['success', 'Akun berhasil dihubungkan.'],
  denied: ['info', 'Koneksi dibatalkan di platform.'],
  invalid_state: ['error', 'Sesi OAuth tidak valid atau kedaluwarsa. Coba hubungkan ulang.'],
  error: ['error', 'Gagal menyelesaikan OAuth. Coba hubungkan ulang.'],
};

/**
 * Fase 1 — MEDIA SOSIAL: hubungkan/putuskan akun lewat OAuth resmi platform.
 * Tidak ada publishing di sini. Token tidak pernah dikirim ke browser.
 */
export const SocialConnections = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/social/connections');
      setItems(data?.items || []);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat status koneksi media sosial'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('social_oauth');
    if (!result) return;
    const [tone, message] = CALLBACK_MESSAGE[result] || ['info', 'Proses OAuth selesai.'];
    (toast[tone] || toast.info)(message);
    params.delete('social_oauth');
    params.delete('platform');
    const query = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
  }, []);

  const connect = async (platform) => {
    setBusy(platform);
    try {
      const { data } = await api.post(`/social/connections/${platform.toLowerCase()}/authorize`);
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
        return;
      }
      toast.error('URL otorisasi tidak tersedia.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memulai OAuth'));
    } finally {
      setBusy(null);
    }
  };

  const toggleEnabled = async (platform, enabled) => {
    setBusy(platform);
    try {
      await api.patch(`/social/connections/${platform.toLowerCase()}/settings`, { enabled });
      toast.success(`${platform} ${enabled ? 'diaktifkan' : 'dinonaktifkan'}.`);
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memperbarui status aktif platform'));
    } finally {
      setBusy(null);
    }
  };

  const disconnect = async (platform) => {
    setBusy(platform);
    try {
      await api.delete(`/social/connections/${platform.toLowerCase()}`);
      toast.success('Koneksi diputuskan.');
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memutuskan koneksi'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="als-card p-5 sm:p-6" data-testid="admin-social-connections">
      <h2 className="font-display text-lg font-semibold">Media Sosial</h2>
      <p className="mt-1 max-w-3xl text-sm" style={{ color: 'var(--muted-fg)' }}>
        Hubungkan akun klub melalui OAuth resmi platform. Kata sandi akun sosial tidak pernah diminta maupun
        disimpan, dan token hanya tersimpan di server.
      </p>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => {
            const Icon = ICONS[item.platform] || Link2;
            const tone = STATUS_TONE[item.status] || STATUS_TONE.DISCONNECTED;
            const isBusy = busy === item.platform;
            const enabled = item.enabled !== false;
            const canDisconnect = ['CONNECTED', 'EXPIRED', 'ERROR'].includes(item.status);
            return (
              <div
                key={item.platform}
                className="flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border p-3 sm:p-4"
                style={{ borderColor: 'rgba(1,40,145,0.12)' }}
                data-testid={`social-connection-${item.platform.toLowerCase()}`}
              >
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-sm)]"
                  style={{ backgroundColor: 'rgba(1,40,145,0.08)', color: 'var(--club-secondary)' }}
                  aria-hidden="true"
                >
                  <Icon className="h-5 w-5" />
                </span>

                <div className="min-w-0 flex-1 basis-[180px]">
                  <p className="font-display truncate text-sm font-semibold">{item.label}</p>
                  <p className="truncate text-xs" style={{ color: 'var(--muted-fg)' }}>
                    {item.account_name
                      ? item.account_name
                      : item.status === 'NOT_CONFIGURED'
                        ? `Env belum tersedia: ${(item.missing_env || []).join(', ') || '-'}`
                        : item.official_api}
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className="shrink-0 whitespace-nowrap"
                  style={{ backgroundColor: tone.bg, color: tone.fg, borderColor: 'transparent' }}
                  data-testid={`social-connection-status-${item.platform.toLowerCase()}`}
                >
                  {STATUS_LABEL[item.status] || item.status}
                </Badge>

                <label
                  className="flex shrink-0 items-center gap-2 text-xs font-semibold"
                  style={{ color: 'var(--muted-fg)' }}
                >
                  <Switch
                    checked={enabled}
                    onCheckedChange={(value) => toggleEnabled(item.platform, value)}
                    disabled={isBusy}
                    data-testid={`social-enabled-${item.platform.toLowerCase()}`}
                  />
                  {enabled ? 'Aktif' : 'Nonaktif'}
                </label>

                <div className="ml-auto shrink-0">
                  {canDisconnect ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => disconnect(item.platform)}
                      disabled={isBusy}
                      className="font-semibold"
                      data-testid={`social-disconnect-${item.platform.toLowerCase()}`}
                    >
                      {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink className="mr-2 h-4 w-4" />}
                      Putuskan
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => connect(item.platform)}
                      disabled={isBusy || !item.configured || !enabled}
                      className="font-semibold"
                      style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                      data-testid={`social-connect-${item.platform.toLowerCase()}`}
                    >
                      {isBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                      Hubungkan
                    </Button>
                  )}
                </div>
                {item.status === 'NOT_CONFIGURED' && (item.requirements || []).length ? (
                  <p
                    className="basis-full text-xs leading-relaxed"
                    style={{ color: 'var(--muted-fg)' }}
                    data-testid={`social-requirements-${item.platform.toLowerCase()}`}
                  >
                    <Info className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                    {item.official_api} — syarat: {(item.requirements || []).join('; ')}. Isi env{' '}
                    {(item.missing_env || []).join(', ')} di server, lalu muat ulang halaman ini.
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default SocialConnections;
