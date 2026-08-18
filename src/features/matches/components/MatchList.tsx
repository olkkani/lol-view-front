// src/features/matches/components/MatchList.tsx
import { useMemo } from 'react';
import { useMatches } from '../api/useMatches';
import { sortMatches } from '../utils/sortMatches';
import { groupAdjacentMatches } from '../utils/groupAdjacentMatches';
import { MatchCard } from './MatchCard';
import { MatchCardSkeleton } from './MatchCardSkeleton';
import type { MatchesRange } from '../types';

export function MatchList({ range }: { range: MatchesRange }) {
  const { data, isLoading, isError, refetch } = useMatches(range);

  const sorted = useMemo(() => sortMatches(data ?? [], range), [data, range]);
  const groups = useMemo(() => groupAdjacentMatches(sorted), [sorted]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <MatchCardSkeleton />
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-[color:var(--muted-ink,#6a6a6a)]">
        <p>경기 정보를 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="min-h-11 rounded-lg border border-[color:var(--ink,#222222)] px-4 text-sm font-medium text-[color:var(--ink,#222222)]"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (sorted.length === 0) {
    const emptyMessage =
      range === 'yesterday'
        ? '어제 경기가 없어요'
        : range === 'today'
          ? '오늘 예정된 경기가 없어요'
          : '예정된 경기가 없어요';

    return (
      <div className="py-16 text-center text-sm text-[color:var(--muted-ink,#6a6a6a)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[color:var(--muted-ink,#6a6a6a)]">
            {group.leagueName} {group.matchLabel}
          </span>
          {group.matches.map((match) => (
            <MatchCard key={match.id} match={match} range={range} />
          ))}
        </div>
      ))}
    </div>
  );
}
