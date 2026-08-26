import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '../ui/button';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'Belum ada data',
  description = 'Data akan tampil di sini setelah ditambahkan.',
  actionLabel,
  onAction,
  testId = 'empty-state',
}) => (
  <div
    className="als-card flex flex-col items-center justify-center gap-3 px-6 py-12 text-center"
    data-testid={testId}
  >
    <span
      className="flex h-12 w-12 items-center justify-center rounded-full"
      style={{ backgroundColor: 'rgba(1,40,145,0.07)' }}
    >
      <Icon className="h-6 w-6" style={{ color: 'var(--club-secondary)' }} />
    </span>
    <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--fg)' }}>
      {title}
    </h3>
    <p className="max-w-md text-sm" style={{ color: 'var(--muted-fg)' }}>
      {description}
    </p>
    {actionLabel && onAction ? (
      <Button
        onClick={onAction}
        className="mt-1 font-medium"
        style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
        data-testid={`${testId}-primary-action`}
      >
        {actionLabel}
      </Button>
    ) : null}
  </div>
);

export default EmptyState;
