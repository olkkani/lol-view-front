import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeams } from './useTeams';

describe('useTeams', () => {
  it('splits teams into myTeams (isFollowing) and followableTeams (not following)', () => {
    const { result } = renderHook(() => useTeams());

    expect(result.current.myTeams.every((t) => t.isFollowing)).toBe(true);
    expect(result.current.followableTeams.every((t) => !t.isFollowing)).toBe(true);
    expect(result.current.myTeams.length).toBeGreaterThan(0);
    expect(result.current.followableTeams.length).toBeGreaterThan(0);
  });

  it('toggleFollow moves a team from followableTeams to myTeams', () => {
    const { result } = renderHook(() => useTeams());
    const target = result.current.followableTeams[0];

    act(() => {
      result.current.toggleFollow(target.id);
    });

    expect(result.current.myTeams.some((t) => t.id === target.id)).toBe(true);
    expect(result.current.followableTeams.some((t) => t.id === target.id)).toBe(false);
  });

  it('toggleFollow moves a team from myTeams to followableTeams (unfollow)', () => {
    const { result } = renderHook(() => useTeams());
    const target = result.current.myTeams[0];

    act(() => {
      result.current.toggleFollow(target.id);
    });

    expect(result.current.followableTeams.some((t) => t.id === target.id)).toBe(true);
    expect(result.current.myTeams.some((t) => t.id === target.id)).toBe(false);
  });

  it('toggleFollow on an unknown id is a no-op', () => {
    const { result } = renderHook(() => useTeams());
    const before = {
      myCount: result.current.myTeams.length,
      followableCount: result.current.followableTeams.length,
    };

    act(() => {
      result.current.toggleFollow(999999);
    });

    expect(result.current.myTeams.length).toBe(before.myCount);
    expect(result.current.followableTeams.length).toBe(before.followableCount);
  });
});
