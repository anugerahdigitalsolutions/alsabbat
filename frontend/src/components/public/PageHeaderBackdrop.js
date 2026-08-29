import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Latar abstrak landscape untuk banner header halaman dalam.
 * Satu identitas visual (navy #012891 + aksen gold lembut), pola wave berbeda
 * per halaman. Hanya lapisan latar — tidak menyentuh teks/layout/ukuran banner.
 */
const NAVY_DEEP = '#010F38';
const NAVY = '#012891';
const NAVY_MID = '#02329E';
const GOLD = '#FCCF2B';

const WAVE_SETS = [
  // 0 — arus panjang mengalir naik (Klub / halaman umum)
  [
    { d: 'M-40 300 C 220 250 420 340 700 268 C 920 210 1080 250 1240 214', w: 2.2, o: 0.2, c: '#FFFFFF' },
    { d: 'M-40 330 C 240 282 430 372 720 296 C 950 236 1090 276 1240 240', w: 1.8, o: 0.14, c: '#FFFFFF' },
    { d: 'M-40 364 C 250 318 460 402 760 322 C 980 262 1100 300 1240 268', w: 3, o: 0.3, c: GOLD },
    { d: 'M-40 232 C 260 196 470 268 780 206 C 1000 162 1110 196 1240 168', w: 1.4, o: 0.1, c: '#FFFFFF' },
  ],
  // 1 — gelombang ganda menurun (Pemain)
  [
    { d: 'M-40 210 C 200 268 420 168 660 232 C 900 296 1080 208 1240 250', w: 2.4, o: 0.22, c: '#FFFFFF' },
    { d: 'M-40 250 C 210 310 430 206 680 272 C 920 336 1090 246 1240 288', w: 1.8, o: 0.14, c: '#FFFFFF' },
    { d: 'M-40 300 C 230 362 450 252 700 320 C 940 386 1100 292 1240 336', w: 3.2, o: 0.3, c: GOLD },
    { d: 'M-40 356 C 250 414 470 306 730 372 C 960 430 1120 344 1240 384', w: 1.4, o: 0.1, c: '#FFFFFF' },
  ],
  // 2 — arus diagonal rapat (Pertandingan)
  [
    { d: 'M-40 380 C 260 330 380 250 640 214 C 900 178 1060 214 1240 178', w: 2.2, o: 0.2, c: '#FFFFFF' },
    { d: 'M-40 412 C 280 358 400 276 670 238 C 930 200 1080 240 1240 206', w: 1.8, o: 0.14, c: '#FFFFFF' },
    { d: 'M-40 344 C 240 300 360 226 610 190 C 880 152 1040 190 1240 150', w: 3, o: 0.3, c: GOLD },
    { d: 'M-40 268 C 230 236 340 176 600 140 C 860 104 1030 138 1240 104', w: 1.4, o: 0.12, c: '#FFFFFF' },
  ],
  // 3 — riak lembut sejajar (Merchandise / Toko)
  [
    { d: 'M-40 262 C 200 232 400 292 640 262 C 880 232 1060 288 1240 258', w: 2.2, o: 0.2, c: '#FFFFFF' },
    { d: 'M-40 300 C 200 270 400 330 640 300 C 880 270 1060 326 1240 296', w: 1.8, o: 0.14, c: '#FFFFFF' },
    { d: 'M-40 338 C 200 308 400 368 640 338 C 880 308 1060 364 1240 334', w: 3, o: 0.28, c: GOLD },
    { d: 'M-40 376 C 200 346 400 406 640 376 C 880 346 1060 402 1240 372', w: 1.4, o: 0.1, c: '#FFFFFF' },
  ],
  // 4 — busur melebar (Berita / Prestasi)
  [
    { d: 'M-40 396 C 300 250 560 236 840 268 C 1030 290 1140 260 1240 232', w: 2.4, o: 0.22, c: '#FFFFFF' },
    { d: 'M-40 430 C 320 286 580 268 860 300 C 1050 322 1150 292 1240 266', w: 1.8, o: 0.14, c: '#FFFFFF' },
    { d: 'M-40 352 C 300 214 560 200 830 232 C 1020 254 1140 222 1240 194', w: 3, o: 0.3, c: GOLD },
    { d: 'M-40 300 C 300 176 540 164 800 194 C 1000 216 1130 186 1240 158', w: 1.4, o: 0.1, c: '#FFFFFF' },
  ],
];

const ROUTE_VARIANT = [
  { match: /^\/teams|^\/players/, variant: 1 },
  { match: /^\/matches/, variant: 2 },
  { match: /^\/merchandise|^\/order|^\/checkout/, variant: 3 },
  { match: /^\/news|^\/achievements|^\/sponsors/, variant: 4 },
  { match: /^\/club|^\/contact/, variant: 0 },
];

export const PageHeaderBackdrop = ({ testId = 'page-header-backdrop' }) => {
  const { pathname } = useLocation();
  const variant = useMemo(() => {
    const found = ROUTE_VARIANT.find((rule) => rule.match.test(pathname));
    if (found) return found.variant;
    // Halaman lain tetap konsisten: pilih pola stabil dari nama route.
    const seed = pathname.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return seed % WAVE_SETS.length;
  }, [pathname]);

  const waves = WAVE_SETS[variant];
  const uid = `phb${variant}`;

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1200 420"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      data-testid={testId}
      data-variant={variant}
    >
      <defs>
        <linearGradient id={`${uid}-base`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={NAVY} />
          <stop offset="52%" stopColor={NAVY_MID} />
          <stop offset="100%" stopColor={NAVY_DEEP} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="78%" cy="18%" r="62%">
          <stop offset="0%" stopColor="#2B5BD7" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#2B5BD7" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-gold`} cx="88%" cy="86%" r="46%">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.22" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-band`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1200" height="420" fill={`url(#${uid}-base)`} />
      <rect width="1200" height="420" fill={`url(#${uid}-glow)`} />
      <rect width="1200" height="420" fill={`url(#${uid}-gold)`} />

      {/* pita lembut sebagai kedalaman, bukan garis tajam */}
      <path
        d={waves[0].d}
        fill="none"
        stroke={`url(#${uid}-band)`}
        strokeWidth="90"
        strokeLinecap="round"
      />
      <path
        d={waves[2].d}
        fill="none"
        stroke={`url(#${uid}-band)`}
        strokeWidth="54"
        strokeLinecap="round"
      />

      {waves.map((wave, index) => (
        <path
          key={index}
          d={wave.d}
          fill="none"
          stroke={wave.c}
          strokeOpacity={wave.o}
          strokeWidth={wave.w}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

export default PageHeaderBackdrop;
