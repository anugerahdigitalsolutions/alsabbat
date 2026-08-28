import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ClipboardList, Info } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { Badge } from '../../components/ui/badge';

const ORDER = [
  'Profil Klub',
  'Logo & Media',
  'Staf',
  'Pemain',
  'Musim',
  'Kompetisi',
  'Pertandingan',
  'Formasi & Starting XI',
  'Berita',
  'Galeri',
  'Sponsor & Prestasi',
  'Merchandise',
  'Banner & Konten Homepage',
  'Desain Kartu Member',
];

const STATUS_STYLE = {
  SIAP: { backgroundColor: 'rgba(1,40,145,0.10)', color: 'var(--club-secondary)' },
  SEBAGIAN: { backgroundColor: 'rgba(252,207,43,0.22)', color: '#000000' },
  'BELUM DIISI': { backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--muted-fg)' },
};

const ProgressBar = ({ percent, testId }) => (
  <div
    className="h-2 w-full overflow-hidden rounded-full"
    style={{ backgroundColor: 'rgba(0,0,0,0.08)' }}
    data-testid={testId}
  >
    <span
      className="block h-full rounded-full transition-[width] duration-500"
      style={{
        width: `${percent}%`,
        backgroundColor: percent === 100 ? 'var(--club-secondary)' : 'var(--club-primary)',
      }}
    />
  </div>
);

export default function AdminReadinessPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: payload } = await api.get('/readiness/content');
      setData(payload);
    } catch (e) {
      setError(apiErrorMessage(e, 'Gagal memuat kesiapan konten.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState variant="table" rows={5} testId="admin-readiness-loading" />;
  if (error) return <ErrorState message={error} onRetry={load} testId="admin-readiness-error" />;

  const stages = data.categories.reduce((acc, category) => {
    const found = acc.find((stage) => stage.id === category.stage);
    if (found) found.items.push(category);
    else acc.push({ id: category.stage, items: [category] });
    return acc;
  }, []);

  return (
    <div className="space-y-6" data-testid="admin-readiness-page">
      <div>
        <h1 className="font-display text-2xl font-bold" data-testid="admin-readiness-title">
          Persiapan Konten AL SABBAT
        </h1>
        <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--muted-fg)' }}>
          Semua status di halaman ini dihitung langsung dari data nyata di database. Tidak ada contoh atau data palsu.
        </p>
      </div>

      <div className="als-card p-6" data-testid="admin-readiness-overall">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
              Kesiapan Keseluruhan
            </p>
            <p className="font-display mt-1 text-3xl font-extrabold tabular-nums" data-testid="admin-readiness-percent">
              {data.overall.percent}%
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
              {data.overall.done} dari {data.overall.total} item terisi
            </p>
          </div>
          <div className="flex gap-3 text-xs">
            {[
              ['Siap', data.overall.siap],
              ['Sebagian', data.overall.sebagian],
              ['Belum diisi', data.overall.belum],
            ].map(([label, value]) => (
              <span key={label} className="rounded-[var(--radius-sm)] px-3 py-2" style={{ backgroundColor: 'var(--surface-2)' }}>
                <span className="font-display block text-lg font-bold tabular-nums">{value}</span>
                <span style={{ color: 'var(--muted-fg)' }}>{label}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar percent={data.overall.percent} testId="admin-readiness-overall-bar" />
        </div>
      </div>

      <div className="als-card p-6" data-testid="admin-readiness-order">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
          <h2 className="font-display text-sm font-bold uppercase tracking-wider">Urutan yang disarankan</h2>
        </div>
        <ol className="mt-4 flex flex-wrap gap-2 text-xs">
          {ORDER.map((label, index) => (
            <li
              key={label}
              className="rounded-full px-3 py-1.5"
              style={{ backgroundColor: 'var(--surface-2)', color: 'var(--fg)' }}
            >
              <span className="font-bold" style={{ color: 'var(--club-secondary)' }}>
                {index + 1}.
              </span>{' '}
              {label}
            </li>
          ))}
        </ol>
        <p className="mt-4 flex items-start gap-2 text-xs" style={{ color: 'var(--muted-fg)' }}>
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Urutan ini membantu data pertandingan, skuad, berita, dan statistik saling terhubung. Anda tetap bebas mengisi
          tidak berurutan — panduan ini tidak memblokir apa pun.
        </p>
      </div>

      {stages.map((stage) => (
        <div key={stage.id} className="space-y-4" data-testid={`admin-readiness-stage-${stage.id}`}>
          <h2 className="font-display text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--club-secondary)' }}>
            {stage.id}
          </h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {stage.items.map((category) => (
              <div key={category.id} className="als-card p-5" data-testid={`admin-readiness-card-${category.id}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display truncate text-base font-bold">{category.label}</h3>
                    <p className="mt-0.5 text-xs tabular-nums" style={{ color: 'var(--muted-fg)' }}>
                      {category.done}/{category.total} item · {category.percent}%
                      {Object.keys(category.counts || {}).length
                        ? ` · ${Object.entries(category.counts)
                            .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
                            .join(' · ')}`
                        : ''}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="shrink-0 border-transparent text-[10px] font-bold uppercase"
                    style={STATUS_STYLE[category.status]}
                    data-testid={`admin-readiness-status-${category.id}`}
                  >
                    {category.status}
                  </Badge>
                </div>

                <div className="mt-3">
                  <ProgressBar percent={category.percent} testId={`admin-readiness-bar-${category.id}`} />
                </div>

                <ul className="mt-4 space-y-1.5">
                  {category.checks.map((check) => (
                    <li key={check.label} className="flex items-start gap-2 text-xs">
                      <span
                        className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[4px]"
                        style={
                          check.done
                            ? { backgroundColor: 'var(--club-primary)', color: '#000000' }
                            : { border: '1px solid var(--border-soft)' }
                        }
                        aria-hidden="true"
                      >
                        {check.done ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span style={{ color: check.done ? 'var(--fg)' : 'var(--muted-fg)' }}>{check.label}</span>
                    </li>
                  ))}
                </ul>

                {category.status !== 'SIAP' ? (
                  <Link
                    to={category.route}
                    className="als-focus mt-4 inline-flex items-center gap-1.5 text-xs font-bold"
                    style={{ color: 'var(--club-secondary)' }}
                    data-testid={`admin-readiness-action-${category.id}`}
                  >
                    Isi Sekarang
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : (
                  <p className="mt-4 text-xs font-semibold" style={{ color: 'var(--club-secondary)' }}>
                    Sudah siap
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
