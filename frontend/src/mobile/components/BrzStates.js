import React from 'react';
import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react';

/** Loading / error / empty states styled for the AL SABBAT mobile UI. */

export const BrzSkeletonCard = ({ height = 120 }) => (
  <div className="brz-skeleton" style={{ height }} aria-hidden="true" />
);

export const BrzLoading = ({ rows = 2, height = 120, testId = 'brz-loading' }) => (
  <div className="flex flex-col gap-3" data-testid={testId} aria-busy="true">
    {Array.from({ length: rows }).map((_, index) => (
      <BrzSkeletonCard key={index} height={height} />
    ))}
  </div>
);

export const BrzError = ({ message, onRetry, testId = 'brz-error' }) => (
  <div className="brz-card brz-card--pad flex flex-col items-center gap-3 text-center" data-testid={testId}>
    <span className="brz-icon-btn" style={{ color: 'var(--brz-live)' }}>
      <AlertTriangle size={19} aria-hidden="true" />
    </span>
    <p className="brz-body">{message || 'Gagal memuat data.'}</p>
    {onRetry ? (
      <button type="button" className="brz-btn brz-btn--ghost" onClick={onRetry} data-testid={`${testId}-retry`}>
        <RotateCcw size={16} aria-hidden="true" />
        Coba lagi
      </button>
    ) : null}
  </div>
);

export const BrzEmpty = ({ icon: Icon = Inbox, title, description, action, testId = 'brz-empty' }) => (
  <div className="brz-card brz-card--pad flex flex-col items-center gap-2.5 py-7 text-center" data-testid={testId}>
    <span className="brz-icon-btn" style={{ width: 46, height: 46, color: 'var(--brz-accent)' }}>
      <Icon size={21} aria-hidden="true" />
    </span>
    <p className="text-[15px] font-semibold">{title || 'Belum ada data'}</p>
    {description ? <p className="brz-body max-w-[280px]">{description}</p> : null}
    {action}
  </div>
);

export default BrzEmpty;
