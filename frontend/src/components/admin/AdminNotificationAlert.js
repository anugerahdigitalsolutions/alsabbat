import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Volume2, X } from 'lucide-react';
import { Button } from '../ui/button';

const ALERT_TYPE = 'APPLICATION_SUBMITTED';
const SOUND_SRC = '/notification-alert.wav';
/** Batas aman: bunyi berhenti sendiri bila Admin tidak melakukan apa pun. */
const SOUND_MAX_MS = 45000;
/** Notifikasi yang sudah pernah memicu alert di tab ini (agar polling tidak
 *  menampilkan popup yang sama berulang kali). */
const SEEN_KEY = 'alsabbat.admin.alerted';

const readSeen = () => {
  try {
    const raw = window.sessionStorage.getItem(SEEN_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
};

const persistSeen = (set) => {
  try {
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify([...set].slice(-100)));
  } catch (e) {
    /* sessionStorage penuh/diblokir → alert tetap jalan, hanya tidak persist */
  }
};

/** Tujuan tombol REVIEW: pakai link dari database; bila notifikasi lama belum
 *  membawa application id, tambahkan dari reference_id. */
const reviewTarget = (item) => {
  const link = item?.link || '/admin/baraya';
  if (link.includes('application=') || !item?.reference_id) return link;
  return `${link}${link.includes('?') ? '&' : '?'}application=${item.reference_id}`;
};

/**
 * Fase 2 & 3 — popup + bunyi untuk pengajuan Pemain/Staff baru.
 * Sumber data tetap MongoDB (dikirim lewat prop `items` dari NotificationBell),
 * komponen ini hanya menampilkan alert & memutar suara.
 */
export const AdminNotificationAlert = ({ items = [], onRead, onHandled }) => {
  const navigate = useNavigate();
  const audioRef = useRef(null);
  const stopTimerRef = useRef(null);
  const seenRef = useRef(readSeen());
  const [activeId, setActiveId] = useState(null);
  const [soundBlocked, setSoundBlocked] = useState(false);

  // Kandidat alert: pengajuan baru yang belum dibaca dan belum pernah dialert.
  const pending = useMemo(
    () =>
      (items || []).filter(
        (item) => item && item.type === ALERT_TYPE && !item.read && !seenRef.current.has(item.id)
      ),
    [items]
  );
  const active = useMemo(
    () => (items || []).find((item) => item.id === activeId) || null,
    [items, activeId]
  );

  const stopSound = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      try {
        audio.pause();
        audio.currentTime = 0;
      } catch (e) {
        /* diabaikan */
      }
    }
  }, []);

  const startSound = useCallback(() => {
    // Satu instance audio untuk seluruh sesi — tidak pernah bertumpuk.
    if (!audioRef.current) {
      const audio = new Audio(SOUND_SRC);
      audio.loop = true;
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
      // Autoplay policy: jangan sampai menjadi runtime error.
      played.then(() => setSoundBlocked(false)).catch(() => setSoundBlocked(true));
    }
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      stopSound();
    }, SOUND_MAX_MS);
  }, [stopSound]);

  // Satu alert aktif pada satu waktu; berikutnya tampil setelah yang ini ditangani.
  useEffect(() => {
    if (activeId || pending.length === 0) return;
    const next = pending[0];
    setActiveId(next.id);
    startSound();
  }, [activeId, pending, startSound]);

  // Notifikasi aktif sudah dibaca dari tempat lain (lonceng / read-all) → alert selesai.
  useEffect(() => {
    if (!activeId) return;
    const stillUnread = (items || []).some((item) => item.id === activeId && !item.read);
    const stillExists = (items || []).some((item) => item.id === activeId);
    if (stillExists && !stillUnread) {
      stopSound();
      setActiveId(null);
    }
  }, [items, activeId, stopSound]);

  useEffect(() => () => stopSound(), [stopSound]);

  const markSeen = useCallback((id) => {
    seenRef.current.add(id);
    persistSeen(seenRef.current);
  }, []);

  const dismiss = () => {
    if (activeId) markSeen(activeId);
    stopSound();
    setActiveId(null);
    if (onHandled) onHandled();
  };

  const review = async () => {
    const item = active;
    stopSound();
    if (item) {
      markSeen(item.id);
      setActiveId(null);
      if (onRead) {
        try {
          await onRead(item);
        } catch (e) {
          /* status read disinkronkan polling berikutnya */
        }
      }
      navigate(reviewTarget(item));
    } else {
      setActiveId(null);
    }
    if (onHandled) onHandled();
  };

  if (!active) return null;

  const remaining = pending.filter((item) => item.id !== active.id).length;

  return (
    <div
      className="fixed bottom-5 right-5 z-[70] w-[min(360px,calc(100vw-2.5rem))]"
      role="alertdialog"
      aria-live="assertive"
      aria-labelledby="admin-alert-title"
      data-testid="admin-notification-alert"
    >
      <div
        className="space-y-3 rounded-[var(--radius-sm)] border p-4 shadow-xl"
        style={{ backgroundColor: '#FFFFFF', borderColor: 'var(--border-soft)' }}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 animate-pulse items-center justify-center rounded-full"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            aria-hidden="true"
          >
            <Bell className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p
              id="admin-alert-title"
              className="font-display text-sm font-extrabold"
              data-testid="admin-notification-alert-title"
            >
              {active.title || 'Pengajuan Baru'}
            </p>
            <p
              className="mt-1 text-xs leading-relaxed"
              style={{ color: 'var(--muted-fg)' }}
              data-testid="admin-notification-alert-message"
            >
              {active.message || 'Ada pengajuan pendaftaran Pemain/Staff baru.'}
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="als-focus rounded p-1"
            style={{ color: 'var(--muted-fg)' }}
            aria-label="Tutup pemberitahuan"
            data-testid="admin-notification-alert-close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {soundBlocked ? (
          <button
            type="button"
            onClick={startSound}
            className="als-focus flex w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] border py-2 text-[11px] font-semibold"
            style={{ borderColor: 'var(--border-soft)', color: 'var(--muted-fg)' }}
            data-testid="admin-notification-alert-enable-sound"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
            Aktifkan suara pemberitahuan
          </button>
        ) : null}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="flex-1 font-bold"
            onClick={review}
            data-testid="admin-notification-alert-review"
          >
            REVIEW
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={dismiss}
            data-testid="admin-notification-alert-later"
          >
            <BellOff className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Nanti
          </Button>
        </div>

        {remaining ? (
          <p className="text-[11px]" style={{ color: 'var(--muted-fg)' }} data-testid="admin-notification-alert-queue">
            {remaining} pengajuan baru lainnya menunggu.
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default AdminNotificationAlert;
