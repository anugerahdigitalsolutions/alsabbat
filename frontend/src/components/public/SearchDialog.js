import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Newspaper, Search, Swords, User } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import api from '../../lib/api';

const GROUPS = [
  { key: 'posts', label: 'Berita', icon: Newspaper, endpoint: '/content/posts', params: { status: 'PUBLISHED' }, to: (i) => `/news/${i.slug}`, title: (i) => i.title },
  { key: 'players', label: 'Pemain', icon: User, endpoint: '/players', params: { status: 'ACTIVE' }, to: (i) => `/players/${i.id}`, title: (i) => i.display_name || i.full_name },
  { key: 'matches', label: 'Pertandingan', icon: Swords, endpoint: '/matches', params: {}, to: (i) => `/matches/${i.id}`, title: (i) => `${i.date || ''} vs ${i.opponent?.name || 'Lawan'}` },
];

/** Quick search across existing public list endpoints (server-side `search`). */
export const SearchDialog = ({ open, onOpenChange }) => {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState({});
  const navigate = useNavigate();
  const query = term.trim();

  useEffect(() => {
    if (!open || query.length < 2) {
      setResults({});
      return undefined;
    }
    const timer = setTimeout(async () => {
      const entries = await Promise.all(
        GROUPS.map(async (group) => {
          try {
            const { data } = await api.get(group.endpoint, { params: { ...group.params, search: query, limit: 4 } });
            return [group.key, data?.items || []];
          } catch (e) {
            return [group.key, []];
          }
        })
      );
      setResults(Object.fromEntries(entries));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, open]);

  const total = useMemo(() => Object.values(results).reduce((sum, list) => sum + list.length, 0), [results]);

  const go = (to) => {
    onOpenChange(false);
    setTerm('');
    navigate(to);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0" data-testid="public-search-dialog">
        <DialogTitle className="sr-only">Pencarian</DialogTitle>
        <div className="flex items-center gap-2 border-b px-4 py-3" style={{ borderColor: 'var(--border-soft)' }}>
          <Search className="h-4 w-4" style={{ color: 'var(--muted-fg)' }} aria-hidden="true" />
          <Input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Cari berita, pemain, pertandingan…"
            className="border-0 shadow-none focus-visible:ring-0"
            aria-label="Kata kunci pencarian"
            data-testid="public-search-input"
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {query.length < 2 ? (
            <p className="p-4 text-sm" style={{ color: 'var(--muted-fg)' }}>
              Ketik minimal 2 karakter untuk mencari.
            </p>
          ) : total === 0 ? (
            <p className="p-4 text-sm" style={{ color: 'var(--muted-fg)' }} data-testid="public-search-empty">
              Tidak ada hasil untuk “{query}”.
            </p>
          ) : (
            GROUPS.map((group) => {
              const items = results[group.key] || [];
              if (!items.length) return null;
              const Icon = group.icon;
              return (
                <div key={group.key} className="mb-2">
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--muted-fg)' }}>
                    {group.label}
                  </p>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(group.to(item))}
                      className="als-focus flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-sm transition-colors duration-200 hover:bg-[color:rgba(1,40,145,0.06)]"
                      data-testid={`public-search-result-${item.id}`}
                    >
                      <Icon className="h-4 w-4 shrink-0" style={{ color: 'var(--club-secondary)' }} aria-hidden="true" />
                      <span className="truncate font-medium">{group.title(item)}</span>
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SearchDialog;
