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
});
