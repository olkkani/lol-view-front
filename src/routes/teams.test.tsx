import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useMeModule from '@/features/auth/api/useMe';
import * as fetchClubsModule from '@/features/teams/api/fetchClubs';
import { TeamsPage } from './teams';

function renderTeamsPage() {
  const queryClient = new QueryClient();
  const rootRoute = createRootRoute();
  const teamsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: TeamsPage,
  });
  const router = createRouter({ routeTree: rootRoute.addChildren([teamsRoute]) });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe('TeamsPage', () => {
  it('shows a loading state while useMe is pending', async () => {
    vi.spyOn(useMeModule, 'useMe').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMeModule.useMe>);

    renderTeamsPage();

    expect(await screen.findByTestId('teams-loading')).toBeInTheDocument();
  });

  it('shows LoginScreen when useMe resolves 401 (logged out)', async () => {
    const err = Object.assign(new Error('Unauthorized'), {
      response: { status: 401 },
    });
    vi.spyOn(useMeModule, 'useMe').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: err,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMeModule.useMe>);

    renderTeamsPage();

    expect(await screen.findByTestId('login-google')).toBeInTheDocument();
  });

  it('shows TeamFollowScreen when useMe resolves with a user', async () => {
    vi.spyOn(useMeModule, 'useMe').mockReturnValue({
      data: { id: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMeModule.useMe>);
    vi.spyOn(fetchClubsModule, 'fetchClubs').mockResolvedValue([]);

    renderTeamsPage();

    expect(await screen.findByText('팀 팔로우')).toBeInTheDocument();
  });

  it('shows an error+retry state for non-401 errors', async () => {
    const err = Object.assign(new Error('Server error'), {
      response: { status: 500 },
    });
    vi.spyOn(useMeModule, 'useMe').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: err,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMeModule.useMe>);

    renderTeamsPage();

    expect(await screen.findByText('다시 시도')).toBeInTheDocument();
  });
});
