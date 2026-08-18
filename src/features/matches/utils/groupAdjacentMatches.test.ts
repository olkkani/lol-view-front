import { describe, it, expect } from 'vitest';
import { groupAdjacentMatches } from './groupAdjacentMatches';
import { makeMatch } from '../test/fixtures';
import type { Match } from '../types';

describe('groupAdjacentMatches', () => {
  it('returns an empty array unchanged', () => {
    expect(groupAdjacentMatches([])).toEqual([]);
  });

  it('groups consecutive matches sharing the same leagueName and matchLabel', () => {
    const a = makeMatch({ id: 1 });
    const b = makeMatch({ id: 2 });
    const result = groupAdjacentMatches([a, b]);
    expect(result).toMatchObject([
      { leagueName: 'LCK', matchLabel: 'Week 1 Day 2', matches: [a, b] },
    ]);
  });

  it('splits into separate groups when leagueName or matchLabel changes', () => {
    const a = makeMatch({ id: 1, leagueName: 'LCK' });
    const b = makeMatch({ id: 2, leagueName: 'LPL' });
    const c = makeMatch({ id: 3, leagueName: 'LPL', matchLabel: 'Week 2 Day 1' });
    const result = groupAdjacentMatches([a, b, c]);
    expect(result.map((g) => g.matches.map((m) => m.id))).toEqual([[1], [2], [3]]);
  });

  it('does not merge non-adjacent matches with the same leagueName and matchLabel', () => {
    const a = makeMatch({ id: 1, leagueName: 'LCK' });
    const b = makeMatch({ id: 2, leagueName: 'LPL' });
    const c = makeMatch({ id: 3, leagueName: 'LCK' });
    const result = groupAdjacentMatches([a, b, c]);
    expect(result.map((g) => g.matches.map((m) => m.id))).toEqual([[1], [2], [3]]);
  });

  it('treats matches sharing the same undefined leagueName as one group', () => {
    const a = makeMatch({ id: 1, leagueName: undefined as unknown as Match['leagueName'] });
    const b = makeMatch({ id: 2, leagueName: undefined as unknown as Match['leagueName'] });
    const result = groupAdjacentMatches([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0].matches.map((m) => m.id)).toEqual([1, 2]);
  });

  it('assigns a unique key to every group, even when a live match splits an otherwise-contiguous run', () => {
    // Reproduces the real "today" shape that caused the live-card-persists bug:
    // ONGOING matches are sorted to the front by sortMatches, so the same
    // leagueName+matchLabel pair (Week 1 Day 2) can legitimately appear in
    // two separate, non-adjacent groups.
    const liveDay2A = makeMatch({ id: 9002, matchState: 'ONGOING', matchLabel: 'Week 1 Day 2' });
    const liveDay2B = makeMatch({ id: 9010, matchState: 'ONGOING', matchLabel: 'Week 1 Day 2' });
    const finishedDay1A = makeMatch({ id: 9006, matchState: 'FINISHED', matchLabel: 'Week 1 Day 1' });
    const finishedDay1B = makeMatch({ id: 9007, matchState: 'FINISHED', matchLabel: 'Week 1 Day 1' });
    const finishedDay2A = makeMatch({ id: 9009, matchState: 'FINISHED', matchLabel: 'Week 1 Day 2' });
    const finishedDay2B = makeMatch({ id: 9008, matchState: 'FINISHED', matchLabel: 'Week 1 Day 2' });

    const result = groupAdjacentMatches([
      liveDay2A,
      liveDay2B,
      finishedDay1A,
      finishedDay1B,
      finishedDay2A,
      finishedDay2B,
    ]);

    expect(result).toHaveLength(3);
    const keys = result.map((g) => g.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
