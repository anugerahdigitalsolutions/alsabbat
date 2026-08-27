import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play, Youtube } from 'lucide-react';

/** Ambil ID video dari berbagai bentuk link YouTube (watch, youtu.be, shorts, embed, live). */
export const parseYoutubeId = (raw) => {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] || null;
    if (!host.endsWith('youtube.com')) return null;
    const v = url.searchParams.get('v');
    if (v) return v;
    const parts = url.pathname.split('/').filter(Boolean);
    const marker = parts.findIndex((p) => ['shorts', 'embed', 'live', 'v'].includes(p));
    if (marker >= 0 && parts[marker + 1]) return parts[marker + 1];
    return null;
  } catch (e) {
    return null;
  }
};

export const YOUTUBE_VIDEOS_KEY = 'home.youtube.videos';

/** Parse daftar video dari nilai CMS (JSON) → hanya video aktif, terurut. */
export const parseYoutubeList = (raw) => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.enabled !== false)
      .map((item, i) => ({ ...item, _i: i }))
      .sort((a, b) => {
        const oa = Number.isFinite(Number(a.order)) ? Number(a.order) : a._i;
        const ob = Number.isFinite(Number(b.order)) ? Number(b.order) : b._i;
        return oa - ob || a._i - b._i;
      })
      .map((item) => ({ id: parseYoutubeId(item.url || item.id), title: (item.title || '').trim() }))
      .filter((item) => item.id);
  } catch (e) {
    return [];
  }
};

/** Kumpulkan daftar video dari site content: daftar baru (JSON) → fallback key lama. */
export const collectYoutubeVideos = (t) => {
  const list = parseYoutubeList(t(YOUTUBE_VIDEOS_KEY));
  if (list.length) return list;
  return [1, 2, 3]
    .map((n) => ({ id: parseYoutubeId(t(`home.youtube.video_${n}`)), title: t(`home.youtube.title_${n}`) }))
    .filter((item) => item.id);
};

// ---------------------------------------------------- YouTube IFrame API resmi
let ytApiPromise = null;
const loadYoutubeApi = () => {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof previous === 'function') previous();
        resolve(window.YT);
      };
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    });
  }
  return ytApiPromise;
};

const IDLE_ROTATE_MS = 8000;

const ArrowButton = ({ side, onClick, label, testId }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    data-testid={testId}
    className="als-focus absolute top-1/2 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 hover:scale-105 sm:h-10 sm:w-10"
    style={{
      [side]: 10,
      transform: 'translateY(-50%)',
      backgroundColor: 'rgba(254,254,254,0.92)',
      color: 'var(--club-secondary)',
      boxShadow: '0 8px 22px rgba(0,0,0,0.28)',
    }}
  >
    {side === 'left' ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
  </button>
);

/**
 * Section YouTube di Beranda — slider 16:9.
 * - manual: panah + indikator
 * - otomatis: rotasi saat idle, dan pindah ke video berikutnya saat video selesai
 * - tanpa autoplay bersuara saat halaman dibuka (pakai thumbnail/facade)
 */
export const YoutubeShowcase = ({ videos = [], channelUrl = null }) => {
  const list = useMemo(() => videos.filter((v) => v && v.id), [videos]);
  const total = list.length;
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const holderRef = useRef(null);
  const playerRef = useRef(null);

  const active = total ? list[Math.min(index, total - 1)] : null;
  const activeId = active ? active.id : null;

  const go = useCallback(
    (next, keepPlaying = false) => {
      if (!total) return;
      setFailed(false);
      if (!keepPlaying) setPlaying(false);
      setIndex(((next % total) + total) % total);
    },
    [total]
  );

  // rotasi otomatis saat tidak ada video yang diputar
  useEffect(() => {
    if (playing || total < 2) return undefined;
    const timer = setInterval(() => setIndex((prev) => (prev + 1) % total), IDLE_ROTATE_MS);
    return () => clearInterval(timer);
  }, [playing, total]);

  // player resmi YouTube; saat video selesai → lanjut ke video berikutnya
  useEffect(() => {
    if (!playing || failed || !activeId || !holderRef.current) return undefined;
    let cancelled = false;
    const holder = holderRef.current;
    holder.innerHTML = '';
    const mount = document.createElement('div');
    holder.appendChild(mount);

    loadYoutubeApi().then((YT) => {
      if (cancelled || !YT || !YT.Player) return;
      playerRef.current = new YT.Player(mount, {
        videoId: activeId,
        width: '100%',
        height: '100%',
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
        events: {
          onStateChange: (event) => {
            if (event.data === 0) {
              if (total > 1) setIndex((prev) => (prev + 1) % total);
              else setPlaying(false);
            }
          },
          onError: () => setFailed(true),
        },
      });
    });

    return () => {
      cancelled = true;
      try {
        if (playerRef.current && playerRef.current.destroy) playerRef.current.destroy();
      } catch (e) {
        /* player sudah dilepas */
      }
      playerRef.current = null;
      if (holder) holder.innerHTML = '';
    };
  }, [playing, failed, activeId, total]);

  if (!total) {
    if (!channelUrl) return null;
    return (
      <a
        href={channelUrl}
        target="_blank"
        rel="noreferrer"
        className="als-card als-focus flex items-center gap-4 px-6 py-8 transition-shadow hover:shadow-[var(--shadow-md)]"
        data-testid="home-youtube-channel-card"
      >
        <Youtube className="h-8 w-8 shrink-0" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
        <span>
          <span className="font-display block text-base font-semibold" style={{ color: 'var(--fg)' }}>
            Tonton di kanal YouTube resmi
          </span>
          <span className="mt-1 block text-sm" style={{ color: 'var(--muted-fg)' }}>
            Highlight pertandingan, cuplikan latihan, dan cerita klub.
          </span>
        </span>
      </a>
    );
  }

  const label = active.title || 'Video YouTube AL SABBAT';

  return (
    <div className="mx-auto w-full max-w-4xl" data-testid="home-youtube-slider">
      <figure className="als-card overflow-hidden">
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16 / 9', backgroundColor: '#000000' }}>
          {playing && !failed ? (
            <div key="player" ref={holderRef} className="absolute inset-0 h-full w-full" data-testid="home-youtube-player" />
          ) : playing && failed ? (
            <div
              key="error"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center"
              data-testid="home-youtube-error"
            >
              <p className="font-display text-sm font-semibold" style={{ color: '#FEFEFE' }}>
                Video ini tidak dapat diputar di halaman.
              </p>
              <a
                href={`https://www.youtube.com/watch?v=${activeId}`}
                target="_blank"
                rel="noreferrer"
                className="als-focus font-display inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold"
                style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                data-testid="home-youtube-error-link"
              >
                <Youtube className="h-4 w-4" />
                Tonton di YouTube
              </a>
            </div>
          ) : (
            <button
              key="facade"
              type="button"
              onClick={() => {
                setFailed(false);
                setPlaying(true);
              }}
              className="als-focus group absolute inset-0 h-full w-full"
              aria-label={`Putar video: ${label}`}
              data-testid="home-youtube-play"
            >
              <img
                src={`https://i.ytimg.com/vi/${activeId}/hqdefault.jpg`}
                alt={label}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.20) 55%, rgba(1,40,145,0.58) 100%)',
                }}
                aria-hidden="true"
              />
              <span
                className="absolute left-1/2 top-1/2 inline-flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16"
                style={{
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'var(--club-primary)',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.38)',
                }}
                aria-hidden="true"
              >
                <Play className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: '#000000' }} fill="#000000" />
              </span>
            </button>
          )}

          {total > 1 ? (
            <>
              <ArrowButton
                side="left"
                label="Video sebelumnya"
                onClick={() => go(index - 1)}
                testId="home-youtube-prev"
              />
              <ArrowButton
                side="right"
                label="Video berikutnya"
                onClick={() => go(index + 1)}
                testId="home-youtube-next"
              />
            </>
          ) : null}
        </div>

        {active.title || total > 1 ? (
          <figcaption className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
            <span className="font-display min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: 'var(--fg)' }}>
              {active.title || ''}
            </span>
            {total > 1 ? (
              <span className="flex shrink-0 items-center gap-2" role="tablist" aria-label="Pilih video">
                {list.map((video, dotIndex) => (
                  <button
                    key={video.id + dotIndex}
                    type="button"
                    role="tab"
                    aria-selected={dotIndex === index}
                    aria-label={`Video ${dotIndex + 1}`}
                    onClick={() => go(dotIndex)}
                    className="als-focus h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: dotIndex === index ? 26 : 10,
                      backgroundColor: dotIndex === index ? 'var(--club-secondary)' : 'rgba(0,0,0,0.18)',
                    }}
                    data-testid={`home-youtube-dot-${dotIndex}`}
                  />
                ))}
              </span>
            ) : null}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
};

export default YoutubeShowcase;
