import ky from '@toss/ky';
import type { Team } from '../types';

// dev 서버(vite.config.ts server.proxy)가 /api를 VITE_API_TARGET으로 프록시한다 — fetchMatches.ts와 동일 패턴.
// 팔로우 상태는 로그인 사용자 기준이므로 credentials: 'include'로 세션 쿠키를 동봉한다 — fetchMe.ts와 동일 이유.
export async function fetchClubs(): Promise<Team[]> {
  return ky.get('/api/clubs', { credentials: 'include' }).json<Team[]>();
}
