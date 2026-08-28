import { useEffect, useState } from 'react';

/** Live countdown to a Date (single source of truth for hero + matchday panels). */
export function useCountdown(target) {
  const [now, setNow] = useState(() => Date.now());
  const remaining = target ? target.getTime() - now : -1;
  const running = remaining > 0;

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const total = Math.max(0, Math.floor(remaining / 1000));
  return {
    running,
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

export default useCountdown;
