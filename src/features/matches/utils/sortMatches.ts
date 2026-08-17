import type { Match, MatchesRange } from '../types';

function isOngoing(match: Match): boolean {
  return match.matchState === 'ONGOING';
}

export function sortMatches(matches: Match[], range: MatchesRange): Match[] {
  const byKickoffAsc = (a: Match, b: Match) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

  if (range !== 'today') {
    return [...matches].sort(byKickoffAsc);
  }

  const ongoing = matches.filter(isOngoing).sort(byKickoffAsc);
  const rest = matches.filter((m) => !isOngoing(m)).sort(byKickoffAsc);

  return [...ongoing, ...rest];
}
