import { useRef, useCallback } from 'react';
import type { Match, MatchesRange } from '../types';

export function useFrozenMatches(data: Match[] | undefined, range: MatchesRange) {
  const frozenRef = useRef<Match[]>(data ?? []);
  const rangeRef = useRef<MatchesRange>(range);
  const latestDataRef = useRef<Match[]>(data ?? []);

  latestDataRef.current = data ?? [];

  if (rangeRef.current !== range) {
    rangeRef.current = range;
    frozenRef.current = data ?? [];
  }

  const refresh = useCallback(() => {
    frozenRef.current = latestDataRef.current;
  }, []);

  return { frozen: frozenRef.current, refresh };
}
