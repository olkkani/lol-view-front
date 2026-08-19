// src/features/matches/components/MatchList.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MatchList } from './MatchList';
import * as useMatchesModule from '../api/useMatches';
import { makeMatch } from '../test/fixtures';

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

  it('keeps a card in its section across a poll tick, and only moves it after a manual refresh', async () => {
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
    const client = new QueryClient();

    spy.mockReturnValue({
      data: [scheduled, ongoing],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    const { rerender } = render(
      <QueryClientProvider client={client}>
        <MatchList range="today" />
      </QueryClientProvider>
    );

    expect(screen.getByText('진행중')).toBeInTheDocument();
    expect(screen.queryByText('종료')).not.toBeInTheDocument();

    // Poll tick: matchState flips to FINISHED, but no manual refresh happens.
    const finished = { ...ongoing, matchState: 'FINISHED' as const };
    spy.mockReturnValue({
      data: [finished, scheduled],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    rerender(
      <QueryClientProvider client={client}>
        <MatchList range="today" />
      </QueryClientProvider>
    );

    // Card must NOT have moved yet — still shows under 진행중, not 종료.
    expect(screen.getByText('진행중')).toBeInTheDocument();
    expect(screen.queryByText('종료')).not.toBeInTheDocument();

    // Switching tabs away and back is a manual navigation action, not a background
    // poll — useFrozenMatches (Task 1 Step 12) resets frozen order on range change.
    rerender(
      <QueryClientProvider client={client}>
        <MatchList range="upcoming" />
      </QueryClientProvider>
    );
    rerender(
      <QueryClientProvider client={client}>
        <MatchList range="today" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('종료')).toBeInTheDocument();
    });
  });

  it('renders one shared header for adjacent matches with the same leagueName and matchLabel', () => {
    const a = makeMatch({ id: 1, leagueName: 'LCK', matchLabel: 'Week 1 Day 2' });
    const b = makeMatch({ id: 2, leagueName: 'LCK', matchLabel: 'Week 1 Day 2' });
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [a, b],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="upcoming" />);
    expect(screen.getAllByText('LCK Week 1 Day 2')).toHaveLength(1);
  });

  it('renders separate headers for matches with different leagueName or matchLabel', () => {
    const a = makeMatch({ id: 1, leagueName: 'LCK', matchLabel: 'Week 1 Day 2' });
    const b = makeMatch({ id: 2, leagueName: 'LPL', matchLabel: 'Week 1 Day 2' });
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [a, b],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="upcoming" />);
    expect(screen.getByText('LCK Week 1 Day 2')).toBeInTheDocument();
    expect(screen.getByText('LPL Week 1 Day 2')).toBeInTheDocument();
  });

  it('renders both groups (and no duplicate cards) when a live match splits an otherwise-contiguous label run', () => {
    // Real "today" shape: ONGOING matches are sorted to the front, so
    // "Week 1 Day 2" ends up as two separate, non-adjacent groups.
    const liveDay2A = makeMatch({ id: 9002, matchState: 'ONGOING', matchLabel: 'Week 1 Day 2' });
    const liveDay2B = makeMatch({ id: 9010, matchState: 'ONGOING', matchLabel: 'Week 1 Day 2' });
    const finishedDay1A = makeMatch({ id: 9006, matchState: 'FINISHED', matchLabel: 'Week 1 Day 1' });
    const finishedDay1B = makeMatch({ id: 9007, matchState: 'FINISHED', matchLabel: 'Week 1 Day 1' });
    const finishedDay2A = makeMatch({ id: 9009, matchState: 'FINISHED', matchLabel: 'Week 1 Day 2' });
    const finishedDay2B = makeMatch({ id: 9008, matchState: 'FINISHED', matchLabel: 'Week 1 Day 2' });

    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [liveDay2A, liveDay2B, finishedDay1A, finishedDay1B, finishedDay2A, finishedDay2B],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="today" />);

    expect(screen.getAllByText('LCK Week 1 Day 2')).toHaveLength(2);
    expect(screen.getAllByText('LCK Week 1 Day 1')).toHaveLength(1);
    // Every match renders exactly once: 6 matches -> 6 kickoff/score nodes total.
    expect(screen.getAllByTestId(/score-team-0|kickoff-time/)).toHaveLength(6);
  });

  it('unmounts the live match card when switching away from the today tab', () => {
    const live = makeMatch({ id: 9002, matchState: 'ONGOING', matchLabel: 'Week 1 Day 2' });
    const finishedDay1 = makeMatch({ id: 9006, matchState: 'FINISHED', matchLabel: 'Week 1 Day 1' });
    const finishedDay2 = makeMatch({ id: 9009, matchState: 'FINISHED', matchLabel: 'Week 1 Day 2' });

    const spy = vi.spyOn(useMatchesModule, 'useMatches');
    spy.mockReturnValue({
      data: [live, finishedDay1, finishedDay2],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    const client = new QueryClient();
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <MatchList range="today" />
      </QueryClientProvider>
    );
    expect(screen.getByText('LIVE')).toBeInTheDocument();

    const yesterdayMatch = makeMatch({ id: 9000, matchState: 'FINISHED', matchLabel: 'Week 1 Day 1' });
    spy.mockReturnValue({
      data: [yesterdayMatch],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    rerender(
      <QueryClientProvider client={client}>
        <MatchList range="yesterday" />
      </QueryClientProvider>
    );

    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    // Only the single yesterday match should be present - no leaked/duplicated cards.
    expect(screen.getAllByTestId(/score-team-0|kickoff-time/)).toHaveLength(1);
  });
});
