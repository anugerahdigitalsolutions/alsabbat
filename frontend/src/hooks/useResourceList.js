import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api, { apiErrorMessage } from '../lib/api';

/**
 * Generic list fetcher for `{ items, total, limit, skip }` endpoints.
 * Handles loading / error / empty states consistently across the app.
 */
export function useResourceList(endpoint, params = {}, options = {}) {
  const { enabled = true, client = api } = options;
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const key = JSON.stringify(params);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.get(endpoint, { params: JSON.parse(key) });
      if (!mounted.current) return;
      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } catch (e) {
      if (!mounted.current) return;
      setError(apiErrorMessage(e));
      setItems([]);
      setTotal(0);
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [endpoint, key, enabled, client]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return useMemo(
    () => ({ items, total, loading, error, reload: fetchData }),
    [items, total, loading, error, fetchData]
  );
}

export default useResourceList;
