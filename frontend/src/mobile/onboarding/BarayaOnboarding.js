import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { ONBOARDING_SLIDES } from './slides';

/**
 * AL SABBAT onboarding — full-bleed photo, glass card at the bottom,
 * "Skip" on the left and a gradient pill CTA on the right (UI reference).
 *
 * Frontend only: completion is persisted in localStorage by the caller.
 * Supports tap, swipe and keyboard navigation.
 */
export const BarayaOnboarding = ({ onFinish }) => {
  const [index, setIndex] = useState(0);
  const touchStart = useRef(null);
  const slides = ONBOARDING_SLIDES;
  const slide = slides[index];
  const isLast = index === slides.length - 1;

  const next = useCallback(() => {
    if (isLast) onFinish?.();
    else setIndex((value) => Math.min(value + 1, slides.length - 1));
  }, [isLast, onFinish, slides.length]);

  const prev = useCallback(() => setIndex((value) => Math.max(value - 1, 0)), []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'ArrowRight') next();
      if (event.key === 'ArrowLeft') prev();
      if (event.key === 'Escape') onFinish?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, onFinish]);

  // Preload the following image so the transition never flashes.
  useEffect(() => {
    const upcoming = slides[index + 1];
    if (!upcoming) return;
    const img = new Image();
    img.src = upcoming.image;
  }, [index, slides]);
  const onTouchStart = (event) => {
    touchStart.current = event.touches?.[0]?.clientX ?? null;
  };

  const onTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const delta = (event.changedTouches?.[0]?.clientX ?? 0) - touchStart.current;
    touchStart.current = null;
    if (Math.abs(delta) < 45) return;
    if (delta < 0) next();
    else prev();
  };

  return (
    <div
      className="brz-onboard"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid="baraya-onboarding"
      data-slide={slide.id}
      data-index={index}
    >
      {slides.map((item, position) => (
        <React.Fragment key={item.id}>
          {/* Soft blurred backdrop fills the screen without cropping the photo. */}
          <img
            className="brz-onboard-bg"
            src={item.imageSmall}
            alt=""
            aria-hidden="true"
            style={{ opacity: position === index ? 1 : 0 }}
          />
          {/* The photo itself is contained: full team visible, never stretched. */}
          <img
            className="brz-onboard-photo"
            src={item.image}
            srcSet={`${item.imageSmall} 480w, ${item.image} 900w`}
            sizes="100vw"
            alt={position === index ? item.alt || '' : ''}
            loading={position === 0 ? 'eager' : 'lazy'}
            decoding="async"
            style={{ opacity: position === index ? 1 : 0 }}
          />
        </React.Fragment>
      ))}
      <span className="brz-scrim" aria-hidden="true" />

      <div className="brz-onboard-card" data-testid="baraya-onboarding-card">
        <h1 className="brz-h1" data-testid="baraya-onboarding-title">
          {slide.title}
        </h1>
        <p className="brz-body mt-2.5">{slide.description}</p>

        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            type="button"
            className="px-1 text-[14px] font-semibold"
            style={{ color: 'var(--brz-text-muted)' }}
            onClick={() => onFinish?.()}
            data-testid="baraya-onboarding-skip"
          >
            {isLast ? 'Nanti saja' : 'Lewati'}
          </button>

          <button
            type="button"
            className="brz-btn brz-btn--accent flex-1"
            style={{ maxWidth: 200 }}
            onClick={next}
            data-testid="baraya-onboarding-next"
          >
            {isLast ? 'Mulai Sekarang' : 'Lanjut'}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 flex justify-start">
          <span className="brz-dots" data-testid="baraya-onboarding-dots">
            {slides.map((item, position) => (
              <span
                key={item.id}
                className={`brz-dot${position === index ? ' brz-dot--active' : ''}`}
                aria-hidden="true"
              />
            ))}
          </span>
        </div>
      </div>
    </div>
  );
};

export default BarayaOnboarding;
