// src/features/matches/components/LiveBadge.tsx

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-rausch,#ff385c)] px-2 py-0.5 text-[11px] font-bold text-white">
      <span className="size-1.5 rounded-full bg-white" />
      LIVE
    </span>
  );
}
