// src/routes/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '@/components/layout/Header';
import { DateTabs } from '@/features/matches/components/DateTabs';
import { MatchList } from '@/features/matches/components/MatchList';
import { MatchDetailModal } from '@/features/matches/components/MatchDetailModal';
import type { MatchesRange } from '@/features/matches/types';

type SearchParams = { range?: MatchesRange; matchId?: number };

function parseMatchId(raw: unknown): number | undefined {
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    range:
      search.range === 'yesterday' || search.range === 'today' || search.range === 'upcoming'
        ? search.range
        : undefined,
    matchId: parseMatchId(search.matchId),
  }),
  component: HomePage,
});

function HomePage() {
  const { range = 'today', matchId } = Route.useSearch();
  const navigate = useNavigate({ from: '/' });

  const handleChange = (next: MatchesRange) => {
    navigate({ search: { range: next } });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <Header />
      <DateTabs active={range} onChange={handleChange} />
      <div role="tabpanel" id="match-list-panel">
        <MatchList range={range} openMatchId={matchId} />
      </div>
      <MatchDetailModal range={range} matchId={matchId} />
    </div>
  );
}
