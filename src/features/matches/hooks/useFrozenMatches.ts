import { useRef, useCallback, useState } from 'react';
import type { Match, MatchesRange } from '../types';

export function useFrozenMatches(data: Match[] | undefined, range: MatchesRange) {
  const frozenRef = useRef<Match[]>(data ?? []);
  const rangeRef = useRef<MatchesRange>(range);
  const latestDataRef = useRef<Match[]>(data ?? []);
  const latestDataDefinedRef = useRef<boolean>(data !== undefined);
  const hasFrozenRealDataRef = useRef<boolean>(data !== undefined);
  const [, forceRender] = useState(0);

  latestDataRef.current = data ?? [];
  latestDataDefinedRef.current = data !== undefined;

  if (rangeRef.current !== range) {
    rangeRef.current = range;
    frozenRef.current = data ?? [];
    hasFrozenRealDataRef.current = data !== undefined;
  } else if (!hasFrozenRealDataRef.current && data !== undefined) {
    // Cold start / still-loading render(s) froze an empty placeholder before
    // the query resolved. Adopt the first real data that arrives for this
    // range, so a successful fetch isn't permanently masked by the initial
    // undefined-data freeze. After this, normal freeze rules apply — later
    // data changes (poll ticks) are ignored until refresh() or a range switch.
    frozenRef.current = data;
    hasFrozenRealDataRef.current = true;
  }

  const refresh = useCallback(() => {
    // Only adopt data that is actually defined (a successful fetch). If the
    // caller invokes refresh() while the query is in an error/loading state
    // (data undefined), keep whatever was last frozen instead of clobbering
    // it to an empty list — there's nothing better to show yet.
    if (!latestDataDefinedRef.current) return;
    frozenRef.current = latestDataRef.current;
    hasFrozenRealDataRef.current = true;
    forceRender((n) => n + 1);
  }, []);

  return { frozen: frozenRef.current, refresh };
}
