import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ky from '@toss/ky';
import { fetchMe } from './fetchMe';

vi.mock('@toss/ky', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('fetchMe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls GET /api/auth/me with credentials included and returns the parsed body', async () => {
    const mockJson = vi.fn().mockResolvedValue({ id: 42 });
    (ky.get as ReturnType<typeof vi.fn>).mockReturnValue({ json: mockJson });

    const result = await fetchMe();

    expect(ky.get).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' });
    expect(result).toEqual({ id: 42 });
  });
});
