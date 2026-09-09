import React, { useMemo, useState } from 'react';
import { Image } from 'expo-image';

import { imageSourceCandidates } from '../lib/driveImage';

/**
 * expo-image dengan rantai fallback URL (dipakai untuk foto Google Drive).
 * Bila kandidat pertama gagal dimuat, otomatis mencoba kandidat berikutnya.
 */
export function RemoteImage({ uri, onLoadFailed, ...rest }) {
  const candidates = useMemo(() => imageSourceCandidates(uri), [uri]);
  const [step, setStep] = useState(0);
  const index = Math.min(step, Math.max(0, candidates.length - 1));
  const current = candidates[index];

  if (!current) return null;

  return (
    <Image
      {...rest}
      source={{ uri: current }}
      cachePolicy="memory-disk"
      onError={() => {
        if (index < candidates.length - 1) setStep(index + 1);
        else onLoadFailed?.();
      }}
    />
  );
}

export default RemoteImage;
