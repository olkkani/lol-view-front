// src/features/matches/components/MatchCard.tsx
import { cn } from '@/lib/utils';
import type { Club, Match } from '../types';

function TeamLogo({ name, logoUrl, logoBackdrop }: { name: string; logoUrl: string; logoBackdrop?: Club['logoBackdrop'] }) {
  if (logoUrl) {
    const hasDarkBackdrop = logoBackdrop === 'DARK';
    return (
      <div
        className={cn(
          'flex size-8 items-center justify-center rounded-lg',
          hasDarkBackdrop && 'bg-[color:var(--ink,#222222)] dark:bg-transparent'
        )}
      >
        <img
          src={logoUrl}
          alt=""
          className={cn('rounded-lg', hasDarkBackdrop ? 'size-6 dark:size-8' : 'size-8')}
        />
      </div>
    );
  }
  return (
    <div className="flex size-8 items-center justify-center rounded-lg bg-[color:var(--surface-strong,#f2f2f2)] text-sm font-semibold">
      {name.charAt(0)}
    </div>
  );
}

function TeamSlot({ club, align }: { club: Club; align: 'left' | 'right' }) {
  return (
    <div
      className={cn(
        'flex flex-1 items-center gap-2',
        align === 'right' && 'flex-row-reverse text-right'
      )}
    >
      <TeamLogo name={club.name} logoUrl={club.logoUrl} logoBackdrop={club.logoBackdrop} />
      <span className="text-sm font-semibold">{club.name}</span>
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
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

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-[14px] border border-[color:var(--hairline-soft,#ebebeb)] p-4',
        'shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px,rgba(0,0,0,0.1)_0_4px_8px]',
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
