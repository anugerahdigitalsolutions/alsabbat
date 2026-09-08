import React, { useEffect, useState } from 'react';
import { Loader2, Power, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { apiErrorMessage } from '../../lib/api';
import { fetchMaintenanceStatus, setMaintenanceStatus } from '../../lib/maintenance';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { useAuth } from '../../context/AuthContext';

export const MaintenanceModePanel = () => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('system:write');
  const [enabled, setEnabled] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchMaintenanceStatus()
      .then((data) => {
        setEnabled(!!data?.enabled);
        setUpdatedAt(data?.updated_at || null);
      })
      .catch((e) => toast.error(apiErrorMessage(e, 'Gagal membaca status maintenance.')));
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      const data = await setMaintenanceStatus(!enabled);
      setEnabled(!!data?.enabled);
      setUpdatedAt(data?.updated_at || null);
      toast.success(data?.enabled ? 'Maintenance Mode AKTIF.' : 'Maintenance Mode nonaktif.');
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal mengubah status maintenance.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="als-card p-5" data-testid="maintenance-panel">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Wrench className="mb-3 h-5 w-5" style={{ color: 'var(--club-secondary)' }} />
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
            Maintenance Mode
          </p>
          <Badge
            variant="outline"
            className="mt-2"
            style={{
              backgroundColor: enabled ? 'rgba(220,38,38,0.12)' : 'rgba(22,163,74,0.12)',
              color: enabled ? '#991B1B' : '#166534',
            }}
            data-testid="maintenance-status-badge"
          >
            {enabled === null ? 'Memuat…' : enabled ? 'ON / Maintenance Aktif' : 'OFF / Website Normal'}
          </Badge>
          <p className="mt-3 max-w-xl text-xs" style={{ color: 'var(--muted-fg)' }}>
            Saat ON, seluruh halaman publik menampilkan “SEDANG MAINTENANCE SISTEM”. Admin Panel tetap bisa
            diakses. Status disimpan di server (berlaku global, tanpa deploy ulang).
            {updatedAt ? ` Terakhir diubah: ${new Date(updatedAt).toLocaleString('id-ID')}.` : ''}
          </p>
        </div>
        {canWrite ? (
          <Button
            onClick={toggle}
            disabled={busy || enabled === null}
            style={
              enabled
                ? { backgroundColor: 'var(--club-primary)', color: '#000000' }
                : { backgroundColor: '#991B1B', color: '#FFFFFF' }
            }
            data-testid="maintenance-toggle"
          >
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Power className="mr-2 h-4 w-4" />}
            {enabled ? 'Matikan Maintenance' : 'Aktifkan Maintenance'}
          </Button>
        ) : (
          <p className="text-xs" style={{ color: 'var(--muted-fg)' }} data-testid="maintenance-no-permission">
            Butuh permission <span className="font-mono">system:write</span>.
          </p>
        )}
      </div>
    </div>
  );
};
