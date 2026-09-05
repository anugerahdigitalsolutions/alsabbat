import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Share2 } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { usePageSeo } from '../../hooks/usePageSeo';
import { formatPublishDateTime } from '../../lib/publishTime';
import { resolveMediaUrl } from '../../components/public/gallery/mediaUtils';
import { BarayaTopBar } from '../components/BarayaTopBar';
import { BrzNewsCard } from '../components/BrzNewsCard';
import { BrzSection } from '../components/BrzSection';
import { BrzError, BrzLoading } from '../components/BrzStates';

/** AL SABBAT — News detail (`/api/content/posts/by-slug/{slug}`). */
export default function MobileNewsDetailScreen() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [category, setCategory] = useState(null);
  const [author, setAuthor] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCategory(null);
    setAuthor(null);
    try {
      const { data } = await api.get(`/content/posts/by-slug/${slug}`);
      setPost(data);
      if (data.category_id) {
        api
          .get(`/content/categories/${data.category_id}`)
          .then((res) => setCategory(res.data))
          .catch(() => {});
      }
      if (data.author_id) {
        api
          .get(`/content/authors/${data.author_id}`)
          .then((res) => setAuthor(res.data))
          .catch(() => {});
      }
      api
        .get('/content/posts', { params: { status: 'PUBLISHED', limit: 5 } })
        .then((res) => setRelated((res.data?.items || []).filter((item) => item.id !== data.id).slice(0, 4)))
        .catch(() => {});
    } catch (e) {
      setError(apiErrorMessage(e, 'Berita tidak ditemukan.'));
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  usePageSeo({
    title: post?.title || 'Berita',
    description: post?.excerpt || 'Berita AL SABBAT Football Club.',
    path: `/news/${slug}`,
  });

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: post?.title, url });
      else await navigator.clipboard?.writeText(url);
    } catch (e) {
      /* user cancelled */
    }
  };

  if (loading) {
    return (
      <div data-testid="baraya-news-detail">
        <BarayaTopBar back title="Berita" testId="brz-news-detail-topbar" />
        <div className="brz-page">
          <BrzLoading rows={3} height={120} testId="brz-news-detail-loading" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div data-testid="baraya-news-detail">
        <BarayaTopBar back title="Berita" backTo="/news" testId="brz-news-detail-topbar" />
        <div className="brz-page">
          <BrzError message={error || 'Berita tidak ditemukan.'} onRetry={load} testId="brz-news-detail-error" />
        </div>
      </div>
    );
  }

  const date = formatPublishDateTime(post.published_at || post.created_at);
  const cover = resolveMediaUrl(post.thumbnail);

  return (
    <div data-testid="baraya-news-detail">
      <BarayaTopBar
        back
        title="Berita"
        backTo="/news"
        testId="brz-news-detail-topbar"
        actions={
          <button type="button" className="brz-icon-btn" onClick={share} aria-label="Bagikan">
            <Share2 size={17} aria-hidden="true" />
          </button>
        }
      />

      <div className="brz-page">
        {cover ? (
          <div className="brz-card overflow-hidden">
            <img src={cover} alt={post.title} className="h-[208px] w-full object-cover" />
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {category?.name ? <span className="brz-badge brz-badge--accent">{category.name}</span> : null}
          {post.post_type && post.post_type !== 'ARTICLE' ? (
            <span className="brz-badge">{post.post_type.replace(/_/g, ' ')}</span>
          ) : null}
        </div>

        <h1 className="brz-h1 mt-3 text-[23px]" data-testid="brz-news-detail-title">
          {post.title}
        </h1>

        <p className="brz-meta mt-2">
          {[date, author?.name].filter(Boolean).join(' · ')}
        </p>

        {post.excerpt ? (
          <p
            className="mt-4 text-[14.5px] font-medium leading-relaxed"
            style={{ color: 'var(--brz-text)' }}
            data-testid="brz-news-detail-excerpt"
          >
            {post.excerpt}
          </p>
        ) : null}

        <div
          className="mt-4 whitespace-pre-line text-[14.5px] leading-[1.85]"
          style={{ color: 'var(--brz-text-muted)' }}
          data-testid="brz-news-detail-content"
        >
          {post.content || 'Isi berita belum tersedia.'}
        </div>

        {post.match_id ? (
          <Link to={`/matches/${post.match_id}`} className="brz-btn brz-btn--ghost brz-btn--block mt-5">
            Lihat pertandingan terkait
          </Link>
        ) : null}

        {related.length > 0 ? (
          <BrzSection title="Berita Lainnya" to="/news" testId="brz-news-detail-related">
            <div className="flex flex-col gap-3">
              {related.map((item) => (
                <BrzNewsCard key={item.id} post={item} />
              ))}
            </div>
          </BrzSection>
        ) : null}
      </div>
    </div>
  );
}
