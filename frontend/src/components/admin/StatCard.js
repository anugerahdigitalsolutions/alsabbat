import React from 'react';
import { Link } from 'react-router-dom';

export const StatCard = ({ label, value, Icon, to, hint, testId }) => {
  const body = (
    <div
      className="relative overflow-hidden p-5 transition-shadow duration-300 hover:shadow-[var(--shadow-md)]"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-md)',
      }}
      data-testid={testId}
    >
      <span
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: 'var(--club-primary)' }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
            {label}
          </p>
          <p className="font-display mt-2 text-3xl font-bold tabular-nums" style={{ color: 'var(--fg)' }}>
            {value}
          </p>
          {hint ? (
            <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
              {hint}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)]"
            style={{ backgroundColor: 'rgba(1,40,145,0.07)' }}
          >
            <Icon className="h-5 w-5" style={{ color: 'var(--club-secondary)' }} />
          </span>
        ) : null}
      </div>
    </div>
  );

  return to ? (
    <Link to={to} className="block">
      {body}
    </Link>
  ) : (
    body
  );
};

export default StatCard;
