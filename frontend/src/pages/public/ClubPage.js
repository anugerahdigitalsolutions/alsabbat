import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Shield, Trophy } from 'lucide-react';
import { useClub } from '../../context/ClubContext';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { useResourceList } from '../../hooks/useResourceList';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { ClubCrestMark } from '../../components/shared/ClubCrestMark';
import { Reveal } from '../../components/public/Reveal';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { usePageSeo } from '../../hooks/usePageSeo';
import { useSiteText } from '../../lib/siteContent';

const COLORS = [
  ['primary_color', 'Primer'],
  ['secondary_color', 'Sekunder'],
  ['tertiary_color', 'Tersier'],
  ['light_color', 'Terang'],
];

export default function ClubPage() {
  const { club, clubName, shortName, loading, error, reload } = useClub();
  const t = useSiteText({ club: shortName || clubName || 'AL SABBAT' });
  usePageSeo({
    title: 'Profil Klub',
    description: club?.description || `Profil resmi ${clubName}.`,
    path: '/club',
  });

  const players = useResourceList('/players', { status: 'ACTIVE', limit: 60 });
  const staff = useResourceList('/staff', { status: 'ACTIVE', limit: 30 });
  const honours = useResourceList('/achievements', { status: 'ACTIVE', limit: 12 });

  const facts = [
    { id: 'founded', label: 'Didirikan', value: club?.founded_date, Icon: CalendarDays },
    { id: 'location', label: 'Lokasi', value: club?.location, Icon: MapPin },
    { id: 'stadium', label: 'Stadion', value: club?.stadium, Icon: Shield },
  ].filter((fact) => !!fact.value);

  return (
    <div data-testid="page-club">
      <PublicPageHeader
        label={t('club.header.label')}
        title={t('club.header.title')}
        description={t('club.header.description')}
        backgroundImage={resolveMediaUrl(club?.hero_image)}
        imageAlt={clubName}
        breadcrumb={[{ label: 'Beranda', to: '/' }, { label: t('club.header.label') }]}
      />
      <div className="als-container py-12 sm:py-16">
        {loading ? (
          <LoadingState variant="text" testId="club-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} testId="club-error" />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
            <Reveal>
              <div className="als-card p-6">
                <div className="flex items-center gap-4">
                  <ClubCrestMark size={64} testId="club-page-crest" />
                  <div>
                    <h2 className="font-display text-xl font-semibold">{club?.name}</h2>
                    <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                      {club?.short_name}
                    </p>
                  </div>
                </div>
                <div className="mt-6 space-y-3">
                  <p className="als-section-label">{t('club.identity.title')}</p>
                  <div className="flex gap-3" data-testid="club-brand-colors">
                    {COLORS.map(([key, label]) => (
                      <div key={key} className="flex-1 text-center">
                        <span
                          className="block h-12 w-full rounded-[var(--radius-sm)]"
                          style={{ backgroundColor: club?.[key], border: '1px solid var(--border-soft)' }}
                          data-testid={`club-color-${key}`}
                        />
                        <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--muted-fg)' }}>
                          {label}
                        </p>
                        <p className="font-mono text-[10px]" style={{ color: 'var(--muted-fg)' }}>
                          {club?.[key]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>

            <div className="space-y-6">
              <Reveal delay={70}>
                <div className="als-card p-6">
                  <h3 className="font-display mb-3 text-lg font-semibold">{t('club.about.title')}</h3>
                  <p className="als-prose text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }} data-testid="club-description">
                    {club?.description || 'Deskripsi klub belum diatur pada Admin Panel.'}
                  </p>
                </div>
              </Reveal>

              {club?.story ? (
                <Reveal delay={110}>
                  <div className="als-card p-6" data-testid="club-story">
                    <h3 className="font-display mb-3 text-lg font-semibold">{t('club.story.title')}</h3>
                    <p className="als-prose whitespace-pre-line text-sm leading-relaxed" style={{ color: 'var(--muted-fg)' }}>
                      {club.story}
                    </p>
                  </div>
                </Reveal>
              ) : null}

              {facts.length ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="club-facts">
                  {facts.map(({ id, label, value, Icon }) => (
                    <div key={id} className="als-card p-5" data-testid={`club-fact-${id}`}>
                      <div className="mb-2 flex items-center gap-2">
                        <Icon className="h-4 w-4" style={{ color: 'var(--club-secondary)' }} />
                        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                          {label}
                        </p>
                      </div>
                      <p className="font-display text-base font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <Reveal delay={150}>
                <div className="als-card p-6" data-testid="club-squad-block">
                  <h3 className="font-display mb-2 text-lg font-semibold">{t('club.squad.title')}</h3>
                  <p className="text-sm" style={{ color: 'var(--muted-fg)' }}>
                    {t('club.squad.text')}
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    <span className="font-display font-semibold" data-testid="club-squad-players">
                      {players.loading ? '—' : players.total} pemain
                    </span>
                    <span className="font-display font-semibold" data-testid="club-squad-staff">
                      {staff.loading ? '—' : staff.total} staf
                    </span>
                  </div>
                  <Link to="/teams" className="als-btn-blue als-focus mt-5 inline-flex" data-testid="club-squad-cta">
                    {t('club.squad.cta')}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </div>
              </Reveal>

              {honours.items.length ? (
                <Reveal delay={190}>
                  <div className="als-card p-6" data-testid="club-honours">
                    <h3 className="font-display mb-4 text-lg font-semibold">{t('club.honours.title')}</h3>
                    <ul className="space-y-2">
                      {honours.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-3 py-2"
                          style={{ backgroundColor: 'var(--surface-2)' }}
                          data-testid={`club-honour-${item.id}`}
                        >
                          <span className="flex min-w-0 items-center gap-2 text-sm font-medium">
                            <Trophy className="h-4 w-4 shrink-0" style={{ color: 'var(--club-primary)' }} aria-hidden="true" />
                            <span className="truncate">{item.title}</span>
                          </span>
                          {item.year ? (
                            <span className="font-display text-xs font-semibold tabular-nums" style={{ color: 'var(--muted-fg)' }}>
                              {item.year}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
