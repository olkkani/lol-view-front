// src/features/matches/components/MatchList.tsx
import { useMemo } from 'react';
import { useMatches } from '../api/useMatches';
import { useFrozenMatches } from '../hooks/useFrozenMatches';
import { buildMatchSections } from '../utils/buildMatchSections';
import { MatchSection } from './MatchSection';
import { MatchCardSkeleton } from './MatchCardSkeleton';
import type { MatchesRange } from '../types';

export function MatchList({ range }: { range: MatchesRange }) {
  const { data, isLoading, isError, refetch } = useMatches(range);
  const { frozen, refresh } = useFrozenMatches(data, range);

  const sections = useMemo(() => buildMatchSections(frozen, range), [frozen, range]);
  const totalMatches = frozen.length;

  const handleRetry = () => {
    refresh();
    refetch();
  };

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
          onClick={handleRetry}
          className="min-h-11 rounded-lg border border-[color:var(--ink,#222222)] px-4 text-sm font-medium text-[color:var(--ink,#222222)]"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (totalMatches === 0) {
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
      {sections.map((section) => (
        <MatchSection
          key={section.status}
          status={section.status}
          matches={section.matches}
          range={range}
        />
      ))}
    </div>
  );
}
