import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import api from '../../lib/api';
import { BrzLoading } from './BrzStates';

/**
 * Mobile search sheet.
 *
 * Queries the EXISTING public endpoints (`/content/posts`, `/players`,
 * `/matches`) with the `search`/`q` parameters they already support. No new
 * backend, no client-side fake index.
 */
const useDebounced = (value, delay = 320) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

export const BrzSearchSheet = ({ open, onClose }) => {
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ posts: [], players: [] });
  const inputRef = useRef(null);
  const query = useDebounced(term.trim());

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(timer);
    }
    setTerm('');
    setResults({ posts: [], players: [] });
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open || query.length < 2) {
      setResults({ posts: [], players: [] });
      return undefined;
    }
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      api.get('/content/posts', { params: { limit: 6, status: 'PUBLISHED', q: query } }),
      api.get('/players', { params: { limit: 6, status: 'ACTIVE', q: query } }),
    ])
      .then(([postsRes, playersRes]) => {
        if (!alive) return;
        setResults({
          posts: postsRes.status === 'fulfilled' ? postsRes.value.data?.items || [] : [],
          players: playersRes.status === 'fulfilled' ? playersRes.value.data?.items || [] : [],
        });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, query]);

  const empty = useMemo(
    () => query.length >= 2 && !loading && results.posts.length === 0 && results.players.length === 0,
    [query, loading, results]
  );

  if (!open) return null;

  return (
    <div className="brz-sheet" role="dialog" aria-modal="true" aria-label="Pencarian" data-testid="brz-search-sheet">
      <button type="button" className="brz-sheet-backdrop" aria-label="Tutup pencarian" onClick={onClose} />
      <div className="brz-sheet-panel">
        <div className="flex items-center gap-2.5">
          <span className="flex flex-1 items-center gap-2 rounded-full px-3.5" style={{ height: 46, backgroundColor: 'var(--brz-surface-2)', border: '1px solid var(--brz-border)' }}>
            <Search size={17} style={{ color: 'var(--brz-text-dim)' }} aria-hidden="true" />
            <input
              ref={inputRef}
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Cari berita atau pemain…"
              className="w-full bg-transparent text-[14px] outline-none"
              style={{ color: 'var(--brz-text)' }}
              data-testid="brz-search-input"
            />
          </span>
          <button type="button" className="brz-icon-btn" onClick={onClose} aria-label="Tutup">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 max-h-[52vh] overflow-y-auto brz-noscroll">
          {query.length < 2 ? (
            <p className="brz-body py-4 text-center">Masukkan minimal 2 karakter.</p>
          ) : loading ? (
            <BrzLoading rows={2} height={56} testId="brz-search-loading" />
          ) : empty ? (
            <p className="brz-body py-4 text-center" data-testid="brz-search-empty">
              Tidak ada hasil untuk “{query}”.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {results.posts.map((post) => (
                <Link
                  key={post.id}
                  to={`/news/${post.slug || post.id}`}
                  onClick={onClose}
                  className="brz-tile flex items-center gap-3 p-3"
                >
                  <span className="brz-badge">Berita</span>
                  <span className="brz-clamp-1 flex-1 text-[13.5px] font-medium">{post.title}</span>
                </Link>
              ))}
              {results.players.map((player) => (
                <Link
                  key={player.id}
                  to={`/players/${player.id}`}
                  onClick={onClose}
                  className="brz-tile flex items-center gap-3 p-3"
                >
                  <span className="brz-badge">Pemain</span>
                  <span className="brz-clamp-1 flex-1 text-[13.5px] font-medium">
                    {player.display_name || player.full_name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrzSearchSheet;
