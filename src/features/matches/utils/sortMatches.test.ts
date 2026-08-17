import { describe, it, expect } from 'vitest';
import { sortMatches } from './sortMatches';
import type { Match } from '../types';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 'm1',
    league: 'LCK',
    teams: [
      { id: 't1', name: 'T1' },
      { id: 't2', name: 'GEN' },
    ],
    kickoffAt: '2026-08-17T05:00:00Z',
    isLive: false,
    ...overrides,
  };
}

describe('sortMatches', () => {
  it('sorts today matches by kickoff time when none are live', () => {
    const later = makeMatch({ id: 'later', kickoffAt: '2026-08-17T08:00:00Z' });
    const earlier = makeMatch({ id: 'earlier', kickoffAt: '2026-08-17T05:00:00Z' });
    const result = sortMatches([later, earlier], 'today');
    expect(result.map((m) => m.id)).toEqual(['earlier', 'later']);
  });

  it('pins the single live match to the top regardless of kickoff time', () => {
    const finished = makeMatch({ id: 'finished', kickoffAt: '2026-08-17T02:00:00Z', isLive: false });
    const live = makeMatch({ id: 'live', kickoffAt: '2026-08-17T09:00:00Z', isLive: true });
    const upcoming = makeMatch({ id: 'upcoming', kickoffAt: '2026-08-17T12:00:00Z', isLive: false });
    const result = sortMatches([finished, upcoming, live], 'today');
    expect(result.map((m) => m.id)).toEqual(['live', 'finished', 'upcoming']);
  });

  it('sorts multiple live matches among themselves by kickoff time', () => {
    const liveLater = makeMatch({ id: 'live-later', kickoffAt: '2026-08-17T09:00:00Z', isLive: true });
    const liveEarlier = makeMatch({ id: 'live-earlier', kickoffAt: '2026-08-17T07:00:00Z', isLive: true });
    const result = sortMatches([liveLater, liveEarlier], 'today');
    expect(result.map((m) => m.id)).toEqual(['live-earlier', 'live-later']);
  });

  it('ignores isLive on yesterday and upcoming tabs, sorting by kickoff time only', () => {
    const flaggedLive = makeMatch({ id: 'flagged-live', kickoffAt: '2026-08-16T09:00:00Z', isLive: true });
    const normal = makeMatch({ id: 'normal', kickoffAt: '2026-08-16T05:00:00Z', isLive: false });
    const result = sortMatches([flaggedLive, normal], 'yesterday');
    expect(result.map((m) => m.id)).toEqual(['normal', 'flagged-live']);
  });

  it('returns an empty array unchanged', () => {
    expect(sortMatches([], 'today')).toEqual([]);
  });
});
