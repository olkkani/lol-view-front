// src/features/matches/components/MatchCardSkeleton.tsx
export function MatchCardSkeleton() {
  return (
    <div className="flex h-24 animate-pulse flex-col gap-2 rounded-[14px] border border-[color:var(--hairline-soft,#ebebeb)] bg-[color:var(--surface-strong,#f2f2f2)] p-4" />
  );
}
