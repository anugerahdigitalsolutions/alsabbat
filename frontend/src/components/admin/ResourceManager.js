import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api, { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { LoadingState } from '../shared/LoadingState';
import { ErrorState } from '../shared/ErrorState';
import { EmptyState } from '../shared/EmptyState';

const PAGE_SIZE = 20;
const NONE = '__none__';

/* ------------------------------ helpers ------------------------------ */
export const getPath = (obj, path) =>
  String(path)
    .split('.')
    .reduce((acc, key) => (acc === null || acc === undefined ? undefined : acc[key]), obj);

export const setPath = (obj, path, value) => {
  const keys = String(path).split('.');
  const clone = { ...obj };
  let cursor = clone;
  keys.forEach((key, index) => {
    if (index === keys.length - 1) {
      cursor[key] = value;
    } else {
      cursor[key] = { ...(cursor[key] || {}) };
      cursor = cursor[key];
    }
  });
  return clone;
};

const buildInitialValues = (fields, defaults = {}, row = null) => {
  let values = { ...defaults };
  fields.forEach((field) => {
    const existing = row ? getPath(row, field.name) : undefined;
    const fallback = getPath(defaults, field.name);
    let value = existing !== undefined && existing !== null ? existing : fallback;
    if (value === undefined || value === null) {
      if (field.type === 'switch') value = false;
      else if (field.type === 'multiselect') value = [];
      else value = '';
    }
    if (field.type === 'multiselect' && Array.isArray(value)) value = value.join(', ');
    values = setPath(values, field.name, value);
  });
  return values;
};

const preparePayload = (fields, values) => {
  let payload = {};
  fields.forEach((field) => {
    let value = getPath(values, field.name);
    if (field.type === 'number') {
      value = value === '' || value === null ? null : Number(value);
      if (Number.isNaN(value)) value = null;
    }
    if (field.type === 'multiselect') {
      value = String(value || '')
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
    }
    if (typeof value === 'string') {
      value = value.trim();
      if (value === '') value = null;
    }
    if (value === NONE) value = null;
    if (value === null && field.type === 'switch') value = false;
    payload = setPath(payload, field.name, value);
  });
  return payload;
};

/* --------------------------- option loading --------------------------- */
function useRemoteOptions(fields, filters) {
  const sources = useMemo(() => {
    const list = [];
    [...fields, ...filters].forEach((item) => {
      if (item.optionsFrom) list.push(item.optionsFrom);
    });
    return list;
  }, [fields, filters]);

  const [optionMap, setOptionMap] = useState({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const entries = await Promise.all(
        sources.map(async (source) => {
          try {
            const { data } = await api.get(source.endpoint, { params: { limit: 200 } });
            const options = (data?.items || []).map((item) => ({
              value: item[source.valueKey || 'id'],
              label: item[source.labelKey || 'name'] || item.title || item.id,
            }));
            return [source.endpoint, options];
          } catch (e) {
            return [source.endpoint, []];
          }
        })
      );
      if (!cancelled) setOptionMap(Object.fromEntries(entries));
    };
    if (sources.length) load();
    return () => {
      cancelled = true;
    };
  }, [sources]);

  return optionMap;
}

/* ------------------------------- field -------------------------------- */
const FieldControl = ({ field, value, onChange, optionMap, testPrefix }) => {
  const testId = `${testPrefix}-field-${field.name.replace(/\./g, '-')}`;
  const options =
    field.options || (field.optionsFrom ? optionMap[field.optionsFrom.endpoint] || [] : []);

  if (field.type === 'textarea') {
    return (
      <Textarea
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={field.rows || 4}
        className="bg-white"
        data-testid={testId}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <Select
        value={value === '' || value === null || value === undefined ? NONE : String(value)}
        onValueChange={(v) => onChange(v === NONE ? '' : v)}
      >
        <SelectTrigger className="bg-white" data-testid={testId}>
          <SelectValue placeholder={field.placeholder || 'Pilih…'} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {!field.required ? <SelectItem value={NONE}>— Tidak dipilih —</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (field.type === 'switch') {
    return (
      <div className="flex h-10 items-center">
        <Switch checked={!!value} onCheckedChange={onChange} data-testid={testId} />
      </div>
    );
  }

  if (field.type === 'color') {
    return (
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-[var(--radius-sm)] border"
          style={{ borderColor: 'var(--border-soft)' }}
          aria-label={field.label}
          data-testid={`${testId}-picker`}
        />
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#FCCF2B"
          className="bg-white font-mono"
          data-testid={testId}
        />
      </div>
    );
  }

  return (
    <Input
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : field.type === 'password' ? 'password' : 'text'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className="bg-white"
      data-testid={testId}
    />
  );
};

/* --------------------------- main component --------------------------- */
export const ResourceManager = ({
  title,
  description,
  endpoint,
  writePermission,
  columns = [],
  fields = [],
  filters = [],
  searchable = true,
  defaults = {},
  emptyTitle = 'Belum ada data',
  emptyDescription = 'Tambahkan data pertama untuk mulai.',
  emptyIcon,
  testPrefix,
  singleRecordMode = false,
  allowCreate = true,
  allowDelete = true,
  extraActions = null,
  onChanged,
}) => {
  const { hasPermission } = useAuth();
  const canWrite = hasPermission(writePermission);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const optionMap = useRemoteOptions(fields, filters);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: PAGE_SIZE, skip: page * PAGE_SIZE };
      if (query) params.q = query;
      Object.entries(filterValues).forEach(([key, value]) => {
        if (value && value !== 'all') params[key] = value;
      });
      const { data } = await api.get(endpoint, { params });
      setItems(data?.items || []);
      setTotal(data?.total || 0);
    } catch (e) {
      setError(apiErrorMessage(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, query, filterValues]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setValues(buildInitialValues(fields, defaults, null));
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setValues(buildInitialValues(fields, defaults, row));
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const missing = fields.filter(
      (f) => f.required && !String(getPath(values, f.name) ?? '').trim() && f.type !== 'switch'
    );
    if (missing.length) {
      toast.error(`Lengkapi field wajib: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setSaving(true);
    try {
      const payload = preparePayload(fields, values);
      if (editing) {
        await api.patch(`${endpoint}/${editing.id}`, payload);
        toast.success('Data berhasil diperbarui');
      } else {
        await api.post(endpoint, payload);
        toast.success('Data berhasil dibuat');
      }
      setDialogOpen(false);
      setEditing(null);
      await load();
      if (onChanged) onChanged();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menyimpan data'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`${endpoint}/${deleteTarget.id}`);
      toast.success('Data berhasil dihapus');
      setDeleteTarget(null);
      await load();
      if (onChanged) onChanged();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Gagal menghapus data'));
      setDeleteTarget(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const showCreate = canWrite && allowCreate && !(singleRecordMode && total >= 1);

  return (
    <div className="space-y-6" data-testid={`${testPrefix}-page`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight" data-testid={`${testPrefix}-title`}>
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--muted-fg)' }}>
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {extraActions}
          <Button variant="outline" size="sm" onClick={load} data-testid={`${testPrefix}-refresh-button`}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Muat ulang
          </Button>
          {showCreate ? (
            <Button
              size="sm"
              onClick={openCreate}
              className="font-semibold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
              data-testid={`${testPrefix}-create-button`}
            >
              <Plus className="mr-2 h-4 w-4" />
              Tambah
            </Button>
          ) : null}
        </div>
      </div>

      {!canWrite ? (
        <div
          className="rounded-[var(--radius-md)] px-4 py-3 text-sm"
          style={{ backgroundColor: 'rgba(2,132,199,0.08)', color: '#075985' }}
          data-testid={`${testPrefix}-readonly-notice`}
        >
          Role Anda hanya memiliki akses baca untuk modul ini. Permission diterapkan di backend.
        </div>
      ) : null}

      <div className="als-card overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: 'var(--border-soft)' }}>
          {searchable ? (
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--muted-fg)' }} />
              <Input
                value={query}
                onChange={(e) => {
                  setPage(0);
                  setQuery(e.target.value);
                }}
                placeholder="Cari…"
                className="bg-white pl-9"
                data-testid={`${testPrefix}-search-input`}
              />
            </div>
          ) : (
            <span />
          )}

          {filters.length ? (
            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => {
                const options = filter.options || optionMap[filter.optionsFrom?.endpoint] || [];
                return (
                  <Select
                    key={filter.name}
                    value={filterValues[filter.name] || 'all'}
                    onValueChange={(v) => {
                      setPage(0);
                      setFilterValues((prev) => ({ ...prev, [filter.name]: v }));
                    }}
                  >
                    <SelectTrigger className="w-full bg-white sm:w-48" data-testid={`${testPrefix}-filter-${filter.name}`}>
                      <SelectValue placeholder={filter.label} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">{filter.label}: Semua</SelectItem>
                      {options.map((option) => (
                        <SelectItem key={String(option.value)} value={String(option.value)}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                );
              })}
            </div>
          ) : null}
        </div>

        <div className="p-4">
          {loading ? (
            <LoadingState variant="table" rows={5} testId={`${testPrefix}-loading`} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} testId={`${testPrefix}-error`} />
          ) : items.length === 0 ? (
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
              actionLabel={showCreate ? 'Tambah data' : undefined}
              onAction={showCreate ? openCreate : undefined}
              testId={`${testPrefix}-empty`}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ backgroundColor: 'rgba(1,40,145,0.04)' }}>
                    {columns.map((column) => (
                      <TableHead key={column.key} className={column.className}>
                        {column.label}
                      </TableHead>
                    ))}
                    <TableHead className="w-[110px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((row) => (
                    <TableRow key={row.id} data-testid={`${testPrefix}-row-${row.id}`}>
                      {columns.map((column) => (
                        <TableCell key={column.key} className={column.className}>
                          {column.render ? column.render(row) : String(getPath(row, column.key) ?? '—')}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canWrite ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(row)}
                              aria-label="Edit"
                              data-testid={`${testPrefix}-edit-${row.id}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          ) : null}
                          {canWrite && allowDelete ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteTarget(row)}
                              aria-label="Hapus"
                              data-testid={`${testPrefix}-delete-${row.id}`}
                            >
                              <Trash2 className="h-4 w-4" style={{ color: 'var(--error)' }} />
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {!loading && !error && items.length > 0 ? (
          <div
            className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: 'var(--border-soft)' }}
          >
            <p className="text-xs" style={{ color: 'var(--muted-fg)' }} data-testid={`${testPrefix}-pagination-info`}>
              {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} dari {total} data
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                data-testid={`${testPrefix}-prev-page`}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                data-testid={`${testPrefix}-next-page`}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-h-[88vh] max-w-2xl overflow-y-auto bg-white"
          data-testid={`${testPrefix}-form-dialog`}
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? `Edit ${title}` : `Tambah ${title}`}
            </DialogTitle>
            <DialogDescription>
              Field bertanda * wajib diisi. Validasi juga diterapkan di backend.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div
                key={field.name}
                className={field.full ? 'sm:col-span-2' : ''}
              >
                <Label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted-fg)' }}>
                  {field.label}
                  {field.required ? ' *' : ''}
                </Label>
                <FieldControl
                  field={field}
                  value={getPath(values, field.name)}
                  onChange={(v) => setValues((prev) => setPath(prev, field.name, v))}
                  optionMap={optionMap}
                  testPrefix={testPrefix}
                />
                {field.help ? (
                  <p className="mt-1 text-xs" style={{ color: 'var(--muted-fg)' }}>
                    {field.help}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} data-testid={`${testPrefix}-form-cancel`}>
              Batal
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="font-semibold"
              style={{ backgroundColor: 'var(--club-primary)', color: '#1A1A1A' }}
              data-testid={`${testPrefix}-form-submit`}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-white" data-testid={`${testPrefix}-delete-dialog`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Hapus data ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Data akan dihapus permanen dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid={`${testPrefix}-delete-cancel`}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              style={{ backgroundColor: 'var(--error)', color: '#fff' }}
              data-testid={`${testPrefix}-delete-confirm`}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ResourceManager;
