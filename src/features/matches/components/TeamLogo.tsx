import { cn } from '@/lib/utils';
import type { Club } from '../types';

export function TeamLogo({
  name,
  logoUrl,
  logoBackdrop,
}: {
  name: string;
  logoUrl: string;
  logoBackdrop?: Club['logoBackdrop'];
}) {
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

export function TeamSlot({
  club,
  align,
}: {
  club: Club;
  align: 'left' | 'right';
}) {
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
