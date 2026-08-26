import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, ChevronRight } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { Reveal } from '../../components/public/Reveal';
import { PersonPhotoGallery } from '../../components/public/PersonPhotoGallery';
import { personPhotos } from '../../lib/personPhotos';
import { Badge } from '../../components/ui/badge';
import { usePageSeo } from '../../hooks/usePageSeo';

export default function StaffDetailPage() {
  const { staffId } = useParams();
  const [member, setMember] = useState(null);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const photos = personPhotos(member);

  usePageSeo({
    title: member?.name || 'Profil Staf',
    description: member?.bio || 'Profil staf ALSABBAT Football Club.',
    image: photos[0],
    path: `/staff/${staffId}`,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/staff/${staffId}`);
      setMember(data);
      if (data?.team_id) {
        try {
          const teamRes = await api.get(`/teams/${data.team_id}`);
          setTeam(teamRes.data);
        } catch (e) {
          setTeam(null);
        }
      }
    } catch (e) {
      setError(apiErrorMessage(e, 'Staf tidak ditemukan.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  if (loading) {
    return (
      <div className="als-container py-12" data-testid="page-staff-detail">
        <LoadingState variant="text" testId="staff-detail-loading" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="als-container py-12" data-testid="page-staff-detail">
        <ErrorState message={error} onRetry={load} testId="staff-detail-error" />
        <Link
          to="/teams"
          className="mt-6 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"
          style={{ color: 'var(--club-secondary)' }}
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke PEMAIN
        </Link>
      </div>
    );
  }

  return (
    <div data-testid="page-staff-detail">
      <section
        className="relative overflow-hidden"
        style={{ backgroundColor: 'var(--club-tertiary)' }}
        data-testid="staff-hero"
      >
        <div className="als-stadium-glow absolute inset-0 opacity-80" aria-hidden="true" />
        <div className="als-pitch-lines absolute inset-0" aria-hidden="true" />

        <div className="als-container relative py-10 sm:py-14">
          <nav
            className="mb-6 flex flex-wrap items-center gap-1 text-xs"
            style={{ color: 'rgba(254,254,254,0.6)' }}
            aria-label="Breadcrumb"
          >
            <Link to="/" className="min-h-[24px] font-medium hover:text-[var(--club-primary)]">Beranda</Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <Link to="/teams" className="min-h-[24px] font-medium hover:text-[var(--club-primary)]">PEMAIN</Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span>{member?.name || 'Staf'}</span>
          </nav>

          <div className="flex flex-col gap-8 sm:flex-row sm:items-end">
            <PersonPhotoGallery
              photos={photos}
              alt={member?.name || 'Staf'}
              testId="staff-gallery"
              fallbackIcon={Briefcase}
              className="als-card relative h-64 w-52 shrink-0 overflow-hidden sm:h-80 sm:w-64"
            />

            <div className="min-w-0">
              <p
                className="font-display text-[11px] font-semibold uppercase tracking-[0.26em]"
                style={{ color: 'var(--club-primary)' }}
              >
                Profil Staf
              </p>
              <h1
                className="font-display mt-3 text-3xl font-bold leading-[1.05] sm:text-5xl"
                style={{ color: 'var(--club-light)' }}
              >
                {member?.name || 'Profil Staf'}
              </h1>
              <span className="als-gold-rule mt-5" aria-hidden="true" />
              <div
                className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
                style={{ color: 'rgba(254,254,254,0.8)' }}
                data-testid="staff-hero-meta"
              >
                <span className="font-display font-semibold uppercase tracking-[0.16em]">
                  {member?.role_label || member?.role || 'Staf'}
                </span>
                {team ? (
                  <Link
                    to={`/teams/${team.id}`}
                    className="min-h-[24px] font-semibold transition-colors duration-200 hover:text-[var(--club-primary)]"
                    data-testid="staff-hero-team-link"
                  >
                    {team.name}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="als-container py-10 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <Reveal className="als-card p-6 sm:p-8">
            <p className="als-section-label">Biografi</p>
            <span className="als-gold-rule mt-2" aria-hidden="true" />
            <p className="mt-4 text-sm leading-[1.85]" style={{ color: 'var(--muted-fg)' }} data-testid="staff-bio">
              {member?.bio || 'Biografi staf belum tersedia.'}
            </p>
          </Reveal>

          <Reveal className="space-y-4" delay={140}>
            <div className="als-card p-5">
              <p className="als-section-label mb-3">Status</p>
              <Badge
                variant="outline"
                style={{ backgroundColor: 'rgba(252,207,43,0.16)', borderColor: 'rgba(252,207,43,0.55)' }}
                data-testid="staff-status"
              >
                {member?.status}
              </Badge>
              <Link
                to="/teams"
                className="mt-5 inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold"
                style={{ color: 'var(--club-secondary)' }}
                data-testid="staff-back-link"
              >
                <ArrowLeft className="h-4 w-4" /> Kembali ke PEMAIN
              </Link>
            </div>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
