import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

export const SectionShell = ({
  label,
  title,
  description,
  actionTo,
  actionLabel,
  children,
  dark = false,
  reveal = true,
  testId,
}) => {
  const [ref, shown] = useScrollReveal();

  return (
    <section
      ref={reveal ? ref : undefined}
      className={[
        'py-12 sm:py-16',
        reveal ? (shown ? 'als-reveal-shown' : 'als-reveal-hidden') : '',
      ].join(' ')}
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
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors duration-200 hover:gap-2.5"
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
};

export default SectionShell;
