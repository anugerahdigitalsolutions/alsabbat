import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play, Shield } from 'lucide-react';
import { usePrefersReducedMotion } from '../../hooks/useScrollReveal';
import { isExternalLink } from '../../lib/internalLinks';

const AUTOPLAY_MS = 6000;
const SWIPE_THRESHOLD = 48;

/**
 * Full-width cinematic hero carousel.
 * - autoplay 6s per slide, 800ms crossfade (CSS `.als-hero-slide`)
 * - prev / next, pagination dots, slide counter
 * - mobile swipe, keyboard (ArrowLeft / ArrowRight), pause on hover/focus
 * - respects prefers-reduced-motion (no ken-burns, no autoplay)
 */
export const CinematicHero = ({ slides = [], stats = [], clubName = 'ALSABBAT', panel = null, tagline = null, socials = [] }) => {
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
      className="relative isolate overflow-hidden rounded-none lg:rounded-[26px]"
      style={{ backgroundColor: 'var(--club-secondary)' }}
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
      <div className="als-hero-frame relative">
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
                  style={{ objectPosition: slide.imagePosition || 'center' }}
                  loading={slideIndex === 0 ? 'eager' : 'lazy'}
                  fetchPriority={slideIndex === 0 ? 'high' : undefined}
                  decoding="async"
                />
              ) : null}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'linear-gradient(96deg, rgba(1,40,145,0.96) 0%, rgba(1,40,145,0.86) 26%, rgba(1,40,145,0.55) 52%, rgba(1,40,145,0.18) 78%, rgba(0,0,0,0.22) 100%)',
                }}
              />
              <div className="als-stadium-glow absolute inset-0 opacity-60" />
              <div className="als-pitch-lines absolute inset-0" />
            </div>
          );
        })}

        {/* content */}
        <div className="als-hero-content flex items-end pb-24 pt-14 sm:pb-28 sm:pt-16">
          <div className="grid w-full items-end gap-8 px-6 sm:px-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12 xl:px-14">
            {active ? (
              <div key={active.id} className="max-w-3xl">
                <p
                  className="als-eyebrow als-hero-step mb-4"
                  style={{ color: 'var(--club-primary)', animationDelay: '60ms' }}
                  data-testid="home-hero-eyebrow"
                >
                  {active.eyebrow}
                </p>
                <h1
                  className="als-display-xl als-hero-headline"
                  style={{ color: 'var(--club-light)' }}
                  data-testid="home-hero-headline"
                >
                  {active.headlineLines ? (
                    active.headlineLines.map((line, lineIndex) => (
                      <span
                        key={line.text}
                        className="als-hero-step block"
                        style={{ animationDelay: `${140 + lineIndex * 110}ms` }}
                      >
                        <span style={{ color: line.gold ? 'var(--club-primary)' : 'inherit' }}>{line.text}</span>
                      </span>
                    ))
                  ) : (
                    active.headline
                  )}
                </h1>
                {active.subheadline ? (
                  <p
                    className="font-display als-hero-step mt-3 text-lg font-semibold sm:text-2xl"
                    style={{ color: 'var(--club-primary)', animationDelay: '420ms' }}
                    data-testid="home-hero-subheadline"
                  >
                    {active.subheadline}
                  </p>
                ) : null}
                {active.meta ? (
                  <p
                    className="als-hero-step mt-4 max-w-xl text-sm sm:text-base"
                    style={{ color: 'rgba(254,254,254,0.82)', animationDelay: '480ms' }}
                  >
                    {active.meta}
                  </p>
                ) : null}
                {tagline ? (
                  <p
                    className="font-display als-hero-step mt-5 text-base font-semibold sm:text-lg"
                    style={{ color: 'rgba(254,254,254,0.9)', animationDelay: '520ms' }}
                    data-testid="home-hero-tagline"
                  >
                    {tagline}
                  </p>
                ) : null}

                <div className="als-hero-step mt-7 flex flex-wrap items-center gap-3" style={{ animationDelay: '580ms' }}>
                  {active.ctaTo ? (
                    isExternalLink(active.ctaTo) ? (
                      <a
                        href={active.ctaTo}
                        target="_blank"
                        rel="noreferrer"
                        className="als-btn-gold als-focus"
                        data-testid="home-hero-cta"
                      >
                        {active.ctaLabel || 'Selengkapnya'}
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    ) : (
                      <Link to={active.ctaTo} className="als-btn-gold als-focus" data-testid="home-hero-cta">
                        {active.ctaLabel || 'Selengkapnya'}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )
                  ) : null}
                  {active.secondaryTo ? (
                    isExternalLink(active.secondaryTo) ? (
                      <a
                        href={active.secondaryTo}
                        target="_blank"
                        rel="noreferrer"
                        className="als-btn-ghost als-focus"
                        data-testid="home-hero-secondary-cta"
                      >
                        {active.secondaryLabel}
                      </a>
                    ) : (
                      <Link to={active.secondaryTo} className="als-btn-ghost als-focus" data-testid="home-hero-secondary-cta">
                        {active.secondaryLabel}
                      </Link>
                    )
                  ) : null}
                </div>

                {socials.length ? (
                  <div
                    className="als-hero-step mt-8 flex flex-wrap items-center gap-3"
                    style={{ animationDelay: '640ms' }}
                    data-testid="home-hero-socials"
                  >
                    <span className="text-xs font-semibold" style={{ color: 'rgba(254,254,254,0.7)' }}>
                      Ikuti Kami
                    </span>
                    {socials.map((item) => (
                      <a
                        key={item.key}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="als-focus inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 hover:-translate-y-0.5"
                        style={{ border: '1px solid rgba(254,254,254,0.4)', color: 'var(--club-light)' }}
                        aria-label={item.key}
                        data-testid={`home-hero-social-${item.key}`}
                      >
                        <item.Icon className="h-4 w-4" aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                ) : null}
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
            {panel ? (
              <div
                className="als-hero-step w-full lg:w-auto lg:justify-self-end lg:pb-2"
                style={{ animationDelay: '700ms' }}
                data-testid="home-hero-panel"
              >
                {panel}
              </div>
            ) : null}
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
                  style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
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
        <div style={{ borderTop: '1px solid rgba(252,207,43,0.22)', backgroundColor: 'rgba(0,0,0,0.55)' }}>
          <div
            className="als-container grid grid-cols-2 gap-x-6 gap-y-6 py-8 sm:grid-cols-3 lg:grid-cols-5"
            data-testid="home-hero-stats"
          >
            {stats.map((stat, statIndex) => (
              <div
                key={stat.id}
                className="lg:border-r lg:pr-6 lg:last:border-r-0"
                style={{
                  borderColor: 'rgba(254,254,254,0.12)',
                  animation: `als-reveal-in 620ms var(--ease-out) ${statIndex * 80}ms both`,
                }}
                data-testid={`home-hero-stat-${stat.id}`}
              >
                <p
                  className="font-display text-3xl font-extrabold tabular-nums sm:text-4xl"
                  style={{ color: 'var(--club-primary)' }}
                >
                  {stat.value}
                </p>
                <p
                  className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: 'rgba(254,254,254,0.66)' }}
                >
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
