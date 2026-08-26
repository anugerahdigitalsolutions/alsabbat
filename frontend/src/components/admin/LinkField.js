import React, { useEffect, useState } from 'react';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { INTERNAL_LINK_OPTIONS, isExternalLink } from '../../lib/internalLinks';

const KIND_INTERNAL = 'internal';
const KIND_EXTERNAL = 'external';
const NONE = '__none__';

/** Admin link picker: pilih halaman website (dropdown) atau isi tautan eksternal. */
export const LinkField = ({ value = '', onChange, testId }) => {
  const [kind, setKind] = useState(isExternalLink(value) ? KIND_EXTERNAL : KIND_INTERNAL);

  useEffect(() => {
    if (isExternalLink(value)) setKind(KIND_EXTERNAL);
  }, [value]);

  const onKindChange = (next) => {
    if (next === kind) return;
    setKind(next);
    onChange('');
  };

  return (
    <div className="space-y-2">
      <Select value={kind} onValueChange={onKindChange}>
        <SelectTrigger className="bg-white" data-testid={`${testId}-kind`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={KIND_INTERNAL}>Halaman Website</SelectItem>
          <SelectItem value={KIND_EXTERNAL}>Tautan Eksternal</SelectItem>
        </SelectContent>
      </Select>

      {kind === KIND_INTERNAL ? (
        <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? '' : v)}>
          <SelectTrigger className="bg-white" data-testid={`${testId}-page`}>
            <SelectValue placeholder="Pilih halaman…" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value={NONE}>— Tidak dipilih —</SelectItem>
            {INTERNAL_LINK_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="bg-white"
          data-testid={`${testId}-external`}
        />
      )}
    </div>
  );
};

export default LinkField;
