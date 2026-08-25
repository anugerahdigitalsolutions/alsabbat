import React from 'react';

export const PublicPageHeader = ({ label, title, description }) => (
  <section
    className="relative overflow-hidden py-12 sm:py-16"
    style={{ backgroundColor: 'var(--club-tertiary)' }}
    data-testid="public-page-header"
  >
    <div className="als-stadium-glow absolute inset-0 opacity-70" />
    <div className="als-pitch-lines absolute inset-0" />
    <div className="als-container relative">
      {label ? (
        <p
          className="font-display mb-3 text-xs font-semibold uppercase tracking-[0.22em]"
          style={{ color: 'var(--club-primary)' }}
        >
          {label}
        </p>
      ) : null}
      <h1
        className="font-display text-3xl font-semibold tracking-tight sm:text-4xl"
        style={{ color: 'var(--club-light)' }}
      >
        {title}
      </h1>
      {description ? (
        <p className="mt-3 max-w-2xl text-sm sm:text-base" style={{ color: 'rgba(254,254,254,0.75)' }}>
          {description}
        </p>
      ) : null}
    </div>
  </section>
);

export default PublicPageHeader;
