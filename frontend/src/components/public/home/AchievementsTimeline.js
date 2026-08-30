import React from 'react';
import { Trophy } from 'lucide-react';
import { EmptyState } from '../../shared/EmptyState';
import { resolveMediaUrl } from '../gallery/mediaUtils';

/** Horizontal honours timeline — hanya menampilkan prestasi yang benar-benar tercatat. */
export const AchievementsTimeline = ({ items = [] }) => {
  if (!items.length) {
    return (
      <EmptyState
        icon={Trophy}
        title="Belum ada prestasi tercatat"
        description="Perjalanan klub akan tampil di sini setelah prestasi dicatat pada Admin Panel."
        testId="home-achievements-empty"
      />
    );
  }

  return (
    <div className="relative" data-testid="home-achievements-timeline">
      <span className="als-hairline absolute left-0 right-0 top-[26px] hidden lg:block" aria-hidden="true" />
      <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, index) => (
          <li
            key={item.id}
            className="relative"
            style={{ animation: `als-reveal-in 620ms var(--ease-out) ${index * 90}ms both` }}
            data-testid={`home-achievement-${item.id}`}
          >
            <span
              className="relative z-10 mb-4 inline-flex h-13 w-13 items-center justify-center rounded-full p-3.5"
              style={{ backgroundColor: 'var(--club-secondary)' }}
            >
              <Trophy className="h-5 w-5" style={{ color: 'var(--club-primary)' }} aria-hidden="true" />
            </span>
            <div className="als-card als-lift p-5">
              {item.trophy_image ? (
                <img
                  src={resolveMediaUrl(item.trophy_image)}
                  alt={item.title}
                  className="mb-3 h-20 w-full rounded-[var(--radius-sm)] object-cover"
                  loading="lazy"
                  data-testid={`home-achievement-image-${item.id}`}
                />
              ) : null}
              {item.year ? (
                <p className="font-display text-2xl font-extrabold tabular-nums" style={{ color: 'var(--club-primary)' }}>
                  {item.year}
                </p>
              ) : null}
              <p className="font-display mt-1 text-base font-bold">{item.title}</p>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                {[item.competition_name, item.level].filter(Boolean).join(' · ') || item.description || ''}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
};

export default AchievementsTimeline;
