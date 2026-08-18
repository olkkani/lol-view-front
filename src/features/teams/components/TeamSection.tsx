import { groupByRegion } from '../utils/groupByRegion';
import { TeamRow } from './TeamRow';
import type { Team } from '../types';

export function TeamSection({
  title,
  teams,
  onToggle,
}: {
  title: string;
  teams: Team[];
  onToggle: (id: number) => void;
}) {
  const groups = groupByRegion(teams);

  return (
    <div className="border-b-8 border-[color:var(--surface-soft,#f7f7f7)] last:border-b-0">
      <div className="flex items-baseline justify-between px-4 pb-2 pt-3.5">
        <span className="text-[13px] font-bold tracking-wide">{title}</span>
        <span className="text-xs text-[color:var(--muted-soft,#929292)] tabular-nums">
          {teams.length}
        </span>
      </div>
      {groups.map((group) => (
        <div key={group.region}>
          <div className="bg-[color:var(--surface-soft,#f7f7f7)] px-4 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--muted-ink,#6a6a6a)]">
            {group.region}
          </div>
          {group.teams.map((team) => (
            <TeamRow key={team.id} team={team} onToggle={onToggle} />
          ))}
        </div>
      ))}
    </div>
  );
}
