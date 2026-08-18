import { useState, useCallback, useMemo } from 'react';
import { MOCK_TEAMS } from './mockTeams';
import type { Team } from '../types';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);

  const toggleFollow = useCallback((id: number) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFollowing: !t.isFollowing } : t))
    );
  }, []);

  const myTeams = useMemo(() => teams.filter((t) => t.isFollowing), [teams]);
  const followableTeams = useMemo(() => teams.filter((t) => !t.isFollowing), [teams]);

  return { myTeams, followableTeams, toggleFollow };
}
