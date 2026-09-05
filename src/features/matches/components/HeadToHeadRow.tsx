import { cn } from '@/lib/utils';

export function HeadToHeadRow({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          data-testid="h2h-dot"
          className="size-3 rounded-full bg-[color:var(--muted-soft,#929292)]"
        />
      ))}
    </div>
  );
}
