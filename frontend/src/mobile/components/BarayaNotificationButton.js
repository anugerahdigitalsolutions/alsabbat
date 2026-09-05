import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { barayaApi } from '../../lib/api';
import { useBaraya } from '../../context/BarayaAuthContext';

/**
 * Notification button — reuses the EXISTING Baraya notification API
 * (`GET /api/baraya/notifications/unread-count`). No new backend.
 */
export const BarayaNotificationButton = ({ to = '/akun' }) => {
  const navigate = useNavigate();
  const { isBaraya } = useBaraya();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let alive = true;
    if (!isBaraya) {
      setUnread(0);
      return () => {
        alive = false;
      };
    }
    barayaApi
      .get('/baraya/notifications/unread-count')
      .then(({ data }) => {
        if (alive) setUnread(Number(data?.unread || data?.count || 0));
      })
      .catch(() => {
        if (alive) setUnread(0);
      });
    return () => {
      alive = false;
    };
  }, [isBaraya]);

  return (
    <button
      type="button"
      className="brz-icon-btn relative"
      onClick={() => navigate(isBaraya ? to : '/login')}
      aria-label={unread > 0 ? `Notifikasi (${unread} belum dibaca)` : 'Notifikasi'}
      data-testid="baraya-notification-button"
    >
      <Bell size={18} aria-hidden="true" />
      {unread > 0 ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex min-w-[17px] items-center justify-center rounded-full px-1 text-[9px] font-bold"
          style={{ height: 17, backgroundColor: 'var(--brz-live)', color: '#fff' }}
          data-testid="baraya-notification-count"
        >
          {unread > 9 ? '9+' : unread}
        </span>
      ) : null}
    </button>
  );
};

export default BarayaNotificationButton;
