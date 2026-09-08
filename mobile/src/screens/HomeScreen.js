import React, { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Screen from '../components/Screen';
import Txt from '../components/Txt';
import { SectionHeader } from '../components/TopBar';
import { BannerCarousel } from '../components/BannerCarousel';
import { QuickLinks } from '../components/QuickLinks';
import { MatchCard } from '../components/MatchCard';
import { NewsCard } from '../components/NewsCard';
import { PlayerCard, AlbumCard } from '../components/PlayerCard';
import { ProductCard } from '../components/ProductCard';
import { Avatar } from '../components/Crest';
import { EmptyState, ErrorState, Loading, RestrictedNotice } from '../components/States';
import { useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import { greeting } from '../lib/format';
import { pickLastResult, pickNextMatch } from '../lib/matchUtils';
import { resolveMediaUrl } from '../api/client';

const LOGO = require('../../assets/logo.png');

/**
 * Home — every section is driven by the existing public API. Sections that
 * return nothing are hidden or show a proper empty state; nothing is mocked.
 */
export default function HomeScreen({ navigation }) {
  const { customer, canViewGallery, unreadCount, isAuthenticated } = useAuth();
  const { clubLogo, shortName } = useClub();

  const banners = useResourceList(() => endpoints.getBanners(), []);
  const matches = useResourceList(() => endpoints.getMatches({ limit: 40 }), []);
  const news = useResourceList(() => endpoints.getPosts({ limit: 6, status: 'PUBLISHED' }), []);
  const players = useResourceList(() => endpoints.getPlayers({ limit: 10, status: 'ACTIVE' }), []);
  // Merchandise: bagian ini otomatis tersembunyi bila toko kosong atau bila
  // backend yang terpasang belum memiliki modul merchandise.
  const products = useResourceList(() => endpoints.getProducts({ limit: 8 }), []);
  const albums = useResourceList(() => endpoints.getAlbums({ limit: 6 }), [canViewGallery], {
    enabled: canViewGallery,
  });

  const nextMatch = useMemo(() => pickNextMatch(matches.items), [matches.items]);
  const lastResult = useMemo(() => pickLastResult(matches.items), [matches.items]);
  const otherMatches = useMemo(
    () =>
      matches.items
        .filter((match) => match.id !== nextMatch?.id && match.id !== lastResult?.id)
        .slice(0, 3),
    [matches.items, nextMatch, lastResult]
  );
  const featuredNews = news.items[0];
  const restNews = news.items.slice(1, 5);

  const refresh = useCallback(() => {
    banners.refresh();
    matches.refresh();
    news.refresh();
    players.refresh();
    products.refresh();
    if (canViewGallery) albums.refresh();
  }, [banners, matches, news, players, products, albums, canViewGallery]);

  const quickLinks = useMemo(
    () => [
      { key: 'match', label: 'Pertandingan', icon: 'football-outline', onPress: () => navigation.navigate('Match') },
      { key: 'news', label: 'Berita', icon: 'newspaper-outline', onPress: () => navigation.navigate('News') },
      { key: 'media', label: 'Media', icon: 'images-outline', onPress: () => navigation.navigate('Media') },
      { key: 'squad', label: 'Skuad', icon: 'people-outline', onPress: () => navigation.navigate('Squad') },
      { key: 'store', label: 'Toko', icon: 'bag-handle-outline', onPress: () => navigation.navigate('Store') },
      { key: 'club', label: 'Klub', icon: 'shield-outline', onPress: () => navigation.navigate('ClubInfo') },
      {
        key: 'card',
        label: 'Kartu Member',
        icon: 'card-outline',
        onPress: () => navigation.navigate(isAuthenticated ? 'MemberCard' : 'Login'),
      },
      {
        key: 'notif',
        label: 'Notifikasi',
        icon: 'notifications-outline',
        onPress: () => navigation.navigate(isAuthenticated ? 'Notifications' : 'Login'),
      },
      {
        key: 'membership',
        label: 'Keanggotaan',
        icon: 'ribbon-outline',
        onPress: () => navigation.navigate(isAuthenticated ? 'Membership' : 'Login'),
      },
    ],
    [navigation, isAuthenticated]
  );

  return (
    <Screen onRefresh={refresh} refreshing={matches.refreshing} testID="home-screen">
      {/* ------------------------------------------------------- header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {customer ? (
            <Avatar name={customer.full_name} photo={resolveMediaUrl(customer.photo_url)} size={42} />
          ) : (
            <Image source={clubLogo ? { uri: clubLogo } : LOGO} style={styles.headerLogo} contentFit="contain" />
          )}
          <View style={styles.headerText}>
            <Txt variant="meta" tone="muted">
              {greeting()}
            </Txt>
            <Txt variant="h3" numberOfLines={1}>
              {customer?.full_name || `${shortName || 'AL SABBAT'}`}
            </Txt>
          </View>
        </View>
        <Pressable
          onPress={() => navigation.navigate(isAuthenticated ? 'Notifications' : 'Login')}
          style={styles.bell}
          testID="home-notifications"
        >
          <Ionicons name="notifications-outline" size={20} color={colors.text} />
          {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
        </Pressable>
      </View>

      {/* ------------------------------------------------------ banners */}
      {banners.loading ? (
        <Loading rows={1} height={170} testID="home-banner-loading" />
      ) : (
        <BannerCarousel
          banners={banners.items}
          testID="home-banners"
          onCta={(path) => {
            if (path.startsWith('/matches')) navigation.navigate('Match');
            else if (path.startsWith('/news')) navigation.navigate('News');
            else if (path.startsWith('/gallery')) navigation.navigate('Media');
            else if (path.startsWith('/teams') || path.startsWith('/players')) navigation.navigate('Squad');
          }}
        />
      )}

      {/* --------------------------------------------------- quicklinks */}
      <View style={styles.quickWrap}>
        <QuickLinks items={quickLinks} testID="home-quicklinks" />
      </View>

      {/* --------------------------------------------------- next match */}
      <SectionHeader
        title="Pertandingan Terdekat"
        onAction={() => navigation.navigate('Match')}
        testID="home-next-header"
      />
      {matches.loading ? (
        <Loading rows={1} height={150} />
      ) : matches.error ? (
        <ErrorState message={matches.error} onRetry={matches.reload} testID="home-matches-error" />
      ) : nextMatch ? (
        <MatchCard
          match={nextMatch}
          variant="featured"
          countdown
          onPress={() => navigation.navigate('MatchDetail', { matchId: nextMatch.id })}
          testID="home-next-match"
        />
      ) : (
        <EmptyState
          icon="calendar-outline"
          title="Belum ada jadwal"
          description={`Jadwal pertandingan ${shortName || 'AL SABBAT'} tampil di sini begitu dipublikasikan klub.`}
          testID="home-next-empty"
        />
      )}

      {/* ------------------------------------------------- last result */}
      {lastResult ? (
        <>
          <SectionHeader title="Hasil Terakhir" onAction={() => navigation.navigate('Match')} />
          <MatchCard
            match={lastResult}
            onPress={() => navigation.navigate('MatchDetail', { matchId: lastResult.id })}
            testID="home-last-result"
          />
        </>
      ) : null}

      {/* ---------------------------------------------- other fixtures */}
      {otherMatches.length ? (
        <>
          <SectionHeader title="Jadwal Lainnya" onAction={() => navigation.navigate('Match')} />
          <View style={styles.stack}>
            {otherMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                onPress={() => navigation.navigate('MatchDetail', { matchId: match.id })}
              />
            ))}
          </View>
        </>
      ) : null}

      {/* ------------------------------------------------- merchandise */}
      {products.items.length ? (
        <>
          <SectionHeader
            title="Merchandise Resmi"
            actionLabel="Buka toko"
            onAction={() => navigation.navigate('Store')}
            testID="home-store-header"
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hscroll}
            style={styles.hscrollWrap}
            testID="home-products"
          >
            {products.items.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                width={148}
                onPress={() =>
                  navigation.navigate('ProductDetail', {
                    slug: product.slug || product.id,
                    name: product.name,
                  })
                }
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* ---------------------------------------------------- berita */}
      {news.loading ? (
        <>
          <SectionHeader title="Berita Terbaru" />
          <Loading rows={1} height={170} />
        </>
      ) : featuredNews ? (
        <>
          <SectionHeader title="Berita Terbaru" onAction={() => navigation.navigate('News')} />
          <NewsCard
            post={featuredNews}
            variant="hero"
            onPress={() =>
              navigation.navigate('NewsDetail', { slug: featuredNews.slug, postId: featuredNews.id })
            }
            testID="home-news-featured"
          />
          {restNews.length ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hscroll}
              style={styles.hscrollWrap}
            >
              {restNews.map((post) => (
                <NewsCard
                  key={post.id}
                  post={post}
                  variant="tile"
                  onPress={() => navigation.navigate('NewsDetail', { slug: post.slug, postId: post.id })}
                />
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      {/* ----------------------------------------------------- skuad */}
      {players.items.length ? (
        <>
          <SectionHeader title="Skuad AL SABBAT" onAction={() => navigation.navigate('Squad')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hscroll}
            style={styles.hscrollWrap}
          >
            {players.items.map((player) => (
              <View key={player.id} style={styles.playerTile}>
                <PlayerCard
                  player={player}
                  onPress={() => navigation.navigate('PlayerDetail', { playerId: player.id })}
                />
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* ----------------------------------------------------- media */}
      <SectionHeader
        title="Media Terbaru"
        onAction={() => navigation.navigate('Media')}
        testID="home-media-header"
      />
      {!canViewGallery ? (
        <RestrictedNotice
          feature="Galeri AL SABBAT"
          onAction={isAuthenticated ? undefined : () => navigation.navigate('Login')}
          actionLabel="Masuk"
          testID="home-media-restricted"
        />
      ) : albums.loading ? (
        <Loading rows={1} height={150} />
      ) : albums.items.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hscroll}
          style={styles.hscrollWrap}
        >
          {albums.items.map((album) => (
            <AlbumCard
              key={album.id}
              album={album}
              width={210}
              onPress={() => navigation.navigate('AlbumDetail', { albumId: album.id, title: album.title })}
            />
          ))}
        </ScrollView>
      ) : (
        <EmptyState
          icon="images-outline"
          title="Belum ada album"
          description="Album foto pertandingan akan muncul di sini setelah dipublikasikan klub."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 12,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  headerLogo: { width: 42, height: 42 },
  headerText: { flex: 1 },
  bell: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.live,
  },
  quickWrap: { marginTop: 20 },
  stack: { gap: 12 },
  hscrollWrap: { marginHorizontal: -gutter, marginTop: 12 },
  hscroll: { paddingHorizontal: gutter, gap: 12 },
  playerTile: { width: 150 },
});
