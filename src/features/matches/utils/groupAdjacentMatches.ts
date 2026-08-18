import type { Match } from '../types';

export interface MatchGroup {
  /**
   * Unique per group (derived from the first match's id). The same
   * leagueName+matchLabel pair can legitimately produce more than one
   * group — e.g. a live match sorted to the front splits an otherwise
   * contiguous label run — so leagueName+matchLabel alone is NOT a safe
   * React key. Use this field as the key instead.
   */
  key: string;
  leagueName: Match['leagueName'];
  matchLabel: string;
  matches: Match[];
}

export function groupAdjacentMatches(matches: Match[]): MatchGroup[] {
  const groups: MatchGroup[] = [];

  for (const match of matches) {
    const last = groups[groups.length - 1];
    if (last && last.leagueName === match.leagueName && last.matchLabel === match.matchLabel) {
      last.matches.push(match);
    } else {
      groups.push({
        key: String(match.id),
        leagueName: match.leagueName,
        matchLabel: match.matchLabel,
        matches: [match],
      });
    }
  }

  return groups;
}
