// src/routes/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '@/components/layout/Header';
import { DateTabs } from '@/features/matches/components/DateTabs';
import { MatchList } from '@/features/matches/components/MatchList';
import type { MatchesRange } from '@/features/matches/types';

type SearchParams = { range?: MatchesRange };

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    range:
      search.range === 'yesterday' || search.range === 'today' || search.range === 'upcoming'
        ? search.range
        : undefined,
  }),
  component: HomePage,
});

function HomePage() {
  const { range = 'today' } = Route.useSearch();
  const navigate = useNavigate({ from: '/' });

  const handleChange = (next: MatchesRange) => {
    navigate({ search: { range: next } });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <Header />
      <DateTabs active={range} onChange={handleChange} />
      <MatchList range={range} />
    </div>
  );
}
