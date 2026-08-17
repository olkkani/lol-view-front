// src/features/matches/components/MatchCard.tsx
import { cn } from '@/lib/utils';
import type { Match } from '../types';

function TeamLogo({ name, logoUrl }: { name: string; logoUrl?: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className="size-8 rounded-lg" />;
  }
  return (
    <div className="flex size-8 items-center justify-center rounded-lg bg-[color:var(--surface-strong,#f2f2f2)] text-sm font-semibold">
      {name.charAt(0)}
    </div>
  );
}

function isCancelledOrPostponed(match: Match): boolean {
  const kickoffPassed = new Date(match.kickoffAt).getTime() < Date.now();
  return !match.isLive && !match.score && kickoffPassed;
}

export function MatchCard({ match }: { match: Match }) {
  const [teamA, teamB] = match.teams;
  const cancelled = isCancelledOrPostponed(match);
  const isUpcoming = !match.isLive && !match.score && !cancelled;
  const isFinished = !match.isLive && !!match.score;

  const winnerIndex =
    isFinished && match.score ? (match.score[0] > match.score[1] ? 0 : 1) : null;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-[14px] border border-[color:var(--hairline-soft,#ebebeb)] p-4',
        'shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px,rgba(0,0,0,0.1)_0_4px_8px]',
        match.isLive && 'border-[color:var(--primary,#ff385c)]'
      )}
    >
      <div className="flex items-center justify-between text-xs text-[color:var(--muted,#6a6a6a)]">
        <span className="font-semibold">{match.league}</span>
        {match.isLive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--primary,#ff385c)] px-2 py-0.5 text-[11px] font-bold text-white">
            <span className="size-1.5 rounded-full bg-white" />
            LIVE
          </span>
        )}
        {cancelled && (
          <span className="rounded-full bg-[color:var(--surface-strong,#f2f2f2)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--muted,#6a6a6a)]">
            {match.status === 'cancelled' ? '취소' : '연기'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <TeamLogo name={teamA.name} logoUrl={teamA.logoUrl} />
          <span className="text-sm font-semibold">{teamA.name}</span>
        </div>

        <div className="flex min-w-14 flex-col items-center gap-0.5 px-3">
          {match.score && !cancelled ? (
            <>
              <div className="flex text-[21px] font-bold tabular-nums">
                <span data-testid="score-team-0" className={winnerIndex === 1 ? 'text-muted-soft text-[color:var(--muted-soft,#929292)] font-medium' : ''}>
                  {match.score[0]}
                </span>
                <span className="mx-1 font-normal text-[color:var(--muted-soft,#929292)]">:</span>
                <span data-testid="score-team-1" className={winnerIndex === 0 ? 'text-muted-soft text-[color:var(--muted-soft,#929292)] font-medium' : ''}>
                  {match.score[1]}
                </span>
              </div>
              {match.seriesFormat && (
                <span className="text-[11px] font-semibold text-[color:var(--muted,#6a6a6a)]">
                  {match.seriesFormat}
                </span>
              )}
            </>
          ) : isUpcoming ? (
            <>
              <span data-testid="kickoff-time" className="text-lg font-bold tabular-nums">
                {new Date(match.kickoffAt).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {match.seriesFormat && (
                <span className="text-[11px] font-semibold text-[color:var(--muted,#6a6a6a)]">
                  {match.seriesFormat}
                </span>
              )}
            </>
          ) : null}
        </div>

        <div className="flex flex-1 flex-row-reverse items-center gap-2 text-right">
          <TeamLogo name={teamB.name} logoUrl={teamB.logoUrl} />
          <span className="text-sm font-semibold">{teamB.name}</span>
        </div>
      </div>
    </div>
  );
}
