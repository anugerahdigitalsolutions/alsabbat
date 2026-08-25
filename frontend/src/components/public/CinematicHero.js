import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Shield } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useScrollReveal';

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 48;

/**
 * Full-width cinematic hero carousel.
 * - autoplay 6s per slide, 800ms crossfade (CSS `.als-hero-slide`)
 * - prev / next, pagination dots, slide counter
 * - mobile swipe, keyboard (ArrowLeft / ArrowRight), pause on hover/focus
 * - respects prefers-reduced-motion (no ken-burns, no autoplay)
 */
export const CinematicHero = ({ slides = [], stats = [], clubName = 'ALSABBAT' }) => {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStart = useRef(null);

  const count = slides.length;
  const go = useCallback((next) => setIndex((prev) => (count ? (next + count) % count : 0)), [count]);
  const prev = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);

  useEffect(() => {
    if (count < 2 || paused || reduced) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, paused, reduced]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  const onKeyDown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      prev();
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      next();
    }
  };

  const onTouchStart = (event) => {
    touchStart.current = event.touches[0].clientX;
  };

  const onTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const delta = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) next();
      else prev();
    }
    touchStart.current = null;
  };

  const active = slides[index];

  return (
    <section
      className="relative isolate overflow-hidden"
      style={{ backgroundColor: 'var(--club-tertiary)' }}
      role="region"
      aria-roledescription="carousel"
      aria-label={`Sorotan ${clubName}`}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid="home-hero"
    >
      {/* slides */}
      <div className="relative min-h-[540px] sm:min-h-[600px] lg:min-h-[660px]">
        {slides.map((slide, slideIndex) => {
          const isActive = slideIndex === index;
          return (
            <div
              key={slide.id}
              className="als-hero-slide absolute inset-0 overflow-hidden"
              style={{ opacity: isActive ? 1 : 0, pointerEvents: isActive ? 'auto' : 'none' }}
              aria-hidden={!isActive}
              data-testid={`home-hero-slide-${slideIndex}`}
            >
              {slide.image ? (
                <img
                  src={slide.image}
                  alt={slide.alt || slide.headline || ''}
                  className={`absolute inset-0 h-full w-full object-cover ${isActive && !reduced ? 'als-kenburns' : ''}`}
                  loading={slideIndex === 0 ? 'eager' : 'lazy'}
                  fetchpriority={slideIndex === 0 ? 'high' : undefined}
                  decoding="async"
                />
              ) : null}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(100deg, rgba(34,34,34,0.92) 6%, rgba(34,34,34,0.62) 46%, rgba(34,34,34,0.28) 100%)',
                }}
              />
              <div className="als-stadium-glow absolute inset-0 opacity-60" />
              <div className="als-pitch-lines absolute inset-0" />
            </div>
          );
        })}

        {/* content */}
        <div className="relative flex min-h-[540px] items-end pb-24 pt-16 sm:min-h-[600px] sm:pb-28 lg:min-h-[660px]">
          <div className="als-container">
            {active ? (
              <div key={active.id} className="als-reveal-shown max-w-3xl">
                <p
                  className="font-display mb-4 text-[11px] font-semibold uppercase tracking-[0.28em] sm:text-xs"
                  style={{ color: 'var(--club-primary)' }}
                  data-testid="home-hero-eyebrow"
                >
                  {active.eyebrow}
                </p>
                <h1
                  className="font-display text-3xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
                  style={{ color: 'var(--club-light)' }}
                  data-testid="home-hero-headline"
                >
                  {active.headline}
                </h1>
                {active.subheadline ? (
                  <p
                    className="font-display mt-3 text-lg font-semibold sm:text-2xl"
                    style={{ color: 'var(--club-primary)' }}
                    data-testid="home-hero-subheadline"
                  >
                    {active.subheadline}
                  </p>
                ) : null}
                {active.meta ? (
                  <p className="mt-4 max-w-xl text-sm sm:text-base" style={{ color: 'rgba(254,254,254,0.82)' }}>
                    {active.meta}
                  </p>
                ) : null}

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  {active.ctaTo ? (
                    <Link
                      to={active.ctaTo}
                      className="als-lift font-display inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-sm)] px-5 py-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                      style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A', '--tw-ring-color': 'var(--focus-ring)' }}
                      data-testid="home-hero-cta"
                    >
                      {active.ctaLabel || 'Selengkapnya'}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : null}
                  {active.secondaryTo ? (
                    <Link
                      to={active.secondaryTo}
                      className="als-lift inline-flex min-h-[44px] items-center gap-2 rounded-[var(--radius-sm)] px-5 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2"
                      style={{ border: '1px solid rgba(254,254,254,0.4)', color: 'var(--club-light)' }}
                      data-testid="home-hero-secondary-cta"
                    >
                      {active.secondaryLabel}
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="max-w-2xl" data-testid="home-hero-fallback">
                <Shield className="mb-4 h-9 w-9" style={{ color: 'var(--club-primary)' }} />
                <h1 className="font-display text-3xl font-extrabold sm:text-5xl" style={{ color: 'var(--club-light)' }}>
                  {clubName}
                </h1>
                <p className="mt-3 text-sm sm:text-base" style={{ color: 'rgba(254,254,254,0.8)' }}>
                  Konten sorotan akan tampil di sini setelah pertandingan, berita, atau album galeri tersedia.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* controls */}
        {count > 1 ? (
          <div className="absolute inset-x-0 bottom-6 z-10">
            <div className="als-container flex items-center justify-between gap-4">
              <div className="flex items-center gap-2" role="tablist" aria-label="Pilih slide">
                {slides.map((slide, dotIndex) => (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={dotIndex === index}
                    aria-label={`Slide ${dotIndex + 1}: ${slide.eyebrow}`}
                    onClick={() => go(dotIndex)}
                    className="h-2.5 rounded-full transition-[width,background-color] duration-200 focus-visible:outline-none focus-visible:ring-2"
                    style={{
                      width: dotIndex === index ? 28 : 10,
                      backgroundColor: dotIndex === index ? 'var(--club-primary)' : 'rgba(254,254,254,0.42)',
                    }}
                    data-testid={`home-hero-dot-${dotIndex}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span
                  className="font-display mr-1 text-xs font-semibold tabular-nums"
                  style={{ color: 'rgba(254,254,254,0.75)' }}
                  data-testid="home-hero-counter"
                >
                  {String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}
                </span>
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? 'Lanjutkan putar otomatis' : 'Jeda putar otomatis'}
                  className="als-lift inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2"
                  style={{ backgroundColor: 'rgba(254,254,254,0.12)', color: 'var(--club-light)' }}
                  data-testid="home-hero-pause"
                >
                  {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Slide sebelumnya"
                  className="als-lift inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2"
                  style={{ backgroundColor: 'rgba(254,254,254,0.12)', color: 'var(--club-light)' }}
                  data-testid="home-hero-prev"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={next}
                  aria-label="Slide berikutnya"
                  className="als-lift inline-flex h-11 w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2"
                  style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
                  data-testid="home-hero-next"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* stats strip */}
      {stats.length ? (
        <div style={{ borderTop: '1px solid rgba(254,254,254,0.12)' }}>
          <div className="als-container grid grid-cols-2 gap-4 py-6 sm:grid-cols-4" data-testid="home-hero-stats">
            {stats.map((stat) => (
              <div key={stat.id} data-testid={`home-hero-stat-${stat.id}`}>
                <p className="font-display text-2xl font-extrabold tabular-nums sm:text-3xl" style={{ color: 'var(--club-primary)' }}>
                  {stat.value}
                </p>
                <p className="text-[11px] uppercase tracking-[0.16em] sm:text-xs" style={{ color: 'rgba(254,254,254,0.62)' }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default CinematicHero;
