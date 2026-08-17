// src/features/matches/components/MatchList.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MatchList } from './MatchList';
import * as useMatchesModule from '../api/useMatches';
import type { Match } from '../types';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 1,
    matchLabel: 'Week 1 Day 2',
    startTime: '2026-08-17T05:00:00Z',
    matchState: 'SCHEDULED',
    clubs: [
      { name: 'T1', logoUrl: '', score: 0 },
      { name: 'GEN', logoUrl: '', score: 0 },
    ],
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('MatchList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows skeletons while loading', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="today" />);
    expect(screen.getAllByRole('generic').length).toBeGreaterThan(0);
  });

  it('shows the empty state when there are no matches', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="upcoming" />);
    expect(screen.getByText('예정된 경기가 없어요')).toBeInTheDocument();
  });

  it('shows a range-specific empty state for the yesterday tab', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="yesterday" />);
    expect(screen.getByText('어제 경기가 없어요')).toBeInTheDocument();
  });

  it('shows a range-specific empty state for the today tab', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="today" />);
    expect(screen.getByText('오늘 예정된 경기가 없어요')).toBeInTheDocument();
  });

  it('shows the error state with a working retry button', async () => {
    const refetch = vi.fn();
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="today" />);
    const retryButton = screen.getByText('다시 시도');
    retryButton.click();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('reorders a match from live-pinned to time-sorted position after a poll updates its status', async () => {
    // startTime values are relative to "now" so this test doesn't self-expire
    // once the system clock passes any hardcoded date (same class of bug
    // fixed in MatchCard.test.tsx during a prior fix round).
    const now = Date.now();
    const ongoingKickoff = new Date(now + 60 * 60 * 1000).toISOString();
    const scheduledKickoff = new Date(now + 30 * 60 * 1000).toISOString();
    const ongoing = makeMatch({
      id: 1,
      startTime: ongoingKickoff,
      matchState: 'ONGOING',
      clubs: [
        { name: 'T1', logoUrl: '', score: 1 },
        { name: 'GEN', logoUrl: '', score: 0 },
      ],
    });
    const scheduled = makeMatch({ id: 2, startTime: scheduledKickoff, matchState: 'SCHEDULED' });

    const spy = vi.spyOn(useMatchesModule, 'useMatches');

    spy.mockReturnValue({
      data: [scheduled, ongoing],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    const { rerender } = renderWithClient(<MatchList range="today" />);

    let cards = screen.getAllByTestId(/score-team-0|kickoff-time/);
    expect(cards[0]).toHaveTextContent('1');

    const finished = { ...ongoing, matchState: 'FINISHED' as const };
    spy.mockReturnValue({
      data: [finished, scheduled],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MatchList range="today" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      cards = screen.getAllByTestId(/score-team-0|kickoff-time/);
      expect(cards[0]).toHaveAttribute('data-testid', 'kickoff-time');
    });
  });
});
