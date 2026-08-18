// src/features/matches/components/MatchCard.tsx
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import type { Match, MatchesRange } from '../types';
import { TeamSlot } from './TeamLogo';

export function MatchCard({ match, range }: { match: Match; range: MatchesRange }) {
  const navigate = useNavigate({ from: '/' });
  const isOngoing = match.matchState === 'ONGOING';
  const isFinished = match.matchState === 'FINISHED';
  const hasTeams = match.clubs.length === 2;

  const [clubA, clubB] = hasTeams ? match.clubs : [];

  const winnerIndex =
    isFinished && clubA && clubB
      ? clubA.score > clubB.score
        ? 0
        : 1
      : null;

  const openDetail = () => {
    navigate({ search: { range, matchId: match.id } });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail();
        }
      }}
      className={cn(
        'flex flex-col gap-2 rounded-[14px] border border-[color:var(--hairline-soft,#ebebeb)] p-4',
        'shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px,rgba(0,0,0,0.1)_0_4px_8px]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--brand-rausch,#ff385c)] focus-visible:outline-offset-2',
        isOngoing && 'border-[color:var(--brand-rausch,#ff385c)]'
      )}
    >
      {isOngoing && (
        <div className="flex items-center justify-end">
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-rausch,#ff385c)] px-2 py-0.5 text-[11px] font-bold text-white">
            <span className="size-1.5 rounded-full bg-white" />
            LIVE
          </span>
        </div>
      )}

      {!hasTeams ? (
        <div className="py-2 text-center text-sm text-[color:var(--muted-ink,#6a6a6a)]">
          대진 미정
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <TeamSlot club={clubA!} align="left" />

          <div className="flex min-w-14 flex-col items-center gap-0.5 px-3">
            {isFinished || isOngoing ? (
              <div className="flex text-[21px] font-bold tabular-nums">
                <span
                  data-testid="score-team-0"
                  className={winnerIndex === 1 ? 'text-[color:var(--muted-soft,#929292)] font-medium' : ''}
                >
                  {clubA!.score}
                </span>
                <span className="mx-1 font-normal text-[color:var(--muted-soft,#929292)]">:</span>
                <span
                  data-testid="score-team-1"
                  className={winnerIndex === 0 ? 'text-[color:var(--muted-soft,#929292)] font-medium' : ''}
                >
                  {clubB!.score}
                </span>
              </div>
            ) : (
              <span data-testid="kickoff-time" className="text-lg font-bold tabular-nums">
                {new Date(match.startTime).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          <TeamSlot club={clubB!} align="right" />
        </div>
      )}
    </div>
  );
}
