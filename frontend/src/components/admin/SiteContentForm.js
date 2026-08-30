import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { SITE_CONTENT_EDITABLE_ENTRIES, SITE_CONTENT_GROUPS } from '../../lib/siteContent';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { LoadingState } from '../shared/LoadingState';

export const SiteContentForm = ({ clubName = 'AL SABBAT' }) => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission('content:write');
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/site-content', { params: { limit: 200 } });
      const map = {};
      (data?.items || []).forEach((item) => {
        map[item.key] = item.value || '';
      });
      setValues(map);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal memuat konten situs'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const items = SITE_CONTENT_EDITABLE_ENTRIES.map((entry) => ({
        key: entry.key,
        value: (values[entry.key] || '').trim(),
        label: entry.label,
        group: entry.group,
      }));
      await api.put('/site-content/bulk', { items });
      toast.success('Konten homepage tersimpan');
      await load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan konten'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState rows={4} testId="admin-site-content-loading" />;

  return (
    <div className="space-y-6" data-testid="admin-site-content">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm" style={{ color: 'var(--muted-fg)' }}>
          Teks editorial halaman publik (Homepage, Klub, Pemain, Kontak). Kosongkan sebuah field untuk kembali memakai teks bawaan (ditampilkan sebagai
          placeholder). Token <code>{'{club}'}</code> otomatis diganti menjadi nama klub.
        </p>
        {canWrite ? (
          <Button
            onClick={save}
            disabled={saving}
            className="font-semibold"
            style={{ backgroundColor: 'var(--club-primary)', color: '#000000' }}
            data-testid="admin-site-content-save"
          >
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Simpan
          </Button>
        ) : null}
      </div>

      {SITE_CONTENT_GROUPS.map((group) => (
        <div key={group.id} className="als-card p-5" data-testid={`admin-site-content-group-${group.id}`}>
          <h3 className="font-display mb-4 text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--club-secondary)' }}>
            {group.id}
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {group.entries.map((entry) => {
              const testId = `admin-site-content-field-${entry.key.replace(/\./g, '-')}`;
              const placeholder = entry.value.replace(/\{club\}/g, clubName);
              return (
                <div key={entry.key} className={entry.multiline ? 'sm:col-span-2' : ''}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <Label className="block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                      {entry.label}
                    </Label>
                    {canWrite && values[entry.key] ? (
                      <button
                        type="button"
                        onClick={() => setValues((prev) => ({ ...prev, [entry.key]: '' }))}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold"
                        style={{ color: 'var(--club-secondary)' }}
                        data-testid={`${testId}-reset`}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Default
                      </button>
                    ) : null}
                  </div>
                  {entry.multiline ? (
                    <Textarea
                      value={values[entry.key] || ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [entry.key]: e.target.value }))}
                      placeholder={placeholder}
                      rows={2}
                      disabled={!canWrite}
                      className="bg-white"
                      data-testid={testId}
                    />
                  ) : (
                    <Input
                      value={values[entry.key] || ''}
                      onChange={(e) => setValues((prev) => ({ ...prev, [entry.key]: e.target.value }))}
                      placeholder={placeholder}
                      disabled={!canWrite}
                      className="bg-white"
                      data-testid={testId}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SiteContentForm;
