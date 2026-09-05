/**
 * Small data-fetching hooks (loading / error / reload) used by every screen.
 * All data comes from the existing API — there is no local cache of fixtures.
 *
 * The fetcher is kept in a ref so screens can pass an inline arrow function;
 * re-fetching is driven by a serialised dependency key plus an explicit
 * reload/refresh counter (no setState inside the effect body).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { apiErrorMessage, errorStatus } from '../api/client';

export function useResource(fetcher, deps = [], options = {}) {
  const { enabled = true, fallbackMessage } = options;
  const key = JSON.stringify(deps ?? []);
  const fetcherRef = useRef(fetcher);
  const [state, setState] = useState({ data: null, error: null, status: null });
  const [refreshing, setRefreshing] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    (async () => {
      try {
        const result = await fetcherRef.current();
        if (alive) setState({ data: result, error: null, status: 200 });
      } catch (e) {
        if (alive) {
          setState({
            data: null,
            error: apiErrorMessage(e, fallbackMessage || 'Gagal memuat data.'),
            status: errorStatus(e),
          });
        }
      } finally {
        if (alive) setRefreshing(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [enabled, key, tick, fallbackMessage]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  const refresh = useCallback(() => {
    setRefreshing(true);
    setTick((value) => value + 1);
  }, []);

  return {
    data: state.data,
    error: state.error,
    status: state.status,
    loading: enabled && !state.data && !state.error,
    refreshing,
    reload,
    refresh,
  };
}

export function useResourceList(fetcher, deps = [], options = {}) {
  const resource = useResource(fetcher, deps, options);
  return {
    ...resource,
    items: resource.data?.items || [],
    total: resource.data?.total || 0,
  };
}

export default useResource;
