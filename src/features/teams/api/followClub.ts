import ky from '@toss/ky';

// POST/DELETE /clubs/{clubId} — 팔로우/언팔로우. 세션 쿠키 동봉 필요(fetchMe.ts와 동일 이유).
export async function followClub(clubId: number): Promise<void> {
  await ky.post(`/api/clubs/${clubId}`, { credentials: 'include' });
}

export async function unfollowClub(clubId: number): Promise<void> {
  await ky.delete(`/api/clubs/${clubId}`, { credentials: 'include' });
}
