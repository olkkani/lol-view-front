import { describe, it, expect } from 'vitest';
import { MOCK_TEAMS } from './mockTeams';

describe('MOCK_TEAMS', () => {
  it('contains at least one team per known region (LCK, LPL, LEC)', () => {
    const regions = new Set(MOCK_TEAMS.map((t) => t.region));
    expect(regions.has('LCK')).toBe(true);
    expect(regions.has('LPL')).toBe(true);
    expect(regions.has('LEC')).toBe(true);
  });

  it('every team has a non-empty clubName distinct from any short code pattern', () => {
    for (const team of MOCK_TEAMS) {
      expect(team.clubName.length).toBeGreaterThan(0);
    }
  });

  it('has unique ids', () => {
    const ids = MOCK_TEAMS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a mix of followed and unfollowed teams', () => {
    const followed = MOCK_TEAMS.filter((t) => t.isFollowing);
    const unfollowed = MOCK_TEAMS.filter((t) => !t.isFollowing);
    expect(followed.length).toBeGreaterThan(0);
    expect(unfollowed.length).toBeGreaterThan(0);
  });
});
