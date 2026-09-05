import ky from '@toss/ky';

// dev 서버(vite.config.ts server.proxy)가 /api를 VITE_API_TARGET으로 프록시한다 — fetchMe.ts와 동일 패턴.
export async function logout(): Promise<void> {
  await ky.post('/api/auth/logout', { credentials: 'include' });
}
