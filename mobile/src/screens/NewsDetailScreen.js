import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { colors, gutter, radii } from '../theme';
import Screen from '../components/Screen';
import TopBar from '../components/TopBar';
import Txt from '../components/Txt';
import { Badge } from '../components/Card';
import { ErrorState, Loading } from '../components/States';
import { useResource } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';
import { resolveMediaUrl } from '../api/client';
import { formatDateTime, stripHtml } from '../lib/format';

/** News detail — `/api/content/posts/by-slug/{slug}` (fallback: by id). */
export default function NewsDetailScreen({ navigation, route }) {
  const { slug, postId } = route?.params || {};

  const post = useResource(
    () => (slug ? endpoints.getPostBySlug(slug) : endpoints.getPostById(postId)),
    [slug, postId],
    { fallbackMessage: 'Berita tidak ditemukan.' }
  );

  const data = post.data;
  const cover = resolveMediaUrl(data?.cover_url || data?.thumbnail || data?.image_url);

  const paragraphs = useMemo(() => {
    const raw = data?.content || data?.body || '';
    if (!raw) return [];
    return String(raw)
      .split(/<\/p>|<br\s*\/?>|\n{2,}/i)
      .map((chunk) => stripHtml(chunk))
      .filter(Boolean);
  }, [data]);

  return (
    <Screen
      testID="news-detail-screen"
      header={<TopBar title="Berita" onBack={() => navigation.goBack()} />}
      onRefresh={post.refresh}
      refreshing={post.refreshing}
      bottomInset={40}
    >
        {post.loading ? (
          <Loading rows={3} height={120} />
        ) : post.error || !data ? (
          <ErrorState message={post.error || 'Berita tidak ditemukan.'} onRetry={post.reload} />
        ) : (
          <View style={styles.body}>
            {cover ? (
              <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" transition={220} />
            ) : null}
            <Txt variant="h1">{data.title}</Txt>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color={colors.textDim} />
              <Txt variant="meta" tone="dim">
                {formatDateTime(data.published_at || data.created_at)}
              </Txt>
              {data.post_type ? <Badge label={String(data.post_type).replace(/_/g, ' ')} /> : null}
            </View>
            {data.excerpt ? (
              <Txt variant="bodyStrong" tone="muted" style={styles.excerpt}>
                {stripHtml(data.excerpt)}
              </Txt>
            ) : null}
            {paragraphs.map((paragraph, index) => (
              <Txt key={`p-${index}`} variant="body" style={styles.paragraph}>
                {paragraph}
              </Txt>
            ))}
          </View>
        )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { gap: 10, paddingBottom: 20 },
  cover: { width: '100%', height: 210, borderRadius: radii.card, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  excerpt: { marginTop: 6 },
  paragraph: { marginTop: 4 },
  gutter: { paddingHorizontal: gutter },
});
