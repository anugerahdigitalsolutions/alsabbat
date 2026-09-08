import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const StatCard = ({ label, value, Icon, to, hint, accent = false, testId }) => {
  const body = (
    <div
      className="group relative h-full overflow-hidden p-5"
      style={{
        backgroundColor: accent ? '#012891' : '#FFFFFF',
        backgroundImage: accent
          ? 'radial-gradient(420px circle at 100% 0%, rgba(252,207,43,0.30), transparent 60%)'
          : 'none',
        border: `1px solid ${accent ? 'rgba(1,40,145,0.35)' : 'var(--adm-border, rgba(1,40,145,0.10))'}`,
        borderRadius: 'var(--adm-radius, 20px)',
        boxShadow: 'var(--adm-shadow, 0 12px 28px -18px rgba(1,40,145,0.28))',
        transition: 'box-shadow 260ms var(--ease-out), transform 260ms var(--ease-out)',
      }}
      data-testid={testId}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: accent ? 'rgba(255,255,255,0.72)' : 'rgba(11,18,32,0.55)' }}
          >
            {label}
          </p>
          <p
            className="font-display mt-3 text-3xl font-bold tabular-nums"
            style={{ color: accent ? '#FFFFFF' : 'var(--fg)' }}
          >
            {value}
          </p>
          {hint ? (
            <p className="mt-1.5 text-xs" style={{ color: accent ? 'rgba(255,255,255,0.62)' : 'var(--muted-fg)' }}>
              {hint}
            </p>
          ) : null}
        </div>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:-translate-y-0.5"
          style={{
            backgroundColor: accent ? 'rgba(255,255,255,0.14)' : 'rgba(1,40,145,0.07)',
          }}
        >
          {Icon ? (
            <Icon className="h-[18px] w-[18px]" style={{ color: accent ? '#FCCF2B' : 'var(--club-secondary)' }} />
          ) : (
            <ArrowUpRight className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
          )}
        </span>
      </div>

      {to ? (
        <span
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold"
          style={{ color: accent ? '#FCCF2B' : 'var(--club-secondary)' }}
        >
          Kelola
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
        </span>
      ) : null}
    </div>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
};

export default StatCard;
