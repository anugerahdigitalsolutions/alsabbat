import React, { useCallback, useEffect, useState } from 'react';
import { Newspaper } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { useResourceList } from '../../hooks/useResourceList';
import { usePageSeo } from '../../hooks/usePageSeo';
import { BarayaTopBar } from '../components/BarayaTopBar';
import { BarayaNotificationButton } from '../components/BarayaNotificationButton';
import { BrzNewsCard } from '../components/BrzNewsCard';
import { BrzEmpty, BrzError, BrzLoading } from '../components/BrzStates';

const PAGE_SIZE = 10;

/** AL SABBAT — News screen (existing `/api/content/*` endpoints). */
export default function MobileNewsScreen() {
  const [categoryId, setCategoryId] = useState('all');
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  usePageSeo({
    title: 'Berita',
    description: 'Berita dan kabar terbaru AL SABBAT Football Club.',
    path: '/news',
  });

  const categories = useResourceList('/content/categories', { limit: 20 });

  const load = useCallback(
    async (nextSkip = 0) => {
      if (nextSkip === 0) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const { data } = await api.get('/content/posts', {
          params: {
            limit: PAGE_SIZE,
            skip: nextSkip,
            status: 'PUBLISHED',
            ...(categoryId !== 'all' ? { category_id: categoryId } : {}),
          },
        });
        setPosts((prev) => (nextSkip === 0 ? data.items || [] : [...prev, ...(data.items || [])]));
        setTotal(data.total || 0);
        setSkip(nextSkip);
      } catch (e) {
        setError(apiErrorMessage(e, 'Gagal memuat berita.'));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [categoryId]
  );

  useEffect(() => {
    load(0);
  }, [load]);

  const hasMore = posts.length < total;
  const [featured, ...rest] = posts;

  return (
    <div data-testid="baraya-news">
      <BarayaTopBar title="Berita" actions={<BarayaNotificationButton />} testId="brz-news-topbar" />

      <div className="brz-page">
        {categories.items.length > 0 ? (
          <div className="brz-hscroll -mx-4" data-testid="brz-news-categories">
            <button
              type="button"
              className={`brz-chip${categoryId === 'all' ? ' brz-chip--active' : ''}`}
              onClick={() => setCategoryId('all')}
            >
              Semua
            </button>
            {categories.items.map((category) => (
              <button
                key={category.id}
                type="button"
                className={`brz-chip${categoryId === category.id ? ' brz-chip--active' : ''}`}
                onClick={() => setCategoryId(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="mt-4 flex flex-col gap-3">
          {loading ? (
            <BrzLoading rows={3} height={100} testId="brz-news-loading" />
          ) : error ? (
            <BrzError message={error} onRetry={() => load(0)} testId="brz-news-error" />
          ) : posts.length === 0 ? (
            <BrzEmpty
              icon={Newspaper}
              title="Belum ada berita"
              description="Berita akan tampil di sini setelah dipublikasikan melalui Admin Panel."
              testId="brz-news-empty"
            />
          ) : (
            <>
              <BrzNewsCard post={featured} variant="hero" testId="brz-news-featured" />
              {rest.map((post) => (
                <BrzNewsCard key={post.id} post={post} />
              ))}
              {hasMore ? (
                <button
                  type="button"
                  className="brz-btn brz-btn--ghost brz-btn--block"
                  onClick={() => load(skip + PAGE_SIZE)}
                  disabled={loadingMore}
                  data-testid="brz-news-more"
                >
                  {loadingMore ? 'Memuat…' : 'Muat berita lainnya'}
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
