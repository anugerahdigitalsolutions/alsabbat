import React from 'react';
import { Shield } from 'lucide-react';

const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || '?';

/**
 * Circular crest used in the mobile score cards (matches the reference).
 * Shows the real logo when the API provides one, otherwise a brand-safe
 * initial mark — never a fabricated badge.
 */
export const BrzCrest = ({ name, logo, size = 46, accent = false, onLight = false }) => {
  const style = { width: size, height: size };

  if (logo) {
    return (
      <span className="brz-crest" style={onLight ? { ...style, backgroundColor: '#fff', border: 'none' } : style}>
        <img
          src={logo}
          alt={`Logo ${name || 'tim'}`}
          style={{ width: size * 0.74, height: size * 0.74, objectFit: 'contain' }}
          loading="lazy"
          decoding="async"
        />
      </span>
    );
  }

  return (
    <span
      className="brz-crest"
      style={{
        ...style,
        fontSize: Math.max(11, size * 0.33),
        fontWeight: 800,
        letterSpacing: '-0.02em',
        ...(onLight
          ? { color: '#0a1740', backgroundColor: '#eef1f8', border: 'none' }
          : {
              color: accent ? 'var(--brz-accent)' : 'var(--brz-text)',
              backgroundColor: accent ? 'var(--brz-accent-soft)' : 'var(--brz-surface-2)',
            }),
      }}
      aria-label={name || 'Tim'}
    >
      {name ? initials(name) : <Shield size={size * 0.4} aria-hidden="true" />}
    </span>
  );
};

export default BrzCrest;
