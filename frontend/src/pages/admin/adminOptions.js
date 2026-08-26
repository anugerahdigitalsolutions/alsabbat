/** Shared admin option helpers (single source of truth for match labels). */
export const matchOptionLabel = (match) => {
  const opponent = match?.opponent?.name || 'Lawan';
  const side = match?.venue_type === 'AWAY' ? 'Away' : match?.venue_type === 'NEUTRAL' ? 'Netral' : 'Home';
  const score =
    match?.home_score !== null && match?.home_score !== undefined
      ? ` (${match.home_score}-${match.away_score ?? 0})`
      : '';
  return `${match?.date || 'Tanpa tanggal'} · vs ${opponent} · ${side}${score}`;
};

export const matchOptions = { endpoint: '/matches', labelFn: matchOptionLabel };
