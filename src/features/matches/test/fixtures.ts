import type { Match } from '../types';

export function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 1,
    leagueName: 'LCK',
    matchLabel: 'Week 1 Day 2',
    startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    matchState: 'SCHEDULED',
    clubs: [
      { name: 'T1', logoUrl: '', score: 0 },
      { name: 'GEN', logoUrl: '', score: 0 },
    ],
    ...overrides,
  };
}
