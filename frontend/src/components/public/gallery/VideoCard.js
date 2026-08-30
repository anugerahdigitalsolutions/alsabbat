import React from 'react';
import { Play } from 'lucide-react';
import { resolveMediaUrl } from './mediaUtils';

/**
 * HTML5 video card. Never autoplays, never used as background.
 * `preload="none"` keeps album pages light.
 */
export const VideoCard = ({ item, testId }) => (
  <figure className="als-card overflow-hidden" data-testid={testId}>
    <video
      controls
      preload="none"
      playsInline
      poster={resolveMediaUrl(item.thumbnail_url) || undefined}
      className="h-full w-full bg-black"
      style={{ aspectRatio: '16 / 9' }}
      aria-label={item.alt_text || item.caption || item.file_name}
    >
      <source src={resolveMediaUrl(item.url)} type={item.mime_type || 'video/mp4'} />
      Browser Anda tidak mendukung pemutar video HTML5.
    </video>
    <figcaption className="flex items-start gap-2 p-4 text-sm">
      <Play className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--club-secondary)' }} />
      <span>
        <span className="block font-semibold">{item.caption || item.file_name}</span>
        {item.alt_text ? (
          <span className="mt-1 block text-xs" style={{ color: 'var(--muted-fg)' }}>
            {item.alt_text}
          </span>
        ) : null}
      </span>
    </figcaption>
  </figure>
);

export default VideoCard;
