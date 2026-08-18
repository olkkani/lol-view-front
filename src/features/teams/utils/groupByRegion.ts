import type { Team } from '../types';

const REGION_PRIORITY = ['LCK', 'LPL', 'LEC'];

export interface RegionGroup {
  region: string;
  teams: Team[];
}

export function groupByRegion(teams: Team[]): RegionGroup[] {
  const byRegion = new Map<string, Team[]>();

  for (const team of teams) {
    const bucket = byRegion.get(team.region) ?? [];
    bucket.push(team);
    byRegion.set(team.region, bucket);
  }

  const regions = [...byRegion.keys()].sort((a, b) => {
    const aIndex = REGION_PRIORITY.indexOf(a);
    const bIndex = REGION_PRIORITY.indexOf(b);

    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return regions.map((region) => ({
    region,
    teams: [...(byRegion.get(region) ?? [])].sort((a, b) =>
      a.clubName.localeCompare(b.clubName)
    ),
  }));
}
