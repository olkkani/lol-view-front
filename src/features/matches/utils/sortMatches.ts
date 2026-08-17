import type { Match, MatchesRange } from '../types';

export function sortMatches(matches: Match[], range: MatchesRange): Match[] {
  const byKickoffAsc = (a: Match, b: Match) =>
    new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();

  if (range !== 'today') {
    return [...matches].sort(byKickoffAsc);
  }

  const live = matches.filter((m) => m.isLive).sort(byKickoffAsc);
  const rest = matches.filter((m) => !m.isLive).sort(byKickoffAsc);

  return [...live, ...rest];
}
