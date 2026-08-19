import { useRef, useCallback, useState } from 'react';
import type { Match, MatchesRange } from '../types';

export function useFrozenMatches(data: Match[] | undefined, range: MatchesRange) {
  const frozenRef = useRef<Match[]>(data ?? []);
  const rangeRef = useRef<MatchesRange>(range);
  const latestDataRef = useRef<Match[]>(data ?? []);
  const [, forceRender] = useState(0);

  latestDataRef.current = data ?? [];

  if (rangeRef.current !== range) {
    rangeRef.current = range;
    frozenRef.current = data ?? [];
  }

  const refresh = useCallback(() => {
    frozenRef.current = latestDataRef.current;
    forceRender((n) => n + 1);
  }, []);

  return { frozen: frozenRef.current, refresh };
}
