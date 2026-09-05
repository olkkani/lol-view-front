import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ky from '@toss/ky';
import { Header } from './Header';

vi.mock('@toss/ky', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function renderHeader({ loggedIn = false } = {}) {
  (ky.get as ReturnType<typeof vi.fn>).mockReturnValue({
    json: loggedIn
      ? vi.fn().mockResolvedValue({ id: 1 })
      : vi.fn().mockRejectedValue({ response: { status: 401 } }),
  });

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={queryClient}>
        <Header />
      </QueryClientProvider>
    ),
  });
  const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null });
  const teamsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/teams', component: () => null });
  const router = createRouter({ routeTree: rootRoute.addChildren([homeRoute, teamsRoute]) });
  render(<RouterProvider router={router} />);
}

describe('Header', () => {
  it('renders the LoL View wordmark', async () => {
    renderHeader();
    expect(await screen.findByText('LoL View')).toBeInTheDocument();
  });

  it('opens the hamburger menu on click', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(await screen.findByRole('button', { name: /메뉴/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('shows a 팔로우 팀 추가 link to /teams and closes the menu on click', async () => {
    const user = userEvent.setup();
    renderHeader();
    await user.click(await screen.findByRole('button', { name: /메뉴/i }));

    const item = screen.getByRole('menuitem', { name: /팔로우 팀 추가/ });
    expect(item).toHaveAttribute('href', '/teams');

    await user.click(item);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('does not show a 로그아웃 item when logged out', async () => {
    const user = userEvent.setup();
    renderHeader({ loggedIn: false });
    await user.click(await screen.findByRole('button', { name: /메뉴/i }));

    expect(screen.queryByRole('menuitem', { name: /로그아웃/ })).not.toBeInTheDocument();
  });

  it('shows a 로그아웃 item when logged in and closes the menu on click', async () => {
    const user = userEvent.setup();
    (ky.post as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    renderHeader({ loggedIn: true });
    await user.click(await screen.findByRole('button', { name: /메뉴/i }));

    const item = await screen.findByRole('menuitem', { name: /로그아웃/ });
    await user.click(item);

    expect(ky.post).toHaveBeenCalledWith('/api/auth/logout', { credentials: 'include' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
