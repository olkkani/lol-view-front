import type { Match, MatchesRange } from '../types';

export interface MatchSection {
  status: 'ongoing' | 'finished' | 'upcoming';
  matches: Match[];
}

function isOngoing(match: Match): boolean {
  return match.matchState === 'ONGOING';
}

function isFinished(match: Match): boolean {
  return match.matchState === 'FINISHED';
}

const byKickoffAsc = (a: Match, b: Match) =>
  new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

export function buildMatchSections(matches: Match[], range: MatchesRange): MatchSection[] {
  if (range !== 'today') {
    return [{ status: 'upcoming', matches: [...matches].sort(byKickoffAsc) }];
  }

  const ongoing = matches.filter(isOngoing).sort(byKickoffAsc);
  const finished = matches.filter((m) => !isOngoing(m) && isFinished(m)).sort(byKickoffAsc);
  const upcoming = matches.filter((m) => !isOngoing(m) && !isFinished(m)).sort(byKickoffAsc);

  return [
    { status: 'ongoing', matches: ongoing },
    { status: 'finished', matches: finished },
    { status: 'upcoming', matches: upcoming },
  ];
}
