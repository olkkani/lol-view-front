import { cn } from '@/lib/utils';
import type { Team } from '../types';

export function TeamRow({
  team,
  onToggle,
}: {
  team: Team;
  onToggle: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[color:var(--hairline-soft,#ebebeb)] px-4 py-2.5 last:border-b-0">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-strong,#f2f2f2)]">
        <img src={team.logoUrl} alt="" className="size-7 rounded-lg" />
      </div>
      <span className="text-sm font-semibold">{team.clubName}</span>
      <button
        type="button"
        onClick={() => onToggle(team.id)}
        aria-label={team.isFollowing ? '팔로잉 중 · 눌러서 팔로우 취소' : '팔로우'}
        className={cn(
          'ml-auto flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold leading-none',
          team.isFollowing
            ? 'border border-[color:var(--hairline,#dddddd)] bg-[color:var(--surface-strong,#f2f2f2)] text-[color:var(--muted-ink,#6a6a6a)]'
            : 'bg-[color:var(--brand-rausch,#ff385c)] text-white'
        )}
      >
        {team.isFollowing ? '✓' : '+'}
      </button>
    </div>
  );
}
