import { useEffect, useState } from 'react';
import api from '../../lib/api';

/**
 * Shared competition-name lookup.
 *
 * `/api/matches` returns `competition_id` only, so the mobile cards resolve the
 * real competition name from `/api/competitions`. The request is made ONCE per
 * page load and shared by every card (no duplicate API calls).
 */
let cache = null;
let pending = null;
const subscribers = new Set();

const load = () => {
  if (cache || pending) return;
  pending = api
    .get('/competitions', { params: { limit: 200 } })
    .then(({ data }) => {
      cache = Object.fromEntries((data?.items || []).map((item) => [item.id, item.name]));
    })
    .catch(() => {
      cache = {};
    })
    .finally(() => {
      pending = null;
      subscribers.forEach((notify) => notify(cache));
    });
};

export function useCompetitionName(competitionId) {
  const [map, setMap] = useState(cache || {});

  useEffect(() => {
    if (cache) {
      setMap(cache);
      return undefined;
    }
    subscribers.add(setMap);
    load();
    return () => subscribers.delete(setMap);
  }, []);

  return competitionId ? map?.[competitionId] || null : null;
}

export default useCompetitionName;
