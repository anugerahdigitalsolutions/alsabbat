import React from 'react';

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || '?';

/** Opponent crest: real logo when available, otherwise a brand-safe initial shield. */
export const OpponentCrest = ({ name, logo, size = 48, onDark = false }) => {
  const style = { width: size, height: size };
  if (logo) {
    return (
      <img
        src={logo}
        alt={`Logo ${name || 'lawan'}`}
        className="rounded-[12px] object-contain"
        style={style}
        loading="lazy"
        decoding="async"
      />
    );
  }
  return (
    <span
      className="font-display inline-flex items-center justify-center rounded-[12px] font-extrabold"
      style={{
        ...style,
        fontSize: size * 0.34,
        backgroundColor: onDark ? 'rgba(254,254,254,0.12)' : 'rgba(1,40,145,0.08)',
        color: onDark ? 'var(--club-primary)' : 'var(--club-secondary)',
        border: onDark ? '1px solid rgba(252,207,43,0.35)' : '1px solid rgba(1,40,145,0.14)',
      }}
      aria-label={name || 'Lawan'}
    >
      {initials(name)}
    </span>
  );
};

export default OpponentCrest;
