import React, { useState } from 'react';
import { Play, Youtube } from 'lucide-react';

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

/** Kumpulkan daftar video valid dari site content (maks 3). */
export const collectYoutubeVideos = (t) =>
  [1, 2, 3]
    .map((n) => ({ id: parseYoutubeId(t(`home.youtube.video_${n}`)), title: t(`home.youtube.title_${n}`) }))
    .filter((item) => item.id);

const VideoFacade = ({ video, primary = false, testId }) => {
  const [playing, setPlaying] = useState(false);
  const label = video.title || 'Video YouTube ALSABBAT';

  return (
    <figure className="als-card overflow-hidden" data-testid={testId}>
      <div className="relative w-full" style={{ aspectRatio: '16 / 9', backgroundColor: '#000000' }}>
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
            title={label}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="als-focus group absolute inset-0 h-full w-full"
            aria-label={`Putar video: ${label}`}
            data-testid={`${testId}-play`}
          >
            <img
              src={`https://i.ytimg.com/vi/${video.id}/${primary ? 'maxresdefault' : 'hqdefault'}.jpg`}
              alt={label}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              onError={(e) => {
                e.currentTarget.src = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
              }}
            />
            <span
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0.06) 0%, rgba(0,0,0,0.18) 55%, rgba(1,40,145,0.55) 100%)',
              }}
              aria-hidden="true"
            />
            <span
              className="absolute left-1/2 top-1/2 inline-flex items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
              style={{
                width: primary ? 68 : 52,
                height: primary ? 68 : 52,
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'var(--club-primary)',
                boxShadow: '0 10px 28px rgba(0,0,0,0.38)',
              }}
              aria-hidden="true"
            >
              <Play className={primary ? 'h-7 w-7' : 'h-5 w-5'} style={{ color: '#000000' }} fill="#000000" />
            </span>
          </button>
        )}
      </div>
      {video.title ? (
        <figcaption
          className="font-display px-4 py-3 text-sm font-semibold"
          style={{ color: 'var(--fg)' }}
        >
          {video.title}
        </figcaption>
      ) : null}
    </figure>
  );
};

/**
 * Section YouTube di Beranda. Video diambil dari CMS (link YouTube),
 * fallback ke kanal klub bila belum ada video yang diisi.
 */
export const YoutubeShowcase = ({ videos = [], channelUrl = null }) => {
  if (!videos.length) {
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

  return (
    <div
      className={`grid gap-4 ${videos.length > 1 ? 'lg:grid-cols-3' : ''}`}
      data-testid="home-youtube-grid"
    >
      {videos.map((video, index) => (
        <div key={video.id} className={videos.length > 1 && index === 0 ? 'lg:col-span-2' : ''}>
          <VideoFacade video={video} primary={index === 0} testId={`home-youtube-video-${index}`} />
        </div>
      ))}
    </div>
  );
};

export default YoutubeShowcase;
