// src/features/matches/components/DateTabs.tsx
import { cn } from '@/lib/utils';
import type { MatchesRange } from '../types';

const TABS: { value: MatchesRange; label: string }[] = [
  { value: 'yesterday', label: '어제' },
  { value: 'today', label: '오늘' },
  { value: 'upcoming', label: '예정' },
];

export function DateTabs({
  active,
  onChange,
}: {
  active: MatchesRange;
  onChange: (range: MatchesRange) => void;
}) {
  return (
    <div className="flex border-b border-[color:var(--hairline,#dddddd)]" role="tablist">
      {TABS.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={active === tab.value}
          aria-controls="match-list-panel"
          onClick={() => onChange(tab.value)}
          className={cn(
            'min-h-11 flex-1 border-b-2 border-transparent text-sm font-semibold text-[color:var(--muted,#6a6a6a)]',
            active === tab.value && 'border-[color:var(--brand-rausch,#ff385c)] text-[color:var(--ink,#222222)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
