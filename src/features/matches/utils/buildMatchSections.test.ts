import { describe, it, expect } from 'vitest';
import { buildMatchSections } from './buildMatchSections';
import { makeMatch } from '../test/fixtures';

describe('buildMatchSections', () => {
  it('sorts non-today matches by kickoff time into a single section', () => {
    const later = makeMatch({ id: 2, startTime: '2026-08-17T08:00:00Z' });
    const earlier = makeMatch({ id: 1, startTime: '2026-08-17T05:00:00Z' });
    const result = buildMatchSections([later, earlier], 'upcoming');
    expect(result).toHaveLength(1);
    expect(result[0].matches.map((m) => m.id)).toEqual([1, 2]);
  });

  it('splits today matches into ongoing, finished, and upcoming sections in that order', () => {
    const finished = makeMatch({ id: 1, startTime: '2026-08-17T02:00:00Z', matchState: 'FINISHED' });
    const ongoing = makeMatch({ id: 2, startTime: '2026-08-17T09:00:00Z', matchState: 'ONGOING' });
    const scheduled = makeMatch({ id: 3, startTime: '2026-08-17T12:00:00Z', matchState: 'SCHEDULED' });
    const result = buildMatchSections([finished, scheduled, ongoing], 'today');

    expect(result.map((s) => s.status)).toEqual(['ongoing', 'finished', 'upcoming']);
    expect(result[0].matches.map((m) => m.id)).toEqual([2]);
    expect(result[1].matches.map((m) => m.id)).toEqual([1]);
    expect(result[2].matches.map((m) => m.id)).toEqual([3]);
  });

  it('sorts multiple ongoing matches among themselves by kickoff time', () => {
    const ongoingLater = makeMatch({ id: 1, startTime: '2026-08-17T09:00:00Z', matchState: 'ONGOING' });
    const ongoingEarlier = makeMatch({ id: 2, startTime: '2026-08-17T07:00:00Z', matchState: 'ONGOING' });
    const result = buildMatchSections([ongoingLater, ongoingEarlier], 'today');
    const ongoingSection = result.find((s) => s.status === 'ongoing')!;
    expect(ongoingSection.matches.map((m) => m.id)).toEqual([2, 1]);
  });

  it('ignores matchState on yesterday and upcoming tabs, sorting by kickoff time only', () => {
    const flaggedOngoing = makeMatch({ id: 1, startTime: '2026-08-16T09:00:00Z', matchState: 'ONGOING' });
    const normal = makeMatch({ id: 2, startTime: '2026-08-16T05:00:00Z', matchState: 'FINISHED' });
    const result = buildMatchSections([flaggedOngoing, normal], 'yesterday');
    expect(result).toHaveLength(1);
    expect(result[0].matches.map((m) => m.id)).toEqual([2, 1]);
  });

  it('treats an unrecognized matchState value as not-live, sorting it into upcoming (defensive default)', () => {
    const unknownState = makeMatch({ id: 1, startTime: '2026-08-17T02:00:00Z', matchState: 'CANCELLED' });
    const scheduled = makeMatch({ id: 2, startTime: '2026-08-17T09:00:00Z', matchState: 'SCHEDULED' });
    const result = buildMatchSections([scheduled, unknownState], 'today');
    const upcomingSection = result.find((s) => s.status === 'upcoming')!;
    // Neither is ONGOING or FINISHED, so both fall into upcoming, kickoff-ascending.
    expect(upcomingSection.matches.map((m) => m.id)).toEqual([1, 2]);
  });

  it('returns empty sections for an empty input array', () => {
    const result = buildMatchSections([], 'today');
    expect(result.every((s) => s.matches.length === 0)).toBe(true);
  });

  it('never drops a match — every input match appears in exactly one section', () => {
    const a = makeMatch({ id: 1, matchState: 'ONGOING' });
    const b = makeMatch({ id: 2, matchState: 'FINISHED' });
    const c = makeMatch({ id: 3, matchState: 'SCHEDULED' });
    const d = makeMatch({ id: 4, matchState: 'CANCELLED' });
    const result = buildMatchSections([a, b, c, d], 'today');
    const allIds = result.flatMap((s) => s.matches.map((m) => m.id));
    expect(allIds.sort()).toEqual([1, 2, 3, 4]);
  });
});
