import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMe } from './useMe';
import * as fetchMeModule from './fetchMe';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useMe', () => {
  it('returns the user on success', async () => {
    vi.spyOn(fetchMeModule, 'fetchMe').mockResolvedValue({ id: 1 });

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({ id: 1 });
    expect(result.current.isError).toBe(false);
  });

  it('surfaces an error when fetchMe rejects (e.g. 401)', async () => {
    vi.spyOn(fetchMeModule, 'fetchMe').mockRejectedValue(new Error('401'));

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
  });
});
