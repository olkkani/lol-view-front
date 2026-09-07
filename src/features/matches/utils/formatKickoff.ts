// src/features/matches/utils/formatKickoff.ts
//
// `Match.startTime` arrives as an ISO 8601 string with an explicit offset
// (e.g. "2026-09-07T02:00:00+09:00"), so `new Date()` always resolves the
// correct instant — no parsing fix needed. But rendering it with
// `toLocaleDateString`/`toLocaleTimeString` and no `timeZone` falls back to
// the *viewer's* local timezone, which silently drifts the displayed
// kickoff time (and sometimes date) for anyone not in Asia/Seoul. LCK
// kickoff times are always KST regardless of who's watching, so pin it here.

const KST = 'Asia/Seoul';

export function formatKickoffTime(startTime: string): string {
  return new Date(startTime).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: KST,
  });
}

export function formatKickoffDate(startTime: string): string {
  return new Date(startTime).toLocaleDateString('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
    timeZone: KST,
  });
}
