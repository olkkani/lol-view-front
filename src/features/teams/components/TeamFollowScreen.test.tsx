import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { TeamFollowScreen } from './TeamFollowScreen';
import * as fetchClubsModule from '../api/fetchClubs';
import * as followClubModule from '../api/followClub';
import type { Team } from '../types';

const TEAMS: Team[] = [
  { id: 1, region: 'LCK', clubName: 'T1', logoUrl: 'http://example.com/t1.png', isFollowing: true },
  {
    id: 2,
    region: 'LCK',
    clubName: 'Dplus KIA',
    logoUrl: 'http://example.com/dk.png',
    isFollowing: false,
  },
];

function renderScreen(onBack = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<TeamFollowScreen onBack={onBack} />, { wrapper: Wrapper });
}

beforeEach(() => {
  vi.restoreAllMocks();
  TEAMS[0].isFollowing = true;
  TEAMS[1].isFollowing = false;
  vi.spyOn(fetchClubsModule, 'fetchClubs').mockImplementation(async () =>
    structuredClone(TEAMS)
  );
});

describe('TeamFollowScreen', () => {
  it('renders the screen title', async () => {
    renderScreen();
    expect(await screen.findByText('팀 팔로우')).toBeInTheDocument();
  });

  it('renders both section titles', async () => {
    renderScreen();
    expect(await screen.findByText('나의 팀')).toBeInTheDocument();
    expect(screen.getByText('팔로우할 팀')).toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', async () => {
    const onBack = vi.fn();
    renderScreen(onBack);

    await screen.findByText('팀 팔로우');
    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(onBack).toHaveBeenCalled();
  });

  it('moves a team from followable to my-teams when its follow button is clicked', async () => {
    // followClub resolving alone isn't enough: onSettled refetches via fetchClubs,
    // so the stub must reflect the mutation or the refetch will revert the optimistic update.
    vi.spyOn(followClubModule, 'followClub').mockImplementation(async (id) => {
      const team = TEAMS.find((t) => t.id === id);
      if (team) team.isFollowing = true;
    });
    renderScreen();

    const followButtons = await screen.findAllByRole('button', { name: '팔로우' });
    expect(followButtons.length).toBeGreaterThan(0);

    fireEvent.click(followButtons[0]);

    await waitFor(() => {
      const remaining = screen.queryAllByRole('button', { name: '팔로우' });
      expect(remaining.length).toBe(followButtons.length - 1);
    });
  });

  it('shows a failure message and rolls back when the request fails', async () => {
    vi.spyOn(followClubModule, 'followClub').mockRejectedValue(new Error('network error'));
    renderScreen();

    const followButtons = await screen.findAllByRole('button', { name: '팔로우' });
    fireEvent.click(followButtons[0]);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '팔로우 상태를 반영하지 못했어요'
    );
    expect(screen.getAllByRole('button', { name: '팔로우' }).length).toBe(
      followButtons.length
    );
  });
});
