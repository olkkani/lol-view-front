import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTeams } from './useTeams';
import * as fetchClubsModule from './fetchClubs';
import * as followClubModule from './followClub';
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

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.restoreAllMocks();
  TEAMS[0].isFollowing = true;
  TEAMS[1].isFollowing = false;
  // mockImplementation (not mockResolvedValue): must re-clone TEAMS on every call so
  // onSettled's invalidateQueries refetch reflects follow/unfollow mutations applied
  // to TEAMS below, instead of reverting the optimistic update to a stale snapshot.
  vi.spyOn(fetchClubsModule, 'fetchClubs').mockImplementation(async () =>
    structuredClone(TEAMS)
  );
});

describe('useTeams', () => {
  it('splits teams into myTeams (isFollowing) and followableTeams (not following)', async () => {
    const { result } = renderHook(() => useTeams(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.myTeams.every((t) => t.isFollowing)).toBe(true);
    expect(result.current.followableTeams.every((t) => !t.isFollowing)).toBe(true);
    expect(result.current.myTeams.some((t) => t.id === 1)).toBe(true);
    expect(result.current.followableTeams.some((t) => t.id === 2)).toBe(true);
  });

  it('toggleFollow optimistically moves a team before the request resolves', async () => {
    let resolveFollow: () => void = () => {};
    vi.spyOn(followClubModule, 'followClub').mockReturnValue(
      new Promise((resolve) => {
        resolveFollow = () => resolve(undefined);
      })
    );

    const { result } = renderHook(() => useTeams(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleFollow(2);
    });

    await waitFor(() =>
      expect(result.current.myTeams.some((t) => t.id === 2)).toBe(true)
    );
    expect(followClubModule.followClub).toHaveBeenCalledWith(2);

    resolveFollow();
  });

  it('toggleFollow calls unfollowClub when unfollowing', async () => {
    vi.spyOn(followClubModule, 'unfollowClub').mockResolvedValue(undefined);

    const { result } = renderHook(() => useTeams(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleFollow(1);
    });

    await waitFor(() => expect(followClubModule.unfollowClub).toHaveBeenCalledWith(1));
  });

  it('rolls back and sets errorMessage when the request fails', async () => {
    vi.spyOn(followClubModule, 'followClub').mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() => useTeams(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleFollow(2);
    });

    await waitFor(() => expect(result.current.errorMessage).not.toBeNull());
    expect(result.current.followableTeams.some((t) => t.id === 2)).toBe(true);
    expect(result.current.myTeams.some((t) => t.id === 2)).toBe(false);
  });

  it('serializes repeated toggles on the same team', async () => {
    const calls: Array<'follow' | 'unfollow'> = [];
    let releaseFirst: () => void = () => {};

    vi.spyOn(followClubModule, 'unfollowClub').mockImplementation(
      (id) =>
        new Promise((resolve) => {
          calls.push('unfollow');
          releaseFirst = () => {
            const team = TEAMS.find((t) => t.id === id);
            if (team) team.isFollowing = false;
            resolve(undefined);
          };
        })
    );
    vi.spyOn(followClubModule, 'followClub').mockImplementation(async (id) => {
      calls.push('follow');
      const team = TEAMS.find((t) => t.id === id);
      if (team) team.isFollowing = true;
    });

    const { result } = renderHook(() => useTeams(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleFollow(1); // isFollowing true -> unfollow (pending)
      result.current.toggleFollow(1); // queued: should wait for the unfollow above
    });

    // Wait for the first (unfollow) request to actually start — onMutate awaits
    // cancelQueries first, so the mutationFn call lands a microtask later.
    await waitFor(() => expect(calls).toEqual(['unfollow']));

    // follow (the second toggle) must still not have run — first request is pending
    expect(calls).toEqual(['unfollow']);

    await act(async () => {
      releaseFirst();
    });

    await waitFor(() => expect(calls).toEqual(['unfollow', 'follow']));
  });

  it('allows toggles on different teams to run in parallel', async () => {
    vi.spyOn(followClubModule, 'unfollowClub').mockResolvedValue(undefined);
    vi.spyOn(followClubModule, 'followClub').mockResolvedValue(undefined);

    const { result } = renderHook(() => useTeams(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.toggleFollow(1);
      result.current.toggleFollow(2);
    });

    await waitFor(() => {
      expect(followClubModule.unfollowClub).toHaveBeenCalledWith(1);
      expect(followClubModule.followClub).toHaveBeenCalledWith(2);
    });
  });
});
