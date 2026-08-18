import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MatchDetailModal } from './MatchDetailModal';
import * as useMatchesModule from '../api/useMatches';
import { makeMatch } from '../test/fixtures';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('MatchDetailModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockClear();
  });

  it('stays closed when matchId is undefined', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={undefined} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays closed when matchId does not match any loaded match (deep link to missing match)', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={999} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens and renders league name, match label, and team names when matchId matches a loaded match', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1, leagueName: 'LCK', matchLabel: 'Week 1 Day 2' })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={1} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('LCK Week 1 Day 2')).toBeInTheDocument();
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('GEN')).toBeInTheDocument();
  });

  it('gives the dialog an accessible name via Dialog.Title', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1, leagueName: 'LCK', matchLabel: 'Week 1 Day 2' })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={1} />);
    expect(screen.getByRole('dialog', { name: 'LCK Week 1 Day 2' })).toBeInTheDocument();
  });

  it('renders "대진 미정" and omits the head-to-head section when clubs is empty (TBD match)', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1, clubs: [] })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={1} />);
    expect(screen.getByText('대진 미정')).toBeInTheDocument();
    expect(screen.queryByText('Head to Head')).not.toBeInTheDocument();
  });

  it('calls navigate to clear matchId when the close button is clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={1} />);
    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(mockNavigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      viewTransition: true,
    });
    // Verify the search-updater clears matchId without touching other params.
    const updater = mockNavigate.mock.calls[0][0].search;
    expect(updater({ range: 'today', matchId: 1 })).toEqual({ range: 'today', matchId: undefined });
  });

  it('calls navigate to clear matchId when Escape is pressed', async () => {
    const user = userEvent.setup();
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={1} />);
    await user.keyboard('{Escape}');

    expect(mockNavigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      viewTransition: true,
    });
  });
});
