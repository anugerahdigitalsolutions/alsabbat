/**
 * Global Maintenance Mode — sumber kebenaran SELALU backend existing
 * (`GET /api/system/maintenance`). Tidak ada penyimpanan lokal, tidak ada
 * layar maintenance palsu, dan tidak ada redirect (layar dirender di tempat
 * sehingga tidak mungkin terjadi redirect loop).
 */
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import * as endpoints from '../api/endpoints';
import { errorStatus } from '../api/client';

export const MAINTENANCE_TITLE = 'SEDANG MAINTENANCE SISTEM';
const POLL_MS = 60000;

export function useMaintenance() {
  const [state, setState] = useState({
    loading: true,
    enabled: false,
    message: null,
    updatedAt: null,
    unavailable: false,
  });

  const check = useCallback(async () => {
    try {
      const data = await endpoints.getMaintenance();
      setState({
        loading: false,
        enabled: Boolean(data?.enabled),
        message: data?.message || null,
        updatedAt: data?.updated_at || null,
        unavailable: false,
      });
    } catch (e) {
      // 404 → backend yang terpasang belum memiliki endpoint maintenance.
      // Gangguan jaringan juga TIDAK boleh memunculkan layar maintenance.
      setState({
        loading: false,
        enabled: false,
        message: null,
        updatedAt: null,
        unavailable: errorStatus(e) === 404,
      });
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(check, 0);
    const timer = setInterval(check, POLL_MS);
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') check();
    });
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      if (subscription?.remove) subscription.remove();
    };
  }, [check]);

  return { ...state, refresh: check };
}

export default useMaintenance;
