import { describe, it, expect } from 'vitest';
import { groupByRegion } from './groupByRegion';
import type { Team } from '../types';

function team(overrides: Partial<Team>): Team {
  return {
    id: 0,
    region: 'LCK',
    clubName: 'Team',
    logoUrl: '',
    isFollowing: false,
    ...overrides,
  };
}

describe('groupByRegion', () => {
  it('groups regions in fixed priority order LCK, LPL, LEC', () => {
    const teams = [
      team({ id: 1, region: 'LEC', clubName: 'Fnatic' }),
      team({ id: 2, region: 'LPL', clubName: 'JD Gaming' }),
      team({ id: 3, region: 'LCK', clubName: 'T1' }),
    ];

    const groups = groupByRegion(teams);

    expect(groups.map((g) => g.region)).toEqual(['LCK', 'LPL', 'LEC']);
  });

  it('sorts teams within a region by clubName ascending', () => {
    const teams = [
      team({ id: 1, region: 'LCK', clubName: 'T1' }),
      team({ id: 2, region: 'LCK', clubName: 'Dplus KIA' }),
      team({ id: 3, region: 'LCK', clubName: 'KT Rolster' }),
    ];

    const groups = groupByRegion(teams);

    expect(groups[0].teams.map((t) => t.clubName)).toEqual([
      'Dplus KIA',
      'KT Rolster',
      'T1',
    ]);
  });

  it('omits regions with zero teams instead of returning an empty group', () => {
    const teams = [team({ id: 1, region: 'LCK', clubName: 'T1' })];

    const groups = groupByRegion(teams);

    expect(groups).toHaveLength(1);
    expect(groups[0].region).toBe('LCK');
  });

  it('returns an empty array for an empty input', () => {
    expect(groupByRegion([])).toEqual([]);
  });

  it('places an unrecognized region after LCK/LPL/LEC, in alphabetical order among unrecognized regions', () => {
    const teams = [
      team({ id: 1, region: 'PCS', clubName: 'CTBC Flying Oyster' }),
      team({ id: 2, region: 'LCK', clubName: 'T1' }),
      team({ id: 3, region: 'VCS', clubName: 'GAM Esports' }),
    ];

    const groups = groupByRegion(teams);

    expect(groups.map((g) => g.region)).toEqual(['LCK', 'PCS', 'VCS']);
  });
});
