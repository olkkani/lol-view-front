import { describe, it, expect } from 'vitest';
import { sortMatches } from './sortMatches';
import { makeMatch } from '../test/fixtures';

describe('sortMatches', () => {
  it('sorts today matches by kickoff time when none are live', () => {
    const later = makeMatch({ id: 2, startTime: '2026-08-17T08:00:00Z' });
    const earlier = makeMatch({ id: 1, startTime: '2026-08-17T05:00:00Z' });
    const result = sortMatches([later, earlier], 'today');
    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });

  it('pins the single ongoing match to the top regardless of kickoff time', () => {
    const finished = makeMatch({ id: 1, startTime: '2026-08-17T02:00:00Z', matchState: 'FINISHED' });
    const ongoing = makeMatch({ id: 2, startTime: '2026-08-17T09:00:00Z', matchState: 'ONGOING' });
    const scheduled = makeMatch({ id: 3, startTime: '2026-08-17T12:00:00Z', matchState: 'SCHEDULED' });
    const result = sortMatches([finished, scheduled, ongoing], 'today');
    expect(result.map((m) => m.id)).toEqual([2, 1, 3]);
  });

  it('sorts multiple ongoing matches among themselves by kickoff time', () => {
    const ongoingLater = makeMatch({ id: 1, startTime: '2026-08-17T09:00:00Z', matchState: 'ONGOING' });
    const ongoingEarlier = makeMatch({ id: 2, startTime: '2026-08-17T07:00:00Z', matchState: 'ONGOING' });
    const result = sortMatches([ongoingLater, ongoingEarlier], 'today');
    expect(result.map((m) => m.id)).toEqual([2, 1]);
  });

  it('ignores matchState on yesterday and upcoming tabs, sorting by kickoff time only', () => {
    const flaggedOngoing = makeMatch({ id: 1, startTime: '2026-08-16T09:00:00Z', matchState: 'ONGOING' });
    const normal = makeMatch({ id: 2, startTime: '2026-08-16T05:00:00Z', matchState: 'FINISHED' });
    const result = sortMatches([flaggedOngoing, normal], 'yesterday');
    expect(result.map((m) => m.id)).toEqual([2, 1]);
  });

  it('treats an unrecognized matchState value as not-live (defensive default)', () => {
    const unknownState = makeMatch({ id: 1, startTime: '2026-08-17T02:00:00Z', matchState: 'CANCELLED' });
    const scheduled = makeMatch({ id: 2, startTime: '2026-08-17T09:00:00Z', matchState: 'SCHEDULED' });
    const result = sortMatches([scheduled, unknownState], 'today');
    // Neither is ONGOING, so plain kickoff-ascending order applies — id 1 (02:00) before id 2 (09:00).
    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });

  it('returns an empty array unchanged', () => {
    expect(sortMatches([], 'today')).toEqual([]);
  });
});
