import React from 'react';
import { backgroundLayerStyles } from '../../lib/siteBackground';

/** Ambient background layers rendered OUTSIDE the website frame (fixed, no layout impact). */
export const SiteBackgroundLayers = ({ config, absolute = false }) => {
  const layers = backgroundLayerStyles(config);
  if (!layers.length) return null;
  return (
    <div
      className={`${absolute ? 'absolute' : 'fixed'} inset-0 overflow-hidden`}
      style={{ zIndex: 0, pointerEvents: 'none' }}
      aria-hidden="true"
      data-testid="site-background-layers"
    >
      {layers.map((style, index) => (
        <div key={index} className="absolute inset-0" style={style} />
      ))}
    </div>
  );
};

export default SiteBackgroundLayers;
