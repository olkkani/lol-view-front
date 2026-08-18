import { cn } from '@/lib/utils';
import type { Club } from '../types';

export function TeamLogo({
  name,
  logoUrl,
  logoBackdrop,
  viewTransitionName,
}: {
  name: string;
  logoUrl: string;
  logoBackdrop?: Club['logoBackdrop'];
  viewTransitionName?: string;
}) {
  const style = viewTransitionName
    ? ({ viewTransitionName } as React.CSSProperties)
    : undefined;

  if (logoUrl) {
    const hasDarkBackdrop = logoBackdrop === 'DARK';
    return (
      <div
        style={style}
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
    <div
      style={style}
      className="flex size-8 items-center justify-center rounded-lg bg-[color:var(--surface-strong,#f2f2f2)] text-sm font-semibold"
    >
      {name.charAt(0)}
    </div>
  );
}

export function TeamSlot({
  club,
  align,
  viewTransitionName,
}: {
  club: Club;
  align: 'left' | 'right';
  viewTransitionName?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-1 items-center gap-2',
        align === 'right' && 'flex-row-reverse text-right'
      )}
    >
      <TeamLogo
        name={club.name}
        logoUrl={club.logoUrl}
        logoBackdrop={club.logoBackdrop}
        viewTransitionName={viewTransitionName}
      />
      <span className="text-sm font-semibold">{club.name}</span>
    </div>
  );
}
