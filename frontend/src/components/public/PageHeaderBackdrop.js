import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Latar abstrak landscape untuk banner header halaman dalam.
 * Gaya: jalinan garis tipis (line-mesh) yang memilin seperti referensi —
 * navy #012891, kilau biru/cyan pada puntiran, aksen gold ALSABBAT yang lembut.
 * Hanya lapisan background: tidak menyentuh teks, layout, ukuran, atau elemen lain.
 */
const NAVY_DEEP = '#01102F';
const NAVY = '#012891';
const NAVY_MID = '#02308F';
const LINE_COOL = '#4E9BFF';
const LINE_GLOW = '#63E6FF';
const GOLD = '#FCCF2B';

const lerp = (a, b, t) => a + (b - a) * t;

const curve = (p) => `M${p[0]} ${p[1]} C ${p[2]} ${p[3]}, ${p[4]} ${p[5]}, ${p[6]} ${p[7]}`;

/** Keluarga garis paralel yang memilin dari kurva `from` ke kurva `to`. */
const family = (from, to, count) =>
  Array.from({ length: count }, (_, i) => {
    const t = count === 1 ? 0 : i / (count - 1);
    return { d: curve(from.map((value, index) => lerp(value, to[index], t))), t };
  });

// Setiap variasi = dua keluarga garis yang saling menyilang (efek jalinan).
const VARIANTS = [
  {
    // 0 — pilinan tegak di sisi kanan (Klub / Kontak)
    a: [[640, -40, 900, 90, 700, 250, 980, 460], [1180, -40, 1010, 110, 1240, 250, 1130, 460]],
    b: [[520, 460, 860, 330, 700, 190, 1010, -40], [1120, 460, 1040, 320, 1210, 170, 1240, -40]],
    count: 34,
    glow: { cx: '72%', cy: '52%' },
  },
  {
    // 1 — arus melebar rendah (Pemain)
    a: [[380, 470, 700, 300, 820, 380, 1240, 250], [640, 470, 880, 380, 1010, 430, 1240, 380]],
    b: [[460, 120, 760, 210, 900, 130, 1240, 60], [700, 250, 940, 300, 1060, 250, 1240, 190]],
    count: 36,
    glow: { cx: '80%', cy: '38%' },
  },
  {
    // 2 — jalinan diagonal cepat (Pertandingan)
    a: [[300, 470, 620, 380, 760, 210, 1120, 60], [520, 470, 800, 400, 940, 250, 1240, 130]],
    b: [[420, 90, 700, 190, 880, 300, 1240, 300], [640, -20, 900, 120, 1040, 230, 1240, 220]],
    count: 32,
    glow: { cx: '66%', cy: '30%' },
  },
  {
    // 3 — riak lembut memanjang (Merchandise / Pesanan)
    a: [[280, 300, 560, 200, 820, 400, 1240, 280], [280, 380, 580, 280, 840, 470, 1240, 360]],
    b: [[340, 130, 620, 60, 880, 250, 1240, 130], [400, 210, 660, 140, 900, 330, 1240, 210]],
    count: 38,
    glow: { cx: '84%', cy: '58%' },
  },
  {
    // 4 — busur tinggi menyilang (Berita / Prestasi / Sponsor)
    a: [[400, -30, 700, 170, 880, 100, 1240, 240], [560, 470, 820, 330, 1000, 400, 1240, 330]],
    b: [[300, 200, 620, 340, 860, 250, 1240, 400], [700, 60, 940, 200, 1080, 140, 1240, 100]],
    count: 35,
    glow: { cx: '74%', cy: '46%' },
  },
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
  const index = useMemo(() => {
    const found = ROUTE_VARIANT.find((rule) => rule.match.test(pathname));
    if (found) return found.variant;
    const seed = pathname.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return seed % VARIANTS.length;
  }, [pathname]);

  const preset = VARIANTS[index];
  const families = useMemo(
    () => [family(preset.a[0], preset.a[1], preset.count), family(preset.b[0], preset.b[1], preset.count)],
    [preset]
  );
  const uid = `phb${index}`;

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 1200 420"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      data-testid={testId}
      data-variant={index}
    >
      <defs>
        <linearGradient id={`${uid}-base`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={NAVY} />
          <stop offset="46%" stopColor={NAVY_MID} />
          <stop offset="100%" stopColor={NAVY_DEEP} />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx={preset.glow.cx} cy={preset.glow.cy} r="48%">
          <stop offset="0%" stopColor="#1F74F0" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#1F74F0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${uid}-pinch`} cx={preset.glow.cx} cy={preset.glow.cy} r="22%">
          <stop offset="0%" stopColor={LINE_GLOW} stopOpacity="0.42" />
          <stop offset="100%" stopColor={LINE_GLOW} stopOpacity="0" />
        </radialGradient>
        <filter id={`${uid}-soft`} x="-10%" y="-30%" width="120%" height="160%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <radialGradient id={`${uid}-gold`} cx="92%" cy="90%" r="42%">
          <stop offset="0%" stopColor={GOLD} stopOpacity="0.14" />
          <stop offset="100%" stopColor={GOLD} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-veil`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={NAVY} stopOpacity="0.92" />
          <stop offset="38%" stopColor={NAVY} stopOpacity="0.3" />
          <stop offset="100%" stopColor={NAVY} stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="1200" height="420" fill={`url(#${uid}-base)`} />
      <rect width="1200" height="420" fill={`url(#${uid}-glow)`} />

      {families.map((lines, familyIndex) =>
        lines.map((line, lineIndex) => {
          // Garis di tengah pilinan lebih terang (kilau cyan), tepi memudar.
          const centre = 1 - Math.abs(line.t - 0.5) * 2;
          return (
            <path
              key={`${familyIndex}-${lineIndex}`}
              d={line.d}
              fill="none"
              stroke={centre > 0.58 ? LINE_GLOW : LINE_COOL}
              strokeOpacity={0.2 + centre * (familyIndex === 0 ? 0.6 : 0.48)}
              strokeWidth={0.6 + centre * 0.7}
            />
          );
        })
      )}

      {/* kilau pada puntiran (seperti referensi) */}
      <path
        d={families[0][Math.floor(preset.count / 2)].d}
        fill="none"
        stroke={LINE_GLOW}
        strokeOpacity="0.35"
        strokeWidth="5"
        filter={`url(#${uid}-soft)`}
      />
      <rect width="1200" height="420" fill={`url(#${uid}-pinch)`} />

      {/* aksen gold ALSABBAT — satu garis lembut, tidak menyilaukan */}
      <path
        d={families[0][Math.floor(preset.count / 2)].d}
        fill="none"
        stroke={GOLD}
        strokeOpacity="0.2"
        strokeWidth="1.5"
      />
      <rect width="1200" height="420" fill={`url(#${uid}-gold)`} />

      {/* ruang bersih di area teks (kiri) */}
      <rect width="1200" height="420" fill={`url(#${uid}-veil)`} />
    </svg>
  );
};

export default PageHeaderBackdrop;
