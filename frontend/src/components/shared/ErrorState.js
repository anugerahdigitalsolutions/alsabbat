import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';

export const ErrorState = ({
  title = 'Gagal memuat data',
  message = 'Terjadi kendala saat memuat data. Coba lagi.',
  onRetry,
  testId = 'error-state',
}) => (
  <div
    className="als-card flex flex-col items-start gap-3 p-6"
    style={{ borderColor: 'rgba(220,38,38,0.28)', backgroundColor: 'rgba(220,38,38,0.04)' }}
    data-testid={testId}
    role="alert"
  >
    <div className="flex items-center gap-2">
      <AlertTriangle className="h-5 w-5" style={{ color: 'var(--error)' }} />
      <h3 className="font-display text-base font-semibold" style={{ color: 'var(--fg)' }}>
        {title}
      </h3>
    </div>
    <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
      {message}
    </p>
    {onRetry ? (
      <Button variant="outline" size="sm" onClick={onRetry} data-testid={`${testId}-retry`}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Coba lagi
      </Button>
    ) : null}
  </div>
);

export default ErrorState;
