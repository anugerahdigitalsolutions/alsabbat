import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** Section header: title on the left, "Lihat semua" accent link on the right. */
export const BrzSection = ({ title, to, onAction, actionLabel = 'Lihat semua', children, testId }) => (
  <section className="mt-6" data-testid={testId}>
    <div className="brz-section-head">
      <h2 className="brz-h2 brz-clamp-1 min-w-0">{title}</h2>
      {to ? (
        <Link to={to} className="brz-viewall" data-testid={testId ? `${testId}-action` : undefined}>
          {actionLabel}
          <ChevronRight size={15} aria-hidden="true" />
        </Link>
      ) : onAction ? (
        <button type="button" className="brz-viewall" onClick={onAction}>
          {actionLabel}
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      ) : null}
    </div>
    {children}
  </section>
);

export default BrzSection;
