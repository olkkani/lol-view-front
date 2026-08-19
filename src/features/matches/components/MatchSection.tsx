import { groupAdjacentMatches } from '../utils/groupAdjacentMatches';
import { MatchCard } from './MatchCard';
import type { Match, MatchesRange } from '../types';

const SECTION_TITLES: Record<'ongoing' | 'finished' | 'upcoming', string> = {
  ongoing: '진행중',
  finished: '종료',
  upcoming: '예정',
};

export function MatchSection({
  status,
  matches,
  range,
  openMatchId,
}: {
  status: 'ongoing' | 'finished' | 'upcoming';
  matches: Match[];
  range: MatchesRange;
  openMatchId?: number;
}) {
  if (matches.length === 0) return null;

  const groups = groupAdjacentMatches(matches);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-[color:var(--ink,#222222)]">
        {SECTION_TITLES[status]}
      </h2>
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[color:var(--muted-ink,#6a6a6a)]">
            {group.leagueName} {group.matchLabel}
          </span>
          {group.matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              range={range}
              isDetailOpen={match.id === openMatchId}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
