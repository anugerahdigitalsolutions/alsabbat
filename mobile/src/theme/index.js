/**
 * AL SABBAT design tokens (ported 1:1 from the official web palette so the
 * native app and the website stay visually identical).
 */
import { Platform } from 'react-native';

export const colors = {
  navy: '#012891',
  navyDeep: '#011A5E',
  bg: '#04091A',
  bgTop: '#0A1740',
  bgMid: '#060F2A',
  surface: 'rgba(255,255,255,0.055)',
  surfaceSolid: '#0C1533',
  surface2: 'rgba(255,255,255,0.085)',
  sunken: 'rgba(0,0,0,0.28)',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.18)',
  accent: '#FCCF2B',
  accentFrom: '#FFE370',
  accentTo: '#F5B916',
  accentSoft: 'rgba(252,207,43,0.14)',
  onAccent: '#08122E',
  text: '#EEF3FF',
  textMuted: '#93A2C9',
  textDim: '#6A7AA4',
  live: '#EF4444',
  win: '#22C55E',
  lose: '#F87171',
  white: '#FFFFFF',
  black: '#000000',
};

export const radii = { sm: 12, md: 16, card: 20, lg: 26, pill: 999 };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

export const gutter = 16;

export const font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
};

export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  nav: {
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 14,
  },
  // Glow emas hanya bisa dirender iOS. Di Android `elevation` memakai outline
  // kotak view sehingga tombol pill tampak seperti kotak abu — jadi dimatikan
  // agar bentuk tombol Android sama dengan iOS.
  accent: {
    shadowColor: colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: Platform.OS === 'android' ? 0 : 8,
  },
};

/** Metrik teks Android disamakan dengan iOS (props ini no-op di iOS). */
export const androidTextFix = {
  includeFontPadding: false,
  textAlignVertical: 'center',
};

export const gradients = {
  screen: [colors.bgTop, colors.bgMid, colors.bg],
  accent: [colors.accentFrom, colors.accentTo],
  navy: [colors.navy, colors.navyDeep],
  fade: ['transparent', 'rgba(4,9,26,0.35)', 'rgba(4,9,26,0.94)'],
};

export default { colors, radii, spacing, gutter, font, shadow, gradients, androidTextFix };
