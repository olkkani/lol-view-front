// src/features/matches/components/MatchList.tsx
import { useMemo } from 'react';
import { useMatches } from '../api/useMatches';
import { sortMatches } from '../utils/sortMatches';
import { MatchCard } from './MatchCard';
import { MatchCardSkeleton } from './MatchCardSkeleton';
import type { MatchesRange } from '../types';

export function MatchList({ range }: { range: MatchesRange }) {
  const { data, isLoading, isError, refetch } = useMatches(range);

  const sorted = useMemo(() => sortMatches(data ?? [], range), [data, range]);

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
      <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-[color:var(--muted,#6a6a6a)]">
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
    return (
      <div className="py-16 text-center text-sm text-[color:var(--muted,#6a6a6a)]">
        예정된 경기가 없어요
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {sorted.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
