import { useCallback, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchClubs } from './fetchClubs';
import { followClub, unfollowClub } from './followClub';
import type { Team } from '../types';

const CLUBS_QUERY_KEY = ['clubs'];

/**
 * 매 토글마다 즉시 요청한다(디바운스/배치 없음) — 안전한 flush 시점이 없고
 * 백엔드에 배치 엔드포인트도 없어서 배치는 유실 위험만 얻고 얻는 게 없다.
 * 연타로 인한 요청 순서 꼬임은 팀(clubId) 단위 직렬화로 막는다: 같은 팀에 대한
 * 다음 요청은 이전 요청이 끝난 뒤에만 시작하고, 서로 다른 팀은 병렬로 허용한다.
 */
export function useTeams() {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const pendingByClubId = useRef(new Map<number, Promise<unknown>>());

  const query = useQuery({
    queryKey: CLUBS_QUERY_KEY,
    queryFn: fetchClubs,
  });

  const mutation = useMutation({
    mutationFn: ({ id, nextIsFollowing }: { id: number; nextIsFollowing: boolean }) =>
      nextIsFollowing ? followClub(id) : unfollowClub(id),
    onMutate: async ({ id, nextIsFollowing }) => {
      await queryClient.cancelQueries({ queryKey: CLUBS_QUERY_KEY });
      setErrorMessage(null);

      const previousTeams = queryClient.getQueryData<Team[]>(CLUBS_QUERY_KEY);
      queryClient.setQueryData<Team[]>(CLUBS_QUERY_KEY, (old) =>
        old?.map((t) => (t.id === id ? { ...t, isFollowing: nextIsFollowing } : t))
      );

      return { previousTeams };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(CLUBS_QUERY_KEY, context?.previousTeams);
      setErrorMessage('팔로우 상태를 반영하지 못했어요. 다시 시도해 주세요.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CLUBS_QUERY_KEY });
    },
  });

  const toggleFollow = useCallback(
    (id: number) => {
      const prior = pendingByClubId.current.get(id) ?? Promise.resolve();
      const next = prior.catch(() => undefined).then(() => {
        // Read the cache lazily, once the previous queued request for this team has
        // settled — reading it eagerly at call time would make two rapid toggles both
        // compute nextIsFollowing off the same pre-toggle snapshot and desync from the server.
        const current = queryClient.getQueryData<Team[]>(CLUBS_QUERY_KEY);
        const team = current?.find((t) => t.id === id);
        if (!team) return undefined;

        return mutation.mutateAsync({ id, nextIsFollowing: !team.isFollowing }).catch(() => undefined);
      });

      pendingByClubId.current.set(id, next);
    },
    [mutation, queryClient]
  );

  const teams = query.data ?? [];
  const myTeams = useMemo(() => teams.filter((t) => t.isFollowing), [teams]);
  const followableTeams = useMemo(() => teams.filter((t) => !t.isFollowing), [teams]);

  return {
    myTeams,
    followableTeams,
    toggleFollow,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    errorMessage,
  };
}
