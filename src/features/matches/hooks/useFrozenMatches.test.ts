import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFrozenMatches } from './useFrozenMatches';
import { makeMatch } from '../test/fixtures';

describe('useFrozenMatches', () => {
  it('freezes to the initial data on first render', () => {
    const initial = [makeMatch({ id: 1 })];
    const { result } = renderHook(
      ({ data, range }) => useFrozenMatches(data, range),
      { initialProps: { data: initial, range: 'today' as const } }
    );
    expect(result.current.frozen).toEqual(initial);
  });
});
