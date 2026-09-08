import React from 'react';

const STATUS_LABEL = {
  PENDING: 'Menunggu Pembayaran',
  PROCESSING: 'Diproses',
  PACKED: 'Dikemas',
  READY_TO_SHIP: 'Siap Dikirim',
  SHIPPED: 'Dikirim',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
  REFUNDED: 'Dana Dikembalikan',
};

export const orderStatusLabel = (status) => STATUS_LABEL[status] || status || '—';

const formatAt = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16).replace('T', ' ');
  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
};

export const OrderTimeline = ({ entries, showActor = false, testId = 'order-timeline' }) => {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length) {
    return (
      <p className="text-sm" style={{ color: 'var(--muted-fg)' }} data-testid={`${testId}-empty`}>
        Belum ada riwayat pesanan.
      </p>
    );
  }
  return (
    <ol className="space-y-3" data-testid={testId}>
      {list.map((entry, index) => (
        <li key={`${entry.event}-${entry.at}-${index}`} className="flex gap-3">
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: index === list.length - 1 ? 'var(--club-primary)' : 'var(--border-soft)' }}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{entry.label || orderStatusLabel(entry.status) || entry.event}</p>
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }}>
              {formatAt(entry.at)}
              {showActor && entry.actor ? ` · ${entry.actor}` : ''}
              {!showActor && entry.source ? ` · ${entry.source}` : ''}
            </p>
            {entry.note ? (
              <p className="mt-0.5 break-words text-xs" style={{ color: 'var(--muted-fg)' }}>
                {entry.note}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
};
