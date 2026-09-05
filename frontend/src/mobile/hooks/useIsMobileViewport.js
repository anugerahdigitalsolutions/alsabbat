import { useEffect, useState } from 'react';

/**
 * BARAYA AL SABBAT — viewport switch.
 *
 * The mobile-first experience renders below 768px; from 768px upwards the
 * existing AL SABBAT desktop pages are used untouched. There are no
 * duplicate routes: the same URL simply picks a different view.
 */
export const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

const read = () => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
};

export function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(read);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(MOBILE_MEDIA_QUERY);
    const onChange = (event) => setIsMobile(event.matches);
    setIsMobile(mql.matches);

    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    // Safari < 14
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return isMobile;
}

export default useIsMobileViewport;
