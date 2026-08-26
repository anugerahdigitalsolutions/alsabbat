import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useScrollReveal } from '../../hooks/useScrollReveal';

/**
 * Shared inner-page header (220–330px) — dark brand surface, gold accent,
 * optional real background image and staggered reveal.
 */
export const PublicPageHeader = ({
  label,
  title,
  description,
  backgroundImage,
  imageAlt,
  breadcrumb = [],
  meta,
  testId = 'public-page-header',
}) => {
  const [ref, shown] = useScrollReveal({ threshold: 0.01 });
  const step = (index) => ({
    animationDelay: shown ? `${80 * index}ms` : undefined,
  });

  return (
    <div className="als-frame-inner pt-4 sm:pt-6">
    <section
      ref={ref}
      className="als-inner-header relative overflow-hidden rounded-none py-12 sm:py-16 lg:rounded-[26px]"
      style={{ backgroundColor: 'var(--club-secondary)' }}
      data-testid={testId}
    >
      {backgroundImage ? (
        <img
          src={backgroundImage}
          alt={imageAlt || title || ''}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: 0.45 }}
          loading="eager"
        />
      ) : null}
      <div className="als-pitch-lines absolute inset-0 opacity-70" aria-hidden="true" />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(96deg, rgba(1,40,145,0.96) 0%, rgba(1,40,145,0.84) 32%, rgba(1,40,145,0.5) 62%, rgba(0,0,0,0.3) 100%)',
        }}
        aria-hidden="true"
      />

      <div className="relative w-full px-6 sm:px-10 xl:px-14">
        {breadcrumb.length ? (
          <nav
            className={`mb-4 flex flex-wrap items-center gap-1 text-xs ${shown ? 'als-reveal-shown' : 'als-reveal-hidden'}`}
            style={{ color: 'rgba(254,254,254,0.6)' }}
            aria-label="Breadcrumb"
            data-testid={`${testId}-breadcrumb`}
          >
            {breadcrumb.map((crumb, index) => (
              <span key={`${crumb.label}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 ? <ChevronRight className="h-3 w-3" aria-hidden="true" /> : null}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="min-h-[24px] font-medium transition-colors duration-200 hover:text-[var(--club-primary)]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}

        {label ? (
          <p
            className={`font-display mb-3 text-xs font-semibold uppercase tracking-[0.24em] ${shown ? 'als-reveal-shown' : 'als-reveal-hidden'}`}
            style={{ color: 'var(--club-primary)', ...step(1) }}
            data-testid={`${testId}-label`}
          >
            {label}
          </p>
        ) : null}

        <h1
          className={`font-display max-w-3xl text-3xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem] ${shown ? 'als-reveal-shown' : 'als-reveal-hidden'}`}
          style={{ color: 'var(--club-light)', ...step(2) }}
        >
          {title}
        </h1>

        <span
          className={`als-gold-rule mt-5 ${shown ? 'als-reveal-shown' : 'als-reveal-hidden'}`}
          style={step(3)}
          aria-hidden="true"
        />

        {description ? (
          <p
            className={`mt-4 max-w-2xl text-sm leading-relaxed sm:text-base ${shown ? 'als-reveal-shown' : 'als-reveal-hidden'}`}
            style={{ color: 'rgba(254,254,254,0.78)', ...step(4) }}
          >
            {description}
          </p>
        ) : null}

        {meta ? (
          <div
            className={`mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm ${shown ? 'als-reveal-shown' : 'als-reveal-hidden'}`}
            style={{ color: 'rgba(254,254,254,0.75)', ...step(5) }}
            data-testid={`${testId}-meta`}
          >
            {meta}
          </div>
        ) : null}
      </div>
    </section>
    </div>
  );
};

export default PublicPageHeader;
