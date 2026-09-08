import { useEffect, useState } from 'react';
import api from './api';

/**
 * Status Maintenance Mode global — sumber kebenaran selalu backend
 * (`GET /api/system/maintenance`), bukan localStorage.
 */
export const useMaintenanceStatus = () => {
  const [state, setState] = useState({ loading: true, enabled: false });

  useEffect(() => {
    let active = true;
    api
      .get('/system/maintenance')
      .then(({ data }) => {
        if (active) setState({ loading: false, enabled: !!data?.enabled });
      })
      .catch(() => {
        // Gagal membaca status → biarkan website normal (tanpa layar palsu).
        if (active) setState({ loading: false, enabled: false });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
};

export const fetchMaintenanceStatus = async () => {
  const { data } = await api.get('/system/maintenance');
  return data;
};

export const setMaintenanceStatus = async (enabled) => {
  const { data } = await api.put('/system/maintenance', { enabled });
  return data;
};
