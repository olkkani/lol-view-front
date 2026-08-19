import { useNavigate } from '@tanstack/react-router';
import { Dialog } from '@base-ui/react/dialog';
import { useMatches } from '../api/useMatches';
import { TeamSlot } from './TeamLogo';
import { HeadToHeadRow } from './HeadToHeadRow';
import type { MatchesRange } from '../types';

export function MatchDetailModal({
  range,
  matchId,
}: {
  range: MatchesRange;
  matchId?: number;
}) {
  const navigate = useNavigate({ from: '/' });
  const { data } = useMatches(range);

  const match = matchId !== undefined ? data?.find((m) => m.id === matchId) : undefined;
  const isOpen = match !== undefined;

  const close = () => {
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, matchId: undefined }),
    });
  };

  const hasTeams = (match?.clubs.length ?? 0) === 2;
  const [clubA, clubB] = hasTeams ? match!.clubs : [];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-[color:var(--scrim,#000000)]/40" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 flex max-h-[85vh] flex-col gap-4 rounded-t-[20px] bg-white p-6">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-xs font-semibold text-[color:var(--muted-ink,#6a6a6a)]">
              {match ? `${match.leagueName} ${match.matchLabel}` : ''}
            </Dialog.Title>
            <Dialog.Close aria-label="close" className="min-h-11 min-w-11">
              ✕
            </Dialog.Close>
          </div>

          {match && !hasTeams && (
            <div className="py-8 text-center text-sm text-[color:var(--muted-ink,#6a6a6a)]">
              대진 미정
            </div>
          )}

          {match && hasTeams && (
            <>
              <div className="flex items-center justify-between gap-4">
                <TeamSlot club={clubA!} align="left" />
                <div className="flex flex-col items-center gap-0.5 px-3 text-[21px] font-bold tabular-nums">
                  <span>{clubA!.score}</span>
                  <span className="text-sm font-normal text-[color:var(--muted-soft,#929292)]">:</span>
                  <span>{clubB!.score}</span>
                </div>
                <TeamSlot club={clubB!} align="right" />
              </div>

              <div>
                <span className="text-xs font-semibold text-[color:var(--muted-ink,#6a6a6a)]">
                  Head to Head
                </span>
                <HeadToHeadRow />
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
