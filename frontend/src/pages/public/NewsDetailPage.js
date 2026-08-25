import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Swords, User } from 'lucide-react';
import api, { apiErrorMessage } from '../../lib/api';
import { PublicPageHeader } from '../../components/public/PublicPageHeader';
import { LoadingState } from '../../components/shared/LoadingState';
import { ErrorState } from '../../components/shared/ErrorState';
import { NewsCardShell } from '../../components/public/NewsCardShell';
import { Badge } from '../../components/ui/badge';
import { usePageSeo } from '../../hooks/usePageSeo';

const fmt = (v) => {
  if (!v) return null;
  try {
    return new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) {
    return v;
  }
};

export default function NewsDetailPage() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);
  const [category, setCategory] = useState(null);
  const [author, setAuthor] = useState(null);
  const [match, setMatch] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  usePageSeo({
    title: post?.seo?.title || post?.title || 'Berita',
    description: post?.seo?.description || post?.excerpt || 'Berita resmi ALSABBAT Football Club.',
    image: post?.seo?.og_image || post?.thumbnail,
    path: `/news/${slug}`,
  });

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/content/posts/by-slug/${slug}`);
      setPost(data);
      const jobs = [];
      if (data.category_id) jobs.push(api.get(`/content/categories/${data.category_id}`).then((r) => setCategory(r.data)).catch(() => {}));
      if (data.author_id) jobs.push(api.get(`/content/authors/${data.author_id}`).then((r) => setAuthor(r.data)).catch(() => {}));
      if (data.match_id) jobs.push(api.get(`/matches/${data.match_id}`).then((r) => setMatch(r.data)).catch(() => {}));
      jobs.push(
        api
          .get('/content/posts', { params: { status: 'PUBLISHED', limit: 4 } })
          .then((r) => setRelated((r.data?.items || []).filter((p) => p.slug !== slug).slice(0, 3)))
          .catch(() => {})
      );
      await Promise.all(jobs);
    } catch (e) {
      setError(apiErrorMessage(e, 'Berita tidak ditemukan.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  return (
    <div data-testid="page-news-detail">
      <PublicPageHeader label="Newsroom" title={post?.title || 'Berita'} description={post?.excerpt} />
      <div className="als-container py-10">
        {loading ? (
          <LoadingState variant="text" testId="news-detail-loading" />
        ) : error ? (
          <ErrorState message={error} onRetry={load} testId="news-detail-error" />
        ) : (
          <article className="mx-auto max-w-3xl">
            <div className="mb-6 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--muted-fg)' }}>
              {category ? (
                <Badge className="border-0 font-semibold" style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }} data-testid="news-detail-category">
                  {category.name}
                </Badge>
              ) : null}
              <span className="inline-flex items-center gap-1.5" data-testid="news-detail-date">
                <CalendarDays className="h-3.5 w-3.5" />
                {fmt(post?.published_at || post?.created_at) || 'Tanggal belum diatur'}
              </span>
              {author ? (
                <span className="inline-flex items-center gap-1.5" data-testid="news-detail-author">
                  <User className="h-3.5 w-3.5" />
                  {author.name}
                </span>
              ) : null}
            </div>

            {post?.thumbnail ? (
              <img
                src={post.thumbnail}
                alt={post.title}
                className="mb-8 w-full rounded-[var(--radius-lg)] object-cover"
                loading="lazy"
              />
            ) : null}

            <div className="whitespace-pre-line text-base leading-relaxed" style={{ color: 'var(--fg)' }} data-testid="news-detail-content">
              {post?.content || 'Isi berita belum tersedia.'}
            </div>

            {match ? (
              <Link
                to="/matches"
                className="als-card mt-8 flex items-center gap-3 p-4"
                data-testid="news-detail-related-match"
              >
                <Swords className="h-5 w-5" style={{ color: 'var(--club-secondary)' }} />
                <span className="text-sm font-semibold">
                  Terkait pertandingan vs {match.opponent?.name} · {match.date}
                </span>
              </Link>
            ) : null}

            <Link to="/news" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'var(--club-secondary)' }} data-testid="news-detail-back">
              <ArrowLeft className="h-4 w-4" /> Kembali ke Berita
            </Link>
          </article>
        )}

        {related.length ? (
          <div className="mt-14">
            <p className="als-section-label mb-4">Berita Lainnya</p>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <Link key={item.id} to={`/news/${item.slug}`} data-testid={`news-related-${item.id}`}>
                  <NewsCardShell post={item} testId={`news-related-card-${item.id}`} />
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
