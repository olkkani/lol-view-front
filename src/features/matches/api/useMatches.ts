import { useQuery } from '@tanstack/react-query';
import { fetchMatches } from './fetchMatches';
import type { MatchesRange } from '../types';

const TODAY_POLL_INTERVAL_MS = 15_000;

export function useMatches(range: MatchesRange) {
  return useQuery({
    queryKey: ['matches', range],
    queryFn: () => fetchMatches(range),
    refetchInterval: range === 'today' ? TODAY_POLL_INTERVAL_MS : false,
  });
}
