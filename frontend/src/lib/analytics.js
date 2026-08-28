import api from './api';

/**
 * Analytics foundation — fire-and-forget event tracking.
 * Full analytics (dashboards, funnels) is a later phase.
 */
const SESSION_KEY = 'alsabbat.session.id';

function sessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export async function trackEvent(eventType, payload = {}) {
  try {
    await api.post(
      '/analytics/events',
      {
        event_type: eventType,
        path: payload.path || window.location.pathname,
        referrer: document.referrer || null,
        entity_type: payload.entityType || null,
        entity_id: payload.entityId || null,
        metadata: payload.metadata || {},
      },
      { headers: { 'X-Session-Id': sessionId() } }
    );
  } catch (e) {
    /* analytics must never break the UI */
  }
}

export const trackPageView = (path) => trackEvent('PAGE_VIEW', { path });
