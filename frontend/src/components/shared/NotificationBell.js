import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Button } from '../ui/button';

const relativeTime = (value) => {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} hari lalu`;
  try {
    return new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (e) {
    return value;
  }
};

/** Icon lonceng + riwayat notifikasi (dipakai Admin Panel dan akun Baraya).
 *  Data persisten dari backend, bukan popup sementara. */
export const NotificationBell = ({
  client,
  basePath,
  testId = 'notification-bell',
  enabled = true,
  buttonClassName = '',
  iconClassName = 'h-[18px] w-[18px]',
  iconStyle,
  pollMs = 60000,
}) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const { data } = await client.get(basePath, { params: { limit: 30 } });
      if (!mounted.current) return;
      setItems(data?.items || []);
      setUnread(data?.unread || 0);
    } catch (e) {
      if (mounted.current) {
        setItems([]);
        setUnread(0);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [client, basePath, enabled]);

  useEffect(() => {
    load();
    if (!enabled || !pollMs) return undefined;
    const timer = setInterval(load, pollMs);
    return () => clearInterval(timer);
  }, [load, enabled, pollMs]);

  const markRead = async (item) => {
    if (item.read) return;
    try {
      const { data } = await client.patch(`${basePath}/${item.id}/read`);
      setItems((list) => list.map((it) => (it.id === item.id ? { ...it, read: true } : it)));
      setUnread(data?.unread ?? Math.max(0, unread - 1));
    } catch (e) {
      /* biarkan status lama; polling berikutnya menyinkronkan */
    }
  };

  const openItem = async (item) => {
    await markRead(item);
    if (item.link) {
      setOpen(false);
      navigate(item.link);
    }
  };

  const markAll = async () => {
    try {
      await client.post(`${basePath}/read-all`);
      setItems((list) => list.map((it) => ({ ...it, read: true })));
      setUnread(0);
    } catch (e) {
      /* diabaikan; polling menyinkronkan */
    }
  };

  if (!enabled) return null;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`als-focus relative inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 hover:bg-[color:rgba(1,40,145,0.07)] ${buttonClassName}`}
          aria-label={unread ? `Notifikasi (${unread} belum dibaca)` : 'Notifikasi'}
          data-testid={testId}
        >
          <Bell className={iconClassName} style={iconStyle || { color: 'var(--club-secondary)' }} aria-hidden="true" />
          {unread ? (
            <span
              className="font-display absolute -right-0.5 -top-0.5 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold"
              style={{ backgroundColor: '#DC2626', color: '#FFFFFF' }}
              data-testid={`${testId}-badge`}
            >
              {unread > 99 ? '99+' : unread}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] bg-white p-0" data-testid={`${testId}-panel`}>
        <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: 'var(--border-soft)' }}>
          <div>
            <p className="font-display text-sm font-bold">Notifikasi</p>
            <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }} data-testid={`${testId}-unread-label`}>
              {unread ? `${unread} belum dibaca` : 'Semua sudah dibaca'}
            </p>
          </div>
          {unread ? (
            <Button variant="outline" size="sm" onClick={markAll} data-testid={`${testId}-mark-all`}>
              <CheckCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Tandai dibaca
            </Button>
          ) : null}
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {loading && !items.length ? (
            <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--muted-fg)' }} data-testid={`${testId}-loading`}>
              Memuat notifikasi…
            </p>
          ) : !items.length ? (
            <p className="px-4 py-8 text-center text-xs" style={{ color: 'var(--muted-fg)' }} data-testid={`${testId}-empty`}>
              Belum ada notifikasi.
            </p>
          ) : (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className="flex w-full items-start gap-2.5 border-b px-4 py-3 text-left transition-colors hover:bg-[color:rgba(1,40,145,0.04)]"
                    style={{ borderColor: 'var(--border-soft)' }}
                    data-testid={`${testId}-item-${item.id}`}
                    data-read={item.read ? 'true' : 'false'}
                  >
                    <span
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: item.read ? 'transparent' : 'var(--club-primary)' }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className={`block text-sm ${item.read ? 'font-medium' : 'font-bold'}`}>{item.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                        {item.message}
                      </span>
                      <span className="mt-1 block text-[11px]" style={{ color: 'var(--muted-fg)' }}>
                        {relativeTime(item.created_at)}
                        {item.read ? ' · sudah dibaca' : ' · belum dibaca'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
