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
 * First-launch onboarding — 4 slides, skippable, shown once per install.
 * Artwork: official club photography + official crest artwork bundled with
 * the app (see `scripts/prepare-native-assets.py`).
 */
const SLIDES = [
  {
    id: 'welcome',
    image: require('../../assets/onboarding-1.jpg'),
    title: 'Selamat datang di AL SABBAT',
    description:
      'Satu klub, satu semangat. Ikuti jadwal, hasil, dan Pusat Pertandingan AL SABBAT Football Club dalam satu aplikasi.',
  },
  {
    id: 'match',
    image: require('../../assets/onboarding-2.jpg'),
    title: 'Pertandingan & hasil resmi',
    description:
      'Pertandingan terdekat, skor akhir, dan jalannya laga langsung dari data resmi klub — tanpa perlu buka browser.',
  },
  {
    id: 'news',
    image: require('../../assets/onboarding-3.jpg'),
    title: 'Berita, media & skuad',
    description:
      'Kabar resmi klub, galeri foto setiap laga, serta profil pemain dan nomor punggung skuad AL SABBAT.',
  },
  {
    id: 'member',
    image: require('../../assets/onboarding-4.jpg'),
    title: 'Akun & kartu member',
    description:
      'Masuk dengan akun AL SABBAT untuk kartu member digital, notifikasi klub, dan akses media khusus.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);
  const { width, height } = Dimensions.get('window');

  const finish = useCallback(async () => {
    await markOnboardingSeen();
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  }, [navigation]);

  const next = useCallback(() => {
    if (index >= SLIDES.length - 1) {
      finish();
      return;
    }
    const target = index + 1;
    setIndex(target);
    listRef.current?.scrollToOffset({ offset: target * width, animated: true });
  }, [index, width, finish]);

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
            <Image source={item.image} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient
              colors={['rgba(1,26,94,0.25)', 'rgba(4,9,26,0.55)', 'rgba(4,9,26,0.97)']}
              style={StyleSheet.absoluteFill}
            />
          </View>
        )}
      />

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.top}>
          <Pressable onPress={finish} hitSlop={12} testID="onboarding-skip">
            <Txt variant="smallStrong" tone="muted">
              Lewati
            </Txt>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Txt variant="display" numberOfLines={2}>
            {SLIDES[index]?.title}
          </Txt>
          <Txt variant="body" tone="muted" style={styles.description}>
            {SLIDES[index]?.description}
          </Txt>
          <View style={styles.footer}>
            <View style={styles.dots}>
              {SLIDES.map((slide, dotIndex) => (
                <View
                  key={slide.id}
                  style={[styles.dot, dotIndex === index ? styles.dotActive : null]}
                />
              ))}
            </View>
            <PrimaryButton
              label={index >= SLIDES.length - 1 ? 'Mulai' : 'Lanjut'}
              onPress={next}
              style={styles.cta}
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
  top: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 10 },
  card: {
    margin: 16,
    padding: 20,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(12,21,51,0.86)',
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  description: { marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: 12 },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.borderStrong },
  dotActive: { width: 22, backgroundColor: colors.accent },
  cta: { flex: 1, maxWidth: 190 },
});
