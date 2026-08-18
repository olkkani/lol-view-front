import { describe, it, expect } from 'vitest';
import { Route } from './index';

describe('index route validateSearch', () => {
  // Access the validateSearch function directly from the route configuration
  const validateSearch = Route.options.validateSearch as (search: Record<string, unknown>) => { range?: string; matchId?: number };

  it('parses a numeric matchId string into a number', () => {
    const result = validateSearch({ matchId: '123' });
    expect(result.matchId).toBe(123);
  });

  it('treats a non-numeric matchId as absent', () => {
    const result = validateSearch({ matchId: 'abc' });
    expect(result.matchId).toBeUndefined();
  });

  it('treats a missing matchId as absent', () => {
    const result = validateSearch({});
    expect(result.matchId).toBeUndefined();
  });

  it('still parses range correctly (regression check)', () => {
    const result = validateSearch({ range: 'today' });
    expect(result.range).toBe('today');
  });
});
