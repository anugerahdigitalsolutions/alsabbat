import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export const SectionShell = ({
  label,
  title,
  description,
  actionTo,
  actionLabel,
  children,
  dark = false,
  testId,
}) => (
  <section
    className="py-12 sm:py-16"
    style={dark ? { backgroundColor: 'var(--surface-2)' } : undefined}
    data-testid={testId}
  >
    <div className="als-container">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {label ? <p className="als-section-label mb-2">{label}</p> : null}
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--muted-fg)' }}>
              {description}
            </p>
          ) : null}
        </div>
        {actionTo ? (
          <Link
            to={actionTo}
            className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
            style={{ color: 'var(--club-secondary)' }}
            data-testid={`${testId}-action`}
          >
            {actionLabel}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </div>
  </section>
);

export default SectionShell;
