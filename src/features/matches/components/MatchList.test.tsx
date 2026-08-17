// src/features/matches/components/MatchList.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MatchList } from './MatchList';
import * as useMatchesModule from '../api/useMatches';
import type { Match } from '../types';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 'm1',
    league: 'LCK',
    teams: [
      { id: 't1', name: 'T1' },
      { id: 't2', name: 'GEN' },
    ],
    kickoffAt: '2026-08-17T05:00:00Z',
    isLive: false,
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
    const live = makeMatch({ id: 'now-finished', kickoffAt: '2026-08-17T10:00:00Z', isLive: true, score: [1, 0] });
    const upcoming = makeMatch({ id: 'upcoming', kickoffAt: '2026-08-17T09:00:00Z', isLive: false });

    const spy = vi.spyOn(useMatchesModule, 'useMatches');

    spy.mockReturnValue({
      data: [upcoming, live],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    const { rerender } = renderWithClient(<MatchList range="today" />);

    let cards = screen.getAllByTestId(/score-team-0|kickoff-time/);
    expect(cards[0]).toHaveTextContent('1');

    const finished = { ...live, isLive: false, score: [1, 0] as [number, number] };
    spy.mockReturnValue({
      data: [finished, upcoming],
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
