import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CalendarDays, Images, Newspaper } from 'lucide-react';
import { Button } from '../ui/button';
import { ClubCrestMark } from '../shared/ClubCrestMark';
import { useClub } from '../../context/ClubContext';

const HERO_IMAGE =
  'https://images.pexels.com/photos/31377598/pexels-photo-31377598.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940';

export const HeroClubShell = ({ stats }) => {
  const { club, clubName, shortName } = useClub();

  return (
    <section className="relative overflow-hidden" data-testid="public-hero">
      <div className="absolute inset-0" style={{ backgroundColor: 'var(--club-tertiary)' }} />
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="als-stadium-glow absolute inset-0" />
      <div className="als-pitch-lines absolute inset-0" />

      <div className="als-container relative py-14 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <ClubCrestMark size={56} onDark testId="hero-crest" />
              <div className="flex flex-col">
                <span
                  className="font-display text-xs font-semibold uppercase tracking-[0.22em]"
                  style={{ color: 'var(--club-primary)' }}
                >
                  Platform Resmi
                </span>
                <span className="text-sm" style={{ color: 'rgba(254,254,254,0.72)' }}>
                  {shortName} Football Club
                </span>
              </div>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
              style={{ color: 'var(--club-light)' }}
              data-testid="hero-title"
            >
              {clubName}
            </motion.h1>

            <p
              className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
              style={{ color: 'rgba(254,254,254,0.80)' }}
              data-testid="hero-description"
            >
              {club?.description ||
                'Platform digital resmi AL SABBAT Football Club — pertandingan, skuad, berita, dan galeri klub.'}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/matches" data-testid="hero-cta-matches">
                <Button
                  size="lg"
                  className="font-semibold"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Jadwal &amp; Hasil
                </Button>
              </Link>
              <Link to="/news" data-testid="hero-cta-news">
                <Button
                  size="lg"
                  variant="outline"
                  className="font-semibold"
                  style={{
                    borderColor: 'rgba(254,254,254,0.35)',
                    backgroundColor: 'rgba(254,254,254,0.06)',
                    color: 'var(--club-light)',
                  }}
                >
                  <Newspaper className="mr-2 h-4 w-4" />
                  Berita Klub
                </Button>
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-2">
              {[
                { to: '/gallery', label: 'Galeri', Icon: Images },
                { to: '/club', label: 'Tentang Klub', Icon: ArrowRight },
              ].map(({ to, label, Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-medium transition-colors"
                  style={{
                    border: '1px solid rgba(254,254,254,0.22)',
                    color: 'rgba(254,254,254,0.88)',
                  }}
                  data-testid={`hero-chip-${label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[var(--radius-xl)] p-6 sm:p-7"
            style={{
              backgroundColor: 'rgba(254,254,254,0.07)',
              border: '1px solid rgba(254,254,254,0.16)',
              backdropFilter: 'blur(6px)',
            }}
            data-testid="hero-stats-card"
          >
            <h2
              className="font-display mb-5 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: 'var(--club-primary)' }}
            >
              Ringkasan Klub
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {(stats || []).map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[var(--radius-md)] p-4"
                  style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
                  data-testid={`hero-stat-${stat.id}`}
                >
                  <p
                    className="font-display text-2xl font-bold tabular-nums"
                    style={{ color: 'var(--club-light)' }}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: 'rgba(254,254,254,0.68)' }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs" style={{ color: 'rgba(254,254,254,0.55)' }}>
              Data diambil langsung dari database klub.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroClubShell;
