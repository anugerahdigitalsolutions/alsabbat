import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { gutter } from '../theme';
import Screen from '../components/Screen';
import Txt from '../components/Txt';
import { NewsCard } from '../components/NewsCard';
import { ChipRow, EmptyState, ErrorState, Loading } from '../components/States';
import { useResourceList } from '../hooks/useResource';
import * as endpoints from '../api/endpoints';

/** News list — `/api/content/posts` (published only). */
export default function NewsScreen({ navigation }) {
  const [category, setCategory] = useState('all');
  const posts = useResourceList(() => endpoints.getPosts({ limit: 40, status: 'PUBLISHED' }), []);
  const categories = useResourceList(() => endpoints.getCategories({ limit: 30 }), []);

  const options = useMemo(() => {
    const used = new Set(posts.items.map((post) => post.category_id).filter(Boolean));
    return [
      { value: 'all', label: 'Semua' },
      ...categories.items
        .filter((item) => used.has(item.id))
        .map((item) => ({ value: item.id, label: item.name })),
    ];
  }, [categories.items, posts.items]);

  const list = useMemo(
    () => (category === 'all' ? posts.items : posts.items.filter((post) => post.category_id === category)),
    [posts.items, category]
  );

  const open = useCallback(
    (post) => navigation.navigate('NewsDetail', { slug: post.slug, postId: post.id }),
    [navigation]
  );

  const featured = list[0];
  const rest = list.slice(1);

  return (
    <Screen onRefresh={posts.refresh} refreshing={posts.refreshing} testID="news-screen">
      <View style={styles.header}>
        <Txt variant="display">Berita</Txt>
        <Txt variant="small" tone="muted">
          Kabar resmi AL SABBAT Football Club.
        </Txt>
      </View>

      {options.length > 1 ? (
        <View style={styles.chips}>
          <ChipRow options={options} value={category} onChange={setCategory} testID="news-categories" />
        </View>
      ) : null}

      {posts.loading ? (
        <Loading rows={3} height={140} testID="news-loading" />
      ) : posts.error ? (
        <ErrorState message={posts.error} onRetry={posts.reload} testID="news-error" />
      ) : list.length ? (
        <View style={styles.stack}>
          {featured ? (
            <NewsCard post={featured} variant="hero" onPress={() => open(featured)} testID="news-featured" />
          ) : null}
          {rest.map((post) => (
            <NewsCard key={post.id} post={post} onPress={() => open(post)} testID={`news-item-${post.id}`} />
          ))}
        </View>
      ) : (
        <EmptyState
          icon="newspaper-outline"
          title="Belum ada berita"
          description="Berita resmi klub akan tampil di sini setelah dipublikasikan."
          testID="news-empty"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 14, gap: 2 },
  chips: { marginHorizontal: -gutter, marginBottom: 16 },
  stack: { gap: 12 },
});
