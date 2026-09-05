import React from 'react';
import { useIsMobileViewport } from '../hooks/useIsMobileViewport';

/**
 * Renders the BARAYA AL SABBAT mobile screen below 768px and the existing
 * AL SABBAT desktop page from 768px upwards — on the SAME route.
 *
 * Only one of the two trees is mounted, so the desktop page never fetches or
 * renders on mobile (and vice versa).
 */
export const DualView = ({ mobile, desktop }) => {
  const isMobile = useIsMobileViewport();
  return isMobile ? mobile : desktop;
};

export default DualView;
