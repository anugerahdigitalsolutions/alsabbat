import React from 'react';
import { StyleSheet, Text as RNText } from 'react-native';

import { androidTextFix, colors, font } from '../theme';

/**
 * Single typography primitive so every screen shares the Poppins scale and
 * the AL SABBAT colour tokens.
 */
const VARIANTS = StyleSheet.create({
  display: { fontFamily: font.bold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  h1: { fontFamily: font.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  h2: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  h3: { fontFamily: font.semibold, fontSize: 16, lineHeight: 22 },
  title: { fontFamily: font.semibold, fontSize: 15, lineHeight: 21 },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 21 },
  bodyStrong: { fontFamily: font.medium, fontSize: 14, lineHeight: 21 },
  small: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18 },
  smallStrong: { fontFamily: font.semibold, fontSize: 12.5, lineHeight: 18 },
  meta: { fontFamily: font.medium, fontSize: 11.5, lineHeight: 16 },
  label: { fontFamily: font.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.6 },
  score: { fontFamily: font.bold, fontSize: 30, lineHeight: 34, letterSpacing: -1 },
});

const TONES = {
  default: colors.text,
  muted: colors.textMuted,
  dim: colors.textDim,
  accent: colors.accent,
  onAccent: colors.onAccent,
  live: colors.live,
  win: colors.win,
  lose: colors.lose,
  white: colors.white,
};

export function Txt({ variant = 'body', tone = 'default', style, children, ...rest }) {
  return (
    <RNText
      allowFontScaling={false}
      style={[
        VARIANTS[variant] || VARIANTS.body,
        androidTextFix,
        { color: TONES[tone] || tone },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}

export default Txt;
