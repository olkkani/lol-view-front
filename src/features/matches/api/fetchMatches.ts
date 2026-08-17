import ky from '@toss/ky';
import type { Match, MatchesRange } from '../types';

// dev 서버(vite.config.ts server.proxy)가 /api를 VITE_API_TARGET으로 프록시한다.
// prd 빌드에서는 이 프록시가 동작하지 않으므로 별도 방식(리버스 프록시 등)이 필요 — TODOS.md 참고.
export async function fetchMatches(range: MatchesRange): Promise<Match[]> {
  return ky
    .get('/api/matches', { searchParams: { range } })
    .json<Match[]>();
}
