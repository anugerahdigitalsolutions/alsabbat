import React from 'react';
import { Skeleton } from '../ui/skeleton';

export const LoadingState = ({ rows = 3, variant = 'cards', label = 'Memuat data', testId = 'loading-state' }) => {
  if (variant === 'table') {
    return (
      <div className="space-y-2" data-testid={testId} aria-busy="true" aria-label={label}>
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (variant === 'text') {
    return (
      <div className="space-y-3" data-testid={testId} aria-busy="true">
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
      </div>
    );
  }
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      data-testid={testId}
      aria-busy="true"
      aria-label={label}
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="als-card overflow-hidden p-4">
          <Skeleton className="mb-4 h-36 w-full rounded-[var(--radius-md)]" />
          <Skeleton className="mb-2 h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
};

export default LoadingState;
