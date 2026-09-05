import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { colors, font, radii } from '../theme';
import Txt from './Txt';
import { initials } from '../lib/format';

/**
 * Club / opponent crest. Falls back to the initials badge when the API has no
 * logo for the entity — never a placeholder logo of another club.
 */
export function Crest({ name, logo, size = 46, onLight = false }) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (logo) {
    return (
      <View style={[styles.wrap, dimension, onLight ? styles.onLight : styles.onDark]}>
        <Image
          source={{ uri: logo }}
          style={{ width: size * 0.82, height: size * 0.82 }}
          contentFit="contain"
          transition={160}
        />
      </View>
    );
  }
  return (
    <View style={[styles.wrap, dimension, onLight ? styles.onLight : styles.onDark]}>
      <Txt style={[styles.initials, { fontSize: size * 0.32 }]} tone={onLight ? 'onAccent' : 'accent'}>
        {initials(name)}
      </Txt>
    </View>
  );
}

/** Round avatar for people (player, staff, member). */
export function Avatar({ name, photo, size = 44 }) {
  const dimension = { width: size, height: size, borderRadius: size / 2 };
  if (photo) {
    return <Image source={{ uri: photo }} style={[dimension, styles.avatar]} contentFit="cover" transition={160} />;
  }
  return (
    <View style={[styles.wrap, dimension, styles.onDark]}>
      <Txt style={[styles.initials, { fontSize: size * 0.34 }]} tone="accent">
        {initials(name)}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  onDark: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  onLight: { backgroundColor: colors.white },
  initials: { fontFamily: font.bold },
  avatar: { backgroundColor: colors.surface2, borderRadius: radii.pill },
});

export default Crest;
