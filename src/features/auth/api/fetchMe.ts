import ky from '@toss/ky';
import type { Me } from '../types';

// dev 서버(vite.config.ts server.proxy)가 /api를 VITE_API_TARGET으로 프록시한다 — fetchMatches.ts와 동일 패턴.
// credentials: 'include'는 백엔드가 심는 HttpOnly 쿠키를 요청에 동봉하기 위해 필수.
export async function fetchMe(): Promise<Me> {
  return ky.get('/api/me', { credentials: 'include' }).json<Me>();
}
