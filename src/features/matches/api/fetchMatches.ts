import ky from '@toss/ky';
import type { Match, MatchesRange } from '../types';

const API_BASE_URL = 'http://localhost:9031';

export async function fetchMatches(range: MatchesRange): Promise<Match[]> {
  return ky
    .get(`${API_BASE_URL}/matches`, { searchParams: { range } })
    .json<Match[]>();
}
