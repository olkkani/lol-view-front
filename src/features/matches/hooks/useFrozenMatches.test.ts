import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFrozenMatches } from './useFrozenMatches';
import { makeMatch } from '../test/fixtures';
import type { Match, MatchesRange } from '../types';

interface Props {
  data: Match[];
  range: MatchesRange;
}

describe('useFrozenMatches', () => {
  it('freezes to the initial data on first render', () => {
    const initial = [makeMatch({ id: 1 })];
    const { result } = renderHook(
      ({ data, range }: Props) => useFrozenMatches(data, range),
      { initialProps: { data: initial, range: 'today' as const } }
    );
    expect(result.current.frozen).toEqual(initial);
  });

  it('does not update frozen when data changes without calling refresh (poll tick)', () => {
    const first = [makeMatch({ id: 1, matchState: 'ONGOING' })];
    const second = [makeMatch({ id: 1, matchState: 'FINISHED' })];
    const { result, rerender } = renderHook(
      ({ data, range }: Props) => useFrozenMatches(data, range),
      { initialProps: { data: first, range: 'today' as const } }
    );

    rerender({ data: second, range: 'today' as const });

    expect(result.current.frozen).toEqual(first);
  });

  it('updates frozen to the latest data when refresh() is called', () => {
    const first = [makeMatch({ id: 1, matchState: 'ONGOING' })];
    const second = [makeMatch({ id: 1, matchState: 'FINISHED' })];
    const { result, rerender } = renderHook(
      ({ data, range }: Props) => useFrozenMatches(data, range),
      { initialProps: { data: first, range: 'today' as const } }
    );

    rerender({ data: second, range: 'today' as const });
    result.current.refresh();
    rerender({ data: second, range: 'today' as const });

    expect(result.current.frozen).toEqual(second);
  });

  it('resets frozen immediately when range changes, without needing refresh()', () => {
    const todayData = [makeMatch({ id: 1 })];
    const upcomingData = [makeMatch({ id: 2 })];
    const { result, rerender } = renderHook(
      ({ data, range }: Props) => useFrozenMatches(data, range),
      { initialProps: { data: todayData, range: 'today' as MatchesRange } }
    );

    rerender({ data: upcomingData, range: 'upcoming' as MatchesRange });

    expect(result.current.frozen).toEqual(upcomingData);
  });
});
