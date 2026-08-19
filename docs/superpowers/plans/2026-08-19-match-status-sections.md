# Match Status Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the `today` match list into three explicit sections (진행중/종료/예정, in that order) instead of relying on `sortMatches`'s implicit ongoing-pinned-then-kickoff-ascending order — and, as a prerequisite, fix the pre-existing D2 gap (polling must not move cards the user is currently looking at; only a manual refresh/tab-reclick should re-sort).

**Architecture:** A new `useFrozenMatches` hook owns "freeze order until manual refresh" state via a `ref`, sitting between `useMatches`'s poll-driven data and a new pure `buildMatchSections` function (which replaces `sortMatches` and additionally splits `today` data into three status-keyed sections). `MatchList` composes the two and renders a new `MatchSection` component per non-empty section, each internally reusing the existing `groupAdjacentMatches`. `MatchDetailModal` is untouched — it already reads the flat `useMatches` array directly and stays that way.

**Tech Stack:** React, TypeScript, TanStack Query (`useQuery`), Vitest + React Testing Library.

**Spec:** `~/.gstack/projects/olkkani-lol-view-front/20260819-design-match-sections.md`

## Global Constraints

- `buildMatchSections` fully replaces `sortMatches` — no coexistence. `sortMatches.ts` and `sortMatches.test.ts` are deleted; their 5 existing cases migrate into `buildMatchSections.test.ts`.
- Freeze/D2 logic lives only in `useFrozenMatches` (a hook). `buildMatchSections` stays a pure function with no React dependency, so it can be unit tested the same way `sortMatches` was.
- Section order is fixed: 진행중 → 종료 → 예정. Empty sections render nothing (no per-section empty-state copy).
- `MatchDetailModal` must keep working unmodified — it reads `useMatches(range)`'s flat array directly, not `buildMatchSections`'s output.
- Section split only applies to `range === 'today'`. `yesterday`/`upcoming` return a single kickoff-ascending list, matching current `sortMatches` behavior for those ranges (including ignoring `matchState` on them).
- Duplicate group headers across 종료/예정 for the same `leagueName`+`matchLabel` are intentional (sections are independent) — not a bug to fix.

---

### Task 1: `useFrozenMatches` hook — freeze sort order until manual refresh (D2)

**Files:**
- Create: `src/features/matches/hooks/useFrozenMatches.ts`
- Test: `src/features/matches/hooks/useFrozenMatches.test.ts`

**Interfaces:**
- Consumes: `data: Match[] | undefined` (from `useMatches`), `range: MatchesRange`
- Produces: `{ frozen: Match[]; refresh: () => void }` — `frozen` is the array `MatchList` should render; `refresh()` re-captures the current `data` into `frozen` (called on manual refetch / tab click, wired in Task 5).

Freeze semantics: on first render with data, `frozen` is set to that data. On subsequent renders where `data` changes (e.g. a poll tick), `frozen` does NOT change automatically. Only calling `refresh()` copies the latest `data` into `frozen`. If `range` changes, `frozen` resets immediately to the new range's `data` (switching tabs is itself a manual navigation action, not a background poll).

- [ ] **Step 1: Write the failing test — first render freezes to initial data**

```typescript
// src/features/matches/hooks/useFrozenMatches.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFrozenMatches } from './useFrozenMatches';
import { makeMatch } from '../test/fixtures';

describe('useFrozenMatches', () => {
  it('freezes to the initial data on first render', () => {
    const initial = [makeMatch({ id: 1 })];
    const { result } = renderHook(
      ({ data, range }) => useFrozenMatches(data, range),
      { initialProps: { data: initial, range: 'today' as const } }
    );
    expect(result.current.frozen).toEqual(initial);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/matches/hooks/useFrozenMatches.test.ts`
Expected: FAIL — `Cannot find module './useFrozenMatches'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/matches/hooks/useFrozenMatches.ts
import { useRef, useCallback } from 'react';
import type { Match, MatchesRange } from '../types';

export function useFrozenMatches(data: Match[] | undefined, range: MatchesRange) {
  const frozenRef = useRef<Match[]>(data ?? []);
  const rangeRef = useRef<MatchesRange>(range);
  const latestDataRef = useRef<Match[]>(data ?? []);

  latestDataRef.current = data ?? [];

  if (rangeRef.current !== range) {
    rangeRef.current = range;
    frozenRef.current = data ?? [];
  }

  const refresh = useCallback(() => {
    frozenRef.current = latestDataRef.current;
  }, []);

  return { frozen: frozenRef.current, refresh };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/matches/hooks/useFrozenMatches.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/hooks/useFrozenMatches.ts src/features/matches/hooks/useFrozenMatches.test.ts
git commit -m "feat(matches): add useFrozenMatches hook for D2 poll-freeze behavior"
```

- [ ] **Step 6: Write the failing test — data change on its own does NOT update frozen**

```typescript
// Add to src/features/matches/hooks/useFrozenMatches.test.ts, inside the describe block
it('does not update frozen when data changes without calling refresh (poll tick)', () => {
  const first = [makeMatch({ id: 1, matchState: 'ONGOING' })];
  const second = [makeMatch({ id: 1, matchState: 'FINISHED' })];
  const { result, rerender } = renderHook(
    ({ data, range }) => useFrozenMatches(data, range),
    { initialProps: { data: first, range: 'today' as const } }
  );

  rerender({ data: second, range: 'today' as const });

  expect(result.current.frozen).toEqual(first);
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run src/features/matches/hooks/useFrozenMatches.test.ts`
Expected: This step's assertion should already PASS given Step 3's implementation (the ref-based design doesn't react to `data` prop changes). Run it to confirm — if it unexpectedly fails, the Step 3 implementation has a bug to fix before continuing.

- [ ] **Step 8: Write the failing test — refresh() picks up latest data**

```typescript
// Add to src/features/matches/hooks/useFrozenMatches.test.ts, inside the describe block
it('updates frozen to the latest data when refresh() is called', () => {
  const first = [makeMatch({ id: 1, matchState: 'ONGOING' })];
  const second = [makeMatch({ id: 1, matchState: 'FINISHED' })];
  const { result, rerender } = renderHook(
    ({ data, range }) => useFrozenMatches(data, range),
    { initialProps: { data: first, range: 'today' as const } }
  );

  rerender({ data: second, range: 'today' as const });
  result.current.refresh();
  rerender({ data: second, range: 'today' as const });

  expect(result.current.frozen).toEqual(second);
});
```

- [ ] **Step 9: Run test to verify it fails**

Run: `npx vitest run src/features/matches/hooks/useFrozenMatches.test.ts`
Expected: FAIL if `refresh()` doesn't mutate `frozenRef.current` such that the next render reads the new value. Given Step 3's implementation, `refresh()` sets `frozenRef.current = latestDataRef.current`, but `renderHook`'s `result.current` won't reflect a ref mutation without a re-render — calling `refresh()` alone does not trigger one. This is expected to fail here, revealing the missing re-render trigger.

- [ ] **Step 10: Fix implementation — force a re-render on refresh()**

```typescript
// src/features/matches/hooks/useFrozenMatches.ts
import { useRef, useCallback, useState } from 'react';
import type { Match, MatchesRange } from '../types';

export function useFrozenMatches(data: Match[] | undefined, range: MatchesRange) {
  const frozenRef = useRef<Match[]>(data ?? []);
  const rangeRef = useRef<MatchesRange>(range);
  const latestDataRef = useRef<Match[]>(data ?? []);
  const [, forceRender] = useState(0);

  latestDataRef.current = data ?? [];

  if (rangeRef.current !== range) {
    rangeRef.current = range;
    frozenRef.current = data ?? [];
  }

  const refresh = useCallback(() => {
    frozenRef.current = latestDataRef.current;
    forceRender((n) => n + 1);
  }, []);

  return { frozen: frozenRef.current, refresh };
}
```

- [ ] **Step 11: Run all three tests to verify they pass**

Run: `npx vitest run src/features/matches/hooks/useFrozenMatches.test.ts`
Expected: PASS (3/3)

- [ ] **Step 12: Write the failing test — switching range resets frozen immediately**

```typescript
// Add to src/features/matches/hooks/useFrozenMatches.test.ts, inside the describe block
it('resets frozen immediately when range changes, without needing refresh()', () => {
  const todayData = [makeMatch({ id: 1 })];
  const upcomingData = [makeMatch({ id: 2 })];
  const { result, rerender } = renderHook(
    ({ data, range }) => useFrozenMatches(data, range),
    { initialProps: { data: todayData, range: 'today' as const } }
  );

  rerender({ data: upcomingData, range: 'upcoming' as const });

  expect(result.current.frozen).toEqual(upcomingData);
});
```

- [ ] **Step 13: Run test to verify it passes**

Run: `npx vitest run src/features/matches/hooks/useFrozenMatches.test.ts`
Expected: PASS (4/4) — the `rangeRef.current !== range` branch in Step 10's implementation already handles this.

- [ ] **Step 14: Commit**

```bash
git add src/features/matches/hooks/useFrozenMatches.ts src/features/matches/hooks/useFrozenMatches.test.ts
git commit -m "fix(matches): freeze order survives poll ticks, resets on range switch (D2)"
```

---

### Task 2: `buildMatchSections` — pure function replacing `sortMatches`

**Files:**
- Create: `src/features/matches/utils/buildMatchSections.ts`
- Create: `src/features/matches/utils/buildMatchSections.test.ts`
- Delete: `src/features/matches/utils/sortMatches.ts`
- Delete: `src/features/matches/utils/sortMatches.test.ts`

**Interfaces:**
- Consumes: `matches: Match[]`, `range: MatchesRange` (same shape `sortMatches` consumed — for `today`, callers pass `useFrozenMatches`'s `frozen` array, wired in Task 4)
- Produces: `MatchSection[]` where
  ```typescript
  interface MatchSection {
    status: 'ongoing' | 'finished' | 'upcoming';
    matches: Match[];
  }
  ```
  For `range !== 'today'`, returns a single-element array `[{ status: 'upcoming', matches: <kickoff-ascending list> }]` — see Step 9's discussion for why `status` is present but not rendered in that case.

- [ ] **Step 1: Write the failing test — non-today range returns one kickoff-ascending section**

```typescript
// src/features/matches/utils/buildMatchSections.test.ts
import { describe, it, expect } from 'vitest';
import { buildMatchSections } from './buildMatchSections';
import { makeMatch } from '../test/fixtures';

describe('buildMatchSections', () => {
  it('sorts non-today matches by kickoff time into a single section', () => {
    const later = makeMatch({ id: 2, startTime: '2026-08-17T08:00:00Z' });
    const earlier = makeMatch({ id: 1, startTime: '2026-08-17T05:00:00Z' });
    const result = buildMatchSections([later, earlier], 'upcoming');
    expect(result).toHaveLength(1);
    expect(result[0].matches.map((m) => m.id)).toEqual([1, 2]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/matches/utils/buildMatchSections.test.ts`
Expected: FAIL — `Cannot find module './buildMatchSections'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/matches/utils/buildMatchSections.ts
import type { Match, MatchesRange } from '../types';

export interface MatchSection {
  status: 'ongoing' | 'finished' | 'upcoming';
  matches: Match[];
}

function isOngoing(match: Match): boolean {
  return match.matchState === 'ONGOING';
}

function isFinished(match: Match): boolean {
  return match.matchState === 'FINISHED';
}

const byKickoffAsc = (a: Match, b: Match) =>
  new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

export function buildMatchSections(matches: Match[], range: MatchesRange): MatchSection[] {
  if (range !== 'today') {
    return [{ status: 'upcoming', matches: [...matches].sort(byKickoffAsc) }];
  }

  const ongoing = matches.filter(isOngoing).sort(byKickoffAsc);
  const finished = matches.filter((m) => !isOngoing(m) && isFinished(m)).sort(byKickoffAsc);
  const upcoming = matches.filter((m) => !isOngoing(m) && !isFinished(m)).sort(byKickoffAsc);

  return [
    { status: 'ongoing', matches: ongoing },
    { status: 'finished', matches: finished },
    { status: 'upcoming', matches: upcoming },
  ];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/matches/utils/buildMatchSections.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/utils/buildMatchSections.ts src/features/matches/utils/buildMatchSections.test.ts
git commit -m "feat(matches): add buildMatchSections pure function"
```

- [ ] **Step 6: Migrate remaining `sortMatches.test.ts` cases — write as failing/passing tests against `buildMatchSections`**

```typescript
// Add to src/features/matches/utils/buildMatchSections.test.ts, inside the describe block

it('splits today matches into ongoing, finished, and upcoming sections in that order', () => {
  const finished = makeMatch({ id: 1, startTime: '2026-08-17T02:00:00Z', matchState: 'FINISHED' });
  const ongoing = makeMatch({ id: 2, startTime: '2026-08-17T09:00:00Z', matchState: 'ONGOING' });
  const scheduled = makeMatch({ id: 3, startTime: '2026-08-17T12:00:00Z', matchState: 'SCHEDULED' });
  const result = buildMatchSections([finished, scheduled, ongoing], 'today');

  expect(result.map((s) => s.status)).toEqual(['ongoing', 'finished', 'upcoming']);
  expect(result[0].matches.map((m) => m.id)).toEqual([2]);
  expect(result[1].matches.map((m) => m.id)).toEqual([1]);
  expect(result[2].matches.map((m) => m.id)).toEqual([3]);
});

it('sorts multiple ongoing matches among themselves by kickoff time', () => {
  const ongoingLater = makeMatch({ id: 1, startTime: '2026-08-17T09:00:00Z', matchState: 'ONGOING' });
  const ongoingEarlier = makeMatch({ id: 2, startTime: '2026-08-17T07:00:00Z', matchState: 'ONGOING' });
  const result = buildMatchSections([ongoingLater, ongoingEarlier], 'today');
  const ongoingSection = result.find((s) => s.status === 'ongoing')!;
  expect(ongoingSection.matches.map((m) => m.id)).toEqual([2, 1]);
});

it('ignores matchState on yesterday and upcoming tabs, sorting by kickoff time only', () => {
  const flaggedOngoing = makeMatch({ id: 1, startTime: '2026-08-16T09:00:00Z', matchState: 'ONGOING' });
  const normal = makeMatch({ id: 2, startTime: '2026-08-16T05:00:00Z', matchState: 'FINISHED' });
  const result = buildMatchSections([flaggedOngoing, normal], 'yesterday');
  expect(result).toHaveLength(1);
  expect(result[0].matches.map((m) => m.id)).toEqual([2, 1]);
});

it('treats an unrecognized matchState value as not-live, sorting it into upcoming (defensive default)', () => {
  const unknownState = makeMatch({ id: 1, startTime: '2026-08-17T02:00:00Z', matchState: 'CANCELLED' });
  const scheduled = makeMatch({ id: 2, startTime: '2026-08-17T09:00:00Z', matchState: 'SCHEDULED' });
  const result = buildMatchSections([scheduled, unknownState], 'today');
  const upcomingSection = result.find((s) => s.status === 'upcoming')!;
  // Neither is ONGOING or FINISHED, so both fall into upcoming, kickoff-ascending.
  expect(upcomingSection.matches.map((m) => m.id)).toEqual([1, 2]);
});

it('returns empty sections for an empty input array', () => {
  const result = buildMatchSections([], 'today');
  expect(result.every((s) => s.matches.length === 0)).toBe(true);
});
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run src/features/matches/utils/buildMatchSections.test.ts`
Expected: PASS (7/7)

- [ ] **Step 8: Write the failing test — a match with an unrecognized `matchState` is never dropped**

```typescript
// Add to src/features/matches/utils/buildMatchSections.test.ts, inside the describe block
it('never drops a match — every input match appears in exactly one section', () => {
  const a = makeMatch({ id: 1, matchState: 'ONGOING' });
  const b = makeMatch({ id: 2, matchState: 'FINISHED' });
  const c = makeMatch({ id: 3, matchState: 'SCHEDULED' });
  const d = makeMatch({ id: 4, matchState: 'CANCELLED' });
  const result = buildMatchSections([a, b, c, d], 'today');
  const allIds = result.flatMap((s) => s.matches.map((m) => m.id));
  expect(allIds.sort()).toEqual([1, 2, 3, 4]);
});
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run src/features/matches/utils/buildMatchSections.test.ts`
Expected: PASS (8/8) — Step 3's implementation already guarantees every match falls into exactly one of the three filters (ongoing / finished / else-upcoming), so this test documents and locks in that invariant rather than fixing a bug.

- [ ] **Step 10: Delete the old `sortMatches` files**

```bash
git rm src/features/matches/utils/sortMatches.ts src/features/matches/utils/sortMatches.test.ts
```

- [ ] **Step 11: Run the full test suite to confirm nothing else imports `sortMatches`**

Run: `npx vitest run`
Expected: Failures only in `MatchList.tsx`/`MatchList.test.tsx` (still importing `sortMatches` — fixed in Task 4). If any other file fails, grep for `sortMatches` imports and note them before continuing.

```bash
grep -rn "sortMatches" src/
```

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "refactor(matches): replace sortMatches with buildMatchSections"
```

---

### Task 3: `MatchSection` component

**Files:**
- Create: `src/features/matches/components/MatchSection.tsx`
- Test: `src/features/matches/components/MatchSection.test.tsx`

**Interfaces:**
- Consumes: `buildMatchSections`'s `MatchSection` type (Task 2), `groupAdjacentMatches` (existing, unchanged), `MatchCard` (existing, unchanged)
- Produces: `MatchSection` component with props `{ status: 'ongoing' | 'finished' | 'upcoming'; matches: Match[]; range: MatchesRange; openMatchId?: number }`. Renders nothing when `matches` is empty.

- [ ] **Step 1: Write the failing test — renders nothing when matches is empty**

```typescript
// src/features/matches/components/MatchSection.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MatchSection } from './MatchSection';

describe('MatchSection', () => {
  it('renders nothing when matches is empty', () => {
    const { container } = render(
      <MatchSection status="ongoing" matches={[]} range="today" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/matches/components/MatchSection.test.tsx`
Expected: FAIL — `Cannot find module './MatchSection'`

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/matches/components/MatchSection.tsx
import { groupAdjacentMatches } from '../utils/groupAdjacentMatches';
import { MatchCard } from './MatchCard';
import type { Match, MatchesRange } from '../types';

const SECTION_TITLES: Record<'ongoing' | 'finished' | 'upcoming', string> = {
  ongoing: '진행중',
  finished: '종료',
  upcoming: '예정',
};

export function MatchSection({
  status,
  matches,
  range,
  openMatchId,
}: {
  status: 'ongoing' | 'finished' | 'upcoming';
  matches: Match[];
  range: MatchesRange;
  openMatchId?: number;
}) {
  if (matches.length === 0) return null;

  const groups = groupAdjacentMatches(matches);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-bold text-[color:var(--ink,#222222)]">
        {SECTION_TITLES[status]}
      </h2>
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-[color:var(--muted-ink,#6a6a6a)]">
            {group.leagueName} {group.matchLabel}
          </span>
          {group.matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              range={range}
              isDetailOpen={match.id === openMatchId}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/matches/components/MatchSection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/components/MatchSection.tsx src/features/matches/components/MatchSection.test.tsx
git commit -m "feat(matches): add MatchSection component"
```

- [ ] **Step 6: Write the failing test — renders section title and match cards when non-empty**

```typescript
// Add to src/features/matches/components/MatchSection.test.tsx, inside the describe block
import { makeMatch } from '../test/fixtures';

it('renders the section title and match cards when matches is non-empty', () => {
  const match = makeMatch({ id: 1, leagueName: 'LCK', matchLabel: 'Week 1 Day 2' });
  render(<MatchSection status="finished" matches={[match]} range="today" />);
  expect(screen.getByText('종료')).toBeInTheDocument();
  expect(screen.getByText('LCK Week 1 Day 2')).toBeInTheDocument();
});
```

Also add `import { screen } from '@testing-library/react';` to the top-level import if not already present (extend the existing `render` import).

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/features/matches/components/MatchSection.test.tsx`
Expected: PASS (2/2)

- [ ] **Step 8: Write the failing test — same leagueName+matchLabel across two separately-rendered sections shows the header twice (documents intentional duplication)**

```typescript
// Add to src/features/matches/components/MatchSection.test.tsx, inside the describe block
it('is unaware of other sections — the same group header can legitimately appear again in a sibling MatchSection', () => {
  const finishedMatch = makeMatch({ id: 1, leagueName: 'LCK', matchLabel: 'Week 1 Day 2', matchState: 'FINISHED' });
  const upcomingMatch = makeMatch({ id: 2, leagueName: 'LCK', matchLabel: 'Week 1 Day 2', matchState: 'SCHEDULED' });

  render(
    <>
      <MatchSection status="finished" matches={[finishedMatch]} range="today" />
      <MatchSection status="upcoming" matches={[upcomingMatch]} range="today" />
    </>
  );

  expect(screen.getAllByText('LCK Week 1 Day 2')).toHaveLength(2);
});
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run src/features/matches/components/MatchSection.test.tsx`
Expected: PASS (3/3) — each `MatchSection` instance runs `groupAdjacentMatches` independently on only its own `matches`, so it has no way to know about a sibling section's groups. This test locks in the design doc's "intentional duplication" decision.

- [ ] **Step 10: Commit**

```bash
git add src/features/matches/components/MatchSection.test.tsx
git commit -m "test(matches): cover MatchSection non-empty rendering and cross-section header duplication"
```

---

### Task 4: Wire `MatchList` — `useFrozenMatches` + `buildMatchSections` + `MatchSection`

**Files:**
- Modify: `src/features/matches/components/MatchList.tsx`
- Modify: `src/features/matches/components/MatchList.test.tsx`

**Interfaces:**
- Consumes: `useFrozenMatches` (Task 1), `buildMatchSections` (Task 2), `MatchSection` (Task 3)
- Produces: `MatchList` component, same external props as before (`{ range: MatchesRange; openMatchId?: number }`) — no signature change, so `MatchDetailModal` and any router wiring calling `MatchList` need no changes.

- [ ] **Step 1: Read current `MatchList.tsx` to confirm the exact lines being replaced**

Run: `sed -n '1,20p' src/features/matches/components/MatchList.tsx`

Confirm imports and the `sorted`/`groups` `useMemo` block match what Step 3 below replaces (they were last read during design as lines 1-14).

- [ ] **Step 2: Replace `MatchList.tsx`'s data pipeline**

```typescript
// src/features/matches/components/MatchList.tsx
import { useMemo } from 'react';
import { useMatches } from '../api/useMatches';
import { useFrozenMatches } from '../hooks/useFrozenMatches';
import { buildMatchSections } from '../utils/buildMatchSections';
import { MatchSection } from './MatchSection';
import { MatchCardSkeleton } from './MatchCardSkeleton';
import type { MatchesRange } from '../types';

export function MatchList({ range, openMatchId }: { range: MatchesRange; openMatchId?: number }) {
  const { data, isLoading, isError, refetch } = useMatches(range);
  const { frozen, refresh } = useFrozenMatches(data, range);

  const sections = useMemo(() => buildMatchSections(frozen, range), [frozen, range]);
  const totalMatches = frozen.length;

  const handleRetry = () => {
    refresh();
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2 p-4">
        <MatchCardSkeleton />
        <MatchCardSkeleton />
        <MatchCardSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-[color:var(--muted-ink,#6a6a6a)]">
        <p>경기 정보를 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={handleRetry}
          className="min-h-11 rounded-lg border border-[color:var(--ink,#222222)] px-4 text-sm font-medium text-[color:var(--ink,#222222)]"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (totalMatches === 0) {
    const emptyMessage =
      range === 'yesterday'
        ? '어제 경기가 없어요'
        : range === 'today'
          ? '오늘 예정된 경기가 없어요'
          : '예정된 경기가 없어요';

    return (
      <div className="py-16 text-center text-sm text-[color:var(--muted-ink,#6a6a6a)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {sections.map((section) => (
        <MatchSection
          key={section.status}
          status={section.status}
          matches={section.matches}
          range={range}
          openMatchId={openMatchId}
        />
      ))}
    </div>
  );
}
```

Note: `handleRetry` calls `refresh()` before `refetch()` so a manual retry both re-freezes to whatever data is currently cached AND kicks off a fresh fetch — this satisfies "수동 새로고침/탭 재클릭 시에만 재정렬" from the design doc, since retry is a manual action.

- [ ] **Step 3: Run the existing `MatchList.test.tsx` suite to see what's now broken**

Run: `npx vitest run src/features/matches/components/MatchList.test.tsx`
Expected: The "reorders a match from live-pinned to time-sorted position after a poll updates its status" test (existing, around line 82) now FAILS — it asserted immediate re-sort on poll, which Task 1's freeze behavior deliberately breaks. This is the expected, intentional break flagged in the design doc — not a regression to silently fix by reverting freeze behavior.

- [ ] **Step 4: Rewrite the poll-reorder test to assert freeze + manual-refresh behavior, reusing one `QueryClient`**

```typescript
// Replace the existing "reorders a match from live-pinned to time-sorted position
// after a poll updates its status" test in src/features/matches/components/MatchList.test.tsx
// with this. Also reuses one QueryClient across rerenders (see TODOS.md's
// "재정렬 통합 테스트가 실제 in-place 업데이트를 검증하지 않음"), instead of
// creating a fresh one per rerender/mount.
it('keeps a card in its section across a poll tick, and only moves it after a manual refresh', async () => {
  const now = Date.now();
  const ongoingKickoff = new Date(now + 60 * 60 * 1000).toISOString();
  const scheduledKickoff = new Date(now + 30 * 60 * 1000).toISOString();
  const ongoing = makeMatch({
    id: 1,
    startTime: ongoingKickoff,
    matchState: 'ONGOING',
    clubs: [
      { name: 'T1', logoUrl: '', score: 1 },
      { name: 'GEN', logoUrl: '', score: 0 },
    ],
  });
  const scheduled = makeMatch({ id: 2, startTime: scheduledKickoff, matchState: 'SCHEDULED' });

  const spy = vi.spyOn(useMatchesModule, 'useMatches');
  const client = new QueryClient();

  spy.mockReturnValue({
    data: [scheduled, ongoing],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

  const { rerender } = render(
    <QueryClientProvider client={client}>
      <MatchList range="today" />
    </QueryClientProvider>
  );

  expect(screen.getByText('진행중')).toBeInTheDocument();
  expect(screen.queryByText('종료')).not.toBeInTheDocument();

  // Poll tick: matchState flips to FINISHED, but no manual refresh happens.
  const finished = { ...ongoing, matchState: 'FINISHED' as const };
  spy.mockReturnValue({
    data: [finished, scheduled],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

  rerender(
    <QueryClientProvider client={client}>
      <MatchList range="today" />
    </QueryClientProvider>
  );

  // Card must NOT have moved yet — still shows under 진행중, not 종료.
  expect(screen.getByText('진행중')).toBeInTheDocument();
  expect(screen.queryByText('종료')).not.toBeInTheDocument();

  // Switching tabs away and back is a manual navigation action, not a background
  // poll — useFrozenMatches (Task 1 Step 12) resets frozen order on range change.
  rerender(
    <QueryClientProvider client={client}>
      <MatchList range="upcoming" />
    </QueryClientProvider>
  );
  rerender(
    <QueryClientProvider client={client}>
      <MatchList range="today" />
    </QueryClientProvider>
  );

  await waitFor(() => {
    expect(screen.getByText('종료')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/matches/components/MatchList.test.tsx`
Expected: PASS. If it fails on the range-switch portion, re-check Task 1 Step 12's `rangeRef.current !== range` branch is intact in `useFrozenMatches.ts`.

- [ ] **Step 6: Write the failing test — the "다시 시도" retry button also unfreezes the order**

```typescript
// Add to src/features/matches/components/MatchList.test.tsx, inside the describe block.
// Covers the other manual-refresh path wired in Step 2's handleRetry: clicking
// "다시 시도" on the error state must call refresh() (unfreeze) before refetch().
it('unfreezes and re-sorts sections when the retry button is clicked after an error', async () => {
  const now = Date.now();
  const ongoing = makeMatch({
    id: 1,
    startTime: new Date(now + 60 * 60 * 1000).toISOString(),
    matchState: 'ONGOING',
  });
  const spy = vi.spyOn(useMatchesModule, 'useMatches');
  const client = new QueryClient();
  const refetch = vi.fn();

  spy.mockReturnValue({
    data: [ongoing],
    isLoading: false,
    isError: false,
    refetch,
  } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

  const { rerender } = render(
    <QueryClientProvider client={client}>
      <MatchList range="today" />
    </QueryClientProvider>
  );
  expect(screen.getByText('진행중')).toBeInTheDocument();

  // Poll tick moves to an error state (e.g. a failed refetch mid-poll).
  spy.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: true,
    refetch,
  } as unknown as ReturnType<typeof useMatchesModule.useMatches>);
  rerender(
    <QueryClientProvider client={client}>
      <MatchList range="today" />
    </QueryClientProvider>
  );

  const finished = { ...ongoing, matchState: 'FINISHED' as const };
  spy.mockReturnValue({
    data: [finished],
    isLoading: false,
    isError: false,
    refetch,
  } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

  screen.getByText('다시 시도').click();
  rerender(
    <QueryClientProvider client={client}>
      <MatchList range="today" />
    </QueryClientProvider>
  );

  expect(refetch).toHaveBeenCalledOnce();
  await waitFor(() => {
    expect(screen.getByText('종료')).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npx vitest run src/features/matches/components/MatchList.test.tsx`
Expected: PASS. If `refetch` was called but sections didn't update, check `handleRetry` in Step 2's implementation calls `refresh()` before `refetch()`.

- [ ] **Step 8: Update the remaining `MatchList.test.tsx` tests that reference old structure**

The existing tests "renders one shared header for adjacent matches...", "renders separate headers for matches with different leagueName or matchLabel...", "renders both groups (and no duplicate cards) when a live match splits...", and "unmounts the live match card when switching away from the today tab" all render via `range="upcoming"` or `range="today"` and assert on header text / card counts — these keep working unchanged since `MatchSection`'s rendering preserves the same header text and card structure as the old flat rendering. Run the full file to confirm:

Run: `npx vitest run src/features/matches/components/MatchList.test.tsx`
Expected: PASS (all tests, including the ones listed above with zero code changes needed)

- [ ] **Step 9: Run the full project test suite**

Run: `npx vitest run`
Expected: PASS. Confirms `MatchDetailModal.test.tsx` and all other suites are unaffected (Architecture Notes: `MatchDetailModal` never imported `sortMatches` or the section types).

- [ ] **Step 10: Commit**

```bash
git add src/features/matches/components/MatchList.tsx src/features/matches/components/MatchList.test.tsx
git commit -m "feat(matches): wire useFrozenMatches + buildMatchSections + MatchSection into MatchList"
```

---

### Task 5: TODOS.md cleanup

**Files:**
- Modify: `TODOS.md`

- [ ] **Step 1: Mark the two resolved TODO items as done**

Read `TODOS.md`, find the "폴링 재정렬 시 스크롤 위치 보존 (D2) 실제 구현" and "재정렬 통합 테스트가 실제 in-place 업데이트를 검증하지 않음" sections. Prefix each heading with `~~` strikethrough (matching the file's existing convention for the "백엔드 응답 스키마 확정 후 가정 타입 갱신" resolved item), and append `(해결됨 2026-08-19)`. Add one sentence under each noting it was resolved via `useFrozenMatches` in this branch, referencing the plan file path.

```markdown
## ~~폴링 재정렬 시 스크롤 위치 보존 (D2) 실제 구현~~ (해결됨 2026-08-19)

`useFrozenMatches` 훅으로 해결. `docs/superpowers/plans/2026-08-19-match-status-sections.md` 참고.

## ~~재정렬 통합 테스트가 실제 in-place 업데이트를 검증하지 않음~~ (해결됨 2026-08-19)

`MatchList.test.tsx`의 재작성된 poll 테스트가 단일 `QueryClient`를 재사용하도록 수정됨. `docs/superpowers/plans/2026-08-19-match-status-sections.md` Task 4 참고.
```

- [ ] **Step 2: Commit**

```bash
git add TODOS.md
git commit -m "docs: mark D2 and poll-reorder-test TODOs resolved"
```

## NOT in scope

- Section collapse/expand, count badges — deferred, per design doc.
- Tablet/desktop responsive layout — tracked separately in `TODOS.md`.
- Keyboard navigation / screen reader accessibility — tracked separately in `TODOS.md`.
- View Transitions FLIP morph interaction with section moves during an open modal — flagged in the design doc as a manual-QA item post-implementation, not a coded test in this plan (no deterministic way to trigger it in RTL without the transition API present in jsdom).
