import React from 'react';
import { useClub } from '../../context/ClubContext';

/** Club crest mark — uses the club logo when configured, otherwise a monogram. */
export const ClubCrestMark = ({ size = 40, onDark = false, testId = 'club-crest' }) => {
  const { club, shortName, colors } = useClub();
  const initials = (shortName || 'AL SABBAT').replace(/\s+/g, '').slice(0, 3).toUpperCase();

  if (club?.logo) {
    return (
      <img
        src={club.logo}
        alt={`${shortName} logo`}
        width={size}
        height={size}
        className="rounded-[10px] object-cover"
        style={{ width: size, height: size }}
        data-testid={testId}
      />
    );
  }

  return (
    <span
      data-testid={testId}
      className="font-display inline-flex select-none items-center justify-center font-bold"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.3),
        borderRadius: 10,
        backgroundColor: colors.primary,
        color: colors.tertiary,
        border: `2px solid ${onDark ? 'rgba(254,254,254,0.35)' : colors.secondary}`,
        letterSpacing: '-0.02em',
      }}
    >
      {initials}
    </span>
  );
};

export default ClubCrestMark;
