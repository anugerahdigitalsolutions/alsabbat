import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Volume2, X } from 'lucide-react';

const SOUND_SRC = '/notification-tring.wav';
/** Notifikasi yang sudah dibunyikan/ditampilkan di tab ini. */
const CHIMED_KEY = 'alsabbat.baraya.chimed';

const readChimed = () => {
  try {
    const raw = window.sessionStorage.getItem(CHIMED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
};

const persistChimed = (set) => {
  try {
    window.sessionStorage.setItem(CHIMED_KEY, JSON.stringify([...set].slice(-100)));
  } catch (e) {
    /* diabaikan: hanya optimasi anti-duplikat */
  }
};

/**
 * Notifikasi in-app untuk akun Baraya (hasil keputusan Admin: disetujui/ditolak).
 *
 * - Data berasal dari notification center MongoDB (via NotificationBell → `items`).
 * - Bunyi "tring" hanya SEKALI per notifikasi baru (dicatat di sessionStorage),
 *   tidak loop, tidak berbunyi ulang saat polling / re-render.
 * - Notifikasi yang sudah ada sebelum halaman dibuka (riwayat lama) tidak
 *   membunyikan apa pun; hanya notifikasi yang masuk saat halaman terbuka.
 */
export const UserNotificationAlert = ({ items = [], loadSeq = 0, onRead }) => {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const chimedRef = useRef(readChimed());
  const baselineRef = useRef(false);
  const [handled, setHandled] = useState(new Set());
  const [visibleId, setVisibleId] = useState(null);
  const [soundBlocked, setSoundBlocked] = useState(false);

  const unread = useMemo(
    () => (items || []).filter((item) => item && !item.read && !handled.has(item.id)),
    [items, handled]
  );
  const active = useMemo(
    () => (items || []).find((item) => item.id === visibleId) || null,
    [items, visibleId]
  );

  const chime = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio(SOUND_SRC);
      audio.loop = false; // "tring" sekali — tidak pernah berulang
      audio.preload = 'auto';
      audioRef.current = audio;
    }
    const audio = audioRef.current;
    try {
      audio.currentTime = 0;
    } catch (e) {
      /* diabaikan */
    }
    const played = audio.play();
    if (played && typeof played.then === 'function') {
      played.then(() => setSoundBlocked(false)).catch(() => setSoundBlocked(true));
    }
  }, []);

  useEffect(() => {
    // `loadSeq` bertambah setiap kali NotificationBell selesai mengambil data.
    // Selama masih 0, daftar `items` belum berasal dari server → jangan
    // dianggap notifikasi baru (mencegah bunyi saat halaman baru dibuka).
    if (!loadSeq) return;
    if (!baselineRef.current) {
      // Muatan pertama = riwayat lama → catat tanpa bunyi/popup.
      unread.forEach((item) => chimedRef.current.add(item.id));
      persistChimed(chimedRef.current);
      baselineRef.current = true;
      return;
    }
    const fresh = unread.find((item) => !chimedRef.current.has(item.id));
    if (!fresh) return;
    chimedRef.current.add(fresh.id);
    persistChimed(chimedRef.current);
    setVisibleId(fresh.id);
    chime();
  }, [loadSeq, unread, chime]);

  // Sudah dibaca dari lonceng / read-all → popup ikut tertutup.
  useEffect(() => {
    if (!visibleId) return;
    const stillUnread = (items || []).some((item) => item.id === visibleId && !item.read);
    if (!stillUnread) setVisibleId(null);
  }, [items, visibleId]);

  const close = () => setVisibleId(null);

  const open = () => {
    const item = active;
    setVisibleId(null);
    if (!item) return;
    setHandled((prev) => new Set(prev).add(item.id));
    Promise.resolve(onRead ? onRead(item) : null)
      .catch(() => {
        /* status read disinkronkan polling berikutnya */
      })
      .finally(() => {
        navigate(item.link || '/akun');
      });
  };

  if (!active) return null;

  // Header memakai backdrop-filter (membuat containing block baru), sehingga
  // kartu dipasang lewat portal agar tetap menempel di kanan-bawah viewport.
  return createPortal(
    <div
      className="fixed bottom-5 right-5 z-[70] w-[min(340px,calc(100vw-2.5rem))]"
      role="status"
      aria-live="polite"
      data-testid="baraya-notification-alert"
    >
      <div
        className="space-y-3 rounded-[var(--radius-sm)] border p-4 shadow-xl"
        style={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border-soft)' }}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            aria-hidden="true"
          >
            <Bell className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              className="font-display text-sm font-extrabold"
              data-testid="baraya-notification-alert-title"
            >
              {active.title || 'Pemberitahuan Baru'}
            </p>
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{ color: 'var(--muted-fg)' }}
              data-testid="baraya-notification-alert-message"
            >
              {active.message || ''}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="als-focus rounded p-1"
            style={{ color: 'var(--muted-fg)' }}
            aria-label="Tutup pemberitahuan"
            data-testid="baraya-notification-alert-close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {soundBlocked ? (
          <button
            type="button"
            onClick={chime}
            className="als-focus flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border py-2 text-[11px] font-semibold"
            style={{ borderColor: 'var(--border-soft)', color: 'var(--muted-fg)' }}
            data-testid="baraya-notification-alert-enable-sound"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            Aktifkan suara pemberitahuan
          </button>
        ) : null}

        <button
          type="button"
          onClick={open}
          className="als-focus font-display flex min-h-[40px] w-full items-center justify-center rounded-[var(--radius-sm)] text-sm font-bold"
          style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
          data-testid="baraya-notification-alert-open"
        >
          Lihat Detail
        </button>
      </div>
    </div>,
    document.body
  );
};

export default UserNotificationAlert;
