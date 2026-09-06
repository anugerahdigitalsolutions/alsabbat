import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii } from '../theme';
import Txt from '../components/Txt';
import { PrimaryButton } from '../components/Buttons';
import { markOnboardingSeen } from '../lib/onboardingStore';

/**
 * Onboarding first-launch — 3 slide, dapat dilewati, hanya tampil sekali per
 * instalasi. Foto memakai asset resmi klub (`assets/onboarding-1..3.jpg`,
 * dihasilkan dari `assets/source/` oleh scripts/prepare-native-assets.py).
 * Teks dan slogan sesuai naskah resmi AL SABBAT Football Club.
 */
const SLOGAN = 'Melesaat Bersama ALSABBAT';

const SLIDES = [
  {
    id: 'welcome',
    image: require('../../assets/onboarding-1.jpg'),
    title: 'Selamat Datang di\nALSABBAT Football Club',
    description:
      'Lebih dari sekadar sepak bola.\nKami adalah keluarga, semangat, dan mimpi\nyang terus bergerak maju.',
  },
  {
    id: 'journey',
    image: require('../../assets/onboarding-2.jpg'),
    title: 'Ikuti Perjalanan\nTim Kesayanganmu',
    description:
      'Dapatkan informasi terbaru tentang\njadwal pertandingan, hasil laga, berita,\ndan perjalanan ALSABBAT.',
  },
  {
    id: 'future',
    image: require('../../assets/onboarding-3.jpg'),
    title: 'Bersama Membangun\nMasa Depan ALSABBAT',
    description:
      'Dukung, terhubung, dan jadilah bagian\ndari perjalanan besar ALSABBAT.\nKarena setiap langkah membawa kita\nmenuju mimpi yang lebih besar.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const { width, height } = Dimensions.get('window');
  const compact = height < 700;
  const isLast = index >= SLIDES.length - 1;

  const finish = useCallback(async () => {
    await markOnboardingSeen();
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }, [navigation]);

  const next = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    const target = index + 1;
    setIndex(target);
    listRef.current?.scrollToOffset({ offset: target * width, animated: true });
  }, [index, isLast, width, finish]);

  return (
    <View style={styles.wrap} testID="onboarding">
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / Math.max(1, width)))
        }
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            <Image
              source={item.image}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              contentPosition="top center"
              transition={200}
            />
            <LinearGradient
              colors={['rgba(1,26,94,0.18)', 'rgba(4,9,26,0.55)', 'rgba(4,9,26,0.97)']}
              locations={[0, 0.52, 1]}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.top}>
          <Pressable onPress={finish} hitSlop={12} testID="onboarding-skip" style={styles.skip}>
            <Txt variant="smallStrong" tone="muted">
              Lewati
            </Txt>
          </Pressable>
        </View>

        <View style={[styles.card, compact ? styles.cardCompact : null]}>
          <Txt variant={compact ? 'h1' : 'display'} style={styles.title}>
            {SLIDES[index]?.title}
          </Txt>
          <Txt variant="body" tone="muted" style={styles.description}>
            {SLIDES[index]?.description}
          </Txt>
          <View style={styles.sloganRow}>
            <View style={styles.sloganBar} />
            <Txt variant="smallStrong" tone="accent" numberOfLines={1} style={styles.slogan}>
              {SLOGAN}
            </Txt>
          </View>
          <View style={styles.footer}>
            <View style={styles.dots}>
              {SLIDES.map((slide, dotIndex) => (
                <View key={slide.id} style={[styles.dot, dotIndex === index ? styles.dotActive : null]} />
              ))}
            </View>
            <PrimaryButton
              label={isLast ? 'MULAI SEKARANG' : 'Lanjut'}
              onPress={next}
              style={[styles.cta, isLast ? styles.ctaWide : null]}
              testID="onboarding-next"
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },
  top: { alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8 },
  skip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(12,21,51,0.72)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  card: {
    margin: 14,
    padding: 20,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(9,16,40,0.9)',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardCompact: { padding: 16, gap: 8 },
  title: { letterSpacing: -0.4 },
  description: { marginTop: 2 },
  sloganRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  sloganBar: { width: 22, height: 2, borderRadius: 2, backgroundColor: colors.accent },
  slogan: { flex: 1, letterSpacing: 0.3 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 12 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotActive: { width: 22, backgroundColor: colors.accent },
  cta: { flex: 1, maxWidth: 180 },
  ctaWide: { maxWidth: 230 },
});
