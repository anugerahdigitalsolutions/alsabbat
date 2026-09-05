import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Linking, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii, shadow } from '../theme';
import { resolveMediaUrl } from '../api/client';
import Txt from './Txt';

/**
 * Home hero carousel — strictly driven by `GET /api/banners/public`
 * (headline lines, subheadline, CTA, image). Nothing is hard-coded, and the
 * carousel is not rendered at all when the API returns no active banner.
 */
export function BannerCarousel({ banners = [], onCta, testID }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const width = Dimensions.get('window').width - gutter * 2;
  const height = Math.round(Math.min(width * 0.62, 260));

  const onScrollEnd = useCallback(
    (event) => {
      const page = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width + 12));
      setIndex(page);
    },
    [width]
  );

  const handleCta = useCallback(
    (banner) => {
      const url = banner?.cta_url;
      if (!url) return;
      if (onCta && !/^https?:\/\//i.test(url)) {
        onCta(url);
        return;
      }
      Linking.openURL(url).catch(() => {});
    },
    [onCta]
  );

  if (!banners.length) return null;

  return (
    <View testID={testID}>
      <FlatList
        ref={listRef}
        data={banners}
        keyExtractor={(item) => String(item.id)}
        horizontal
        pagingEnabled={banners.length > 1}
        showsHorizontalScrollIndicator={false}
        snapToInterval={width + 12}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const image = resolveMediaUrl(item.image_resolved || item.image_url);
          const lines = [item.headline_line_1, item.headline_line_2, item.headline_line_3].filter(Boolean);
          return (
            <View style={[styles.slide, { width, height }, shadow.card]}>
              {image ? (
                <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" transition={220} />
              ) : (
                <LinearGradient colors={[colors.navy, colors.navyDeep]} style={StyleSheet.absoluteFill} />
              )}
              <LinearGradient
                colors={['rgba(4,9,26,0.05)', 'rgba(4,9,26,0.55)', 'rgba(4,9,26,0.92)']}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.slideBody}>
                {item.eyebrow ? (
                  <View style={styles.eyebrow}>
                    <Txt variant="label" tone="onAccent">
                      {String(item.eyebrow).toUpperCase()}
                    </Txt>
                  </View>
                ) : null}
                {lines.length ? (
                  lines.map((line, lineIndex) => (
                    <Txt
                      key={`${item.id}-line-${lineIndex}`}
                      variant="h1"
                      tone={lines.length > 1 && lineIndex === lines.length - 1 ? 'accent' : 'default'}
                      numberOfLines={1}
                    >
                      {line}
                    </Txt>
                  ))
                ) : item.subheadline ? (
                  <Txt variant="h2" numberOfLines={2}>
                    {item.subheadline}
                  </Txt>
                ) : null}
                {lines.length && item.subheadline ? (
                  <Txt variant="small" tone="muted" numberOfLines={2} style={styles.sub}>
                    {item.subheadline}
                  </Txt>
                ) : null}
                {item.cta_label && item.cta_url ? (
                  <Pressable onPress={() => handleCta(item)} style={styles.cta}>
                    <Txt variant="smallStrong" tone="onAccent">
                      {item.cta_label}
                    </Txt>
                    <Ionicons name="arrow-forward" size={13} color={colors.onAccent} />
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        }}
      />
      {banners.length > 1 ? (
        <View style={styles.dots}>
          {banners.map((item, dotIndex) => (
            <View
              key={`dot-${item.id}`}
              style={[styles.dot, dotIndex === index ? styles.dotActive : null]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  slide: { borderRadius: radii.lg, overflow: 'hidden', backgroundColor: colors.surfaceSolid },
  slideBody: { flex: 1, justifyContent: 'flex-end', padding: 16, gap: 2 },
  eyebrow: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  sub: { marginTop: 4 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 12,
    backgroundColor: colors.accent,
    borderRadius: radii.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.borderStrong },
  dotActive: { width: 18, backgroundColor: colors.accent },
});

export default BannerCarousel;
