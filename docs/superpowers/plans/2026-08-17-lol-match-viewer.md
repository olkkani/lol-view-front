# LoL Match Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile web page that lists LoL esports matches across three tabs (yesterday/today/upcoming), with live matches always pinned to the top of the today tab regardless of chronological order.

**Architecture:** React Folder Structure (feature-based) on top of the existing Vite + TanStack Router + TanStack Query + Tailwind v4 + shadcn stack. A single `features/matches` module owns data fetching (`useMatches`), sorting (`sortMatches`), and rendering (`MatchCard`/`MatchList`/`DateTabs`). The backend (`GET /matches?range=yesterday|today|upcoming`) is a separate service already running locally; this plan only builds the frontend consumer.

**Tech Stack:** React 19, TanStack Router 1.170, TanStack Query 5.101, Vite 8, Tailwind v4, `@toss/ky` (HTTP client), Vitest + `@testing-library/react` (testing, newly added).

**Spec:** `docs/designs/lol-match-viewer.md` — the plan argues from this spec; executors should read both.

## Global Constraints

- Data source is the local backend only: `GET http://localhost:9031/matches?range={yesterday|today|upcoming}`. No other data source, no direct external API/crawling.
- No sockets — polling only, and only the "today" tab polls (15s interval assumption, unconfirmed against backend rate limits).
- Scope is the match list viewer screen only — no auth, no team/player detail pages.
- Reuse the existing stack as-is: Vite, TanStack Router/Query, Tailwind v4, shadcn, `@toss/ky`.
- No Framer Motion / reorder animation in v1 — live→finished transitions reposition instantly, and only on refresh/tab reselect (not mid-scroll).
- Timezone: KST (Asia/Seoul) assumed for kickoff times and range boundaries.
- Design tokens: reuse `DESIGN.md` (Airbnb-style system) — `{rounded.md}`, `{component.property-card}` shadow tier, `{spacing.base}`, `{typography.display-md}`, `{colors.primary}`, `{colors.muted-soft}`, `{colors.on-primary}`, `{rounded.full}`.
- Touch targets minimum 44×44px on all interactive elements (hamburger button, tabs, retry button).
- No status text badges ("종료", "경기 전") — status is conveyed by score presence/color and kickoff time, except cancelled/postponed matches which get a small muted text badge exception.

---

## File Structure

```
src/
  main.tsx                              [MODIFY] wire QueryClientProvider + RouterProvider
  routes/
    __root.tsx                          [CREATE] root route (renders <Outlet />)
    index.tsx                           [CREATE] tab query param management (?range=)
  features/matches/
    types.ts                            [CREATE] Match, Team, MatchesRange types
    api/
      fetchMatches.ts                   [CREATE] ky-based fetch function
      useMatches.ts                     [CREATE] TanStack Query hook wrapping fetchMatches
    utils/
      sortMatches.ts                    [CREATE] live-first sort logic
      sortMatches.test.ts               [CREATE] unit tests (5 edge cases)
    components/
      DateTabs.tsx                      [CREATE] yesterday/today/upcoming tab bar
      MatchCard.tsx                     [CREATE] single match card (all states)
      MatchCardSkeleton.tsx             [CREATE] loading skeleton
      MatchList.tsx                     [CREATE] orchestrates loading/empty/error/success
      MatchList.test.tsx                [CREATE] integration test (poll transition)
  components/layout/
    Header.tsx                          [CREATE] logo + hamburger trigger
    HamburgerMenu.tsx                   [CREATE] menu trigger UI only (no content yet)
vitest.config.ts                        [CREATE]
src/test/setup.ts                       [CREATE] jest-dom matchers
package.json                            [MODIFY] add vitest, @testing-library/react, @testing-library/jest-dom, jsdom
```

Each component file has one responsibility: `DateTabs` only renders/handles tab selection, `MatchCard` only renders one match's visual states, `MatchList` only orchestrates data-state → UI-state mapping. `sortMatches` is a pure function isolated from React so it's trivially testable.

---

## Task 1: Confirm backend schema and finalize types

**Files:**
- Create: `src/features/matches/types.ts`

**Interfaces:**
- Produces: `Match` interface, `Team` interface, `MatchesRange` type (`"yesterday" | "today" | "upcoming"`) — every later task imports these from this file.

This task has no test cycle of its own (it's a data-shape decision, not behavior) — but it gates every other task, so it happens first.

- [ ] **Step 1: Attempt to call the real backend**

Run:
```bash
curl -s "http://localhost:9031/matches?range=today" | head -c 2000
```

- [ ] **Step 2: Branch on the result**

**If the backend responds with JSON:** read the actual field names for live/status, series format, and cancelled-match representation. Use those exact field names in Step 3 below instead of the placeholder names.

**If the backend does not respond (connection refused, timeout, empty):** proceed with the assumed shape below, and leave a comment in the file marking it unconfirmed. Do not block on this — this is a solo side project and the backend may not be running in every dev session.

- [ ] **Step 3: Write the types file**

```typescript
// src/features/matches/types.ts

export type MatchesRange = "yesterday" | "today" | "upcoming";

export interface Team {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface Match {
  id: string;
  league: string;
  teams: [Team, Team];
  /** e.g. "Bo3", "Bo5". UNCONFIRMED against backend — verify field exists. */
  seriesFormat?: string;
  /** ISO 8601, assumed KST. */
  kickoffAt: string;
  /** UNCONFIRMED field name — backend may use a status enum instead. */
  isLive: boolean;
  /** Present only for live/finished matches. */
  score?: [number, number];
  /**
   * UNCONFIRMED — whether "cancelled" is a real value the backend sends.
   * Do not treat this as authoritative until backend schema is verified.
   */
  status?: "scheduled" | "live" | "finished" | "cancelled";
}
```

- [ ] **Step 4: Verify the file type-checks**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors referencing `types.ts`

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/types.ts
git commit -m "feat(matches): add Match/Team types"
```

---

## Task 2: Install and configure Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: `npm run test` script that later tasks' test files run under.

- [ ] **Step 1: Install dependencies**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Add the test script to package.json**

In `package.json`, inside `"scripts"`, add:

```json
"test": "vitest run"
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

- [ ] **Step 4: Create the test setup file**

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Write a trivial smoke test to verify the harness works**

```typescript
// src/test/setup.smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('vitest harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 6: Run it**

Run: `npm run test`
Expected: 1 test file, 1 test, PASS

- [ ] **Step 7: Delete the smoke test (it served its purpose)**

```bash
rm src/test/setup.smoke.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test/setup.ts
git commit -m "chore: add vitest + testing-library"
```

---

## Task 3: sortMatches — live-first sort logic

**Files:**
- Create: `src/features/matches/utils/sortMatches.ts`
- Test: `src/features/matches/utils/sortMatches.test.ts`

**Interfaces:**
- Consumes: `Match`, `MatchesRange` from `src/features/matches/types.ts` (Task 1)
- Produces: `sortMatches(matches: Match[], range: MatchesRange): Match[]` — `MatchList` (Task 6) calls this on every render.

This is the highest-bug-risk logic in the whole feature (per the design doc's review), so it gets full edge-case coverage before anything else touches it.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/matches/utils/sortMatches.test.ts
import { describe, it, expect } from 'vitest';
import { sortMatches } from './sortMatches';
import type { Match } from '../types';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 'm1',
    league: 'LCK',
    teams: [
      { id: 't1', name: 'T1' },
      { id: 't2', name: 'GEN' },
    ],
    kickoffAt: '2026-08-17T05:00:00Z',
    isLive: false,
    ...overrides,
  };
}

describe('sortMatches', () => {
  it('sorts today matches by kickoff time when none are live', () => {
    const later = makeMatch({ id: 'later', kickoffAt: '2026-08-17T08:00:00Z' });
    const earlier = makeMatch({ id: 'earlier', kickoffAt: '2026-08-17T05:00:00Z' });
    const result = sortMatches([later, earlier], 'today');
    expect(result.map((m) => m.id)).toEqual(['earlier', 'later']);
  });

  it('pins the single live match to the top regardless of kickoff time', () => {
    const finished = makeMatch({ id: 'finished', kickoffAt: '2026-08-17T02:00:00Z', isLive: false });
    const live = makeMatch({ id: 'live', kickoffAt: '2026-08-17T09:00:00Z', isLive: true });
    const upcoming = makeMatch({ id: 'upcoming', kickoffAt: '2026-08-17T12:00:00Z', isLive: false });
    const result = sortMatches([finished, upcoming, live], 'today');
    expect(result.map((m) => m.id)).toEqual(['live', 'finished', 'upcoming']);
  });

  it('sorts multiple live matches among themselves by kickoff time', () => {
    const liveLater = makeMatch({ id: 'live-later', kickoffAt: '2026-08-17T09:00:00Z', isLive: true });
    const liveEarlier = makeMatch({ id: 'live-earlier', kickoffAt: '2026-08-17T07:00:00Z', isLive: true });
    const result = sortMatches([liveLater, liveEarlier], 'today');
    expect(result.map((m) => m.id)).toEqual(['live-earlier', 'live-later']);
  });

  it('ignores isLive on yesterday and upcoming tabs, sorting by kickoff time only', () => {
    const flaggedLive = makeMatch({ id: 'flagged-live', kickoffAt: '2026-08-16T09:00:00Z', isLive: true });
    const normal = makeMatch({ id: 'normal', kickoffAt: '2026-08-16T05:00:00Z', isLive: false });
    const result = sortMatches([flaggedLive, normal], 'yesterday');
    expect(result.map((m) => m.id)).toEqual(['normal', 'flagged-live']);
  });

  it('returns an empty array unchanged', () => {
    expect(sortMatches([], 'today')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- sortMatches`
Expected: FAIL with "Cannot find module './sortMatches'" or similar

- [ ] **Step 3: Write the implementation**

```typescript
// src/features/matches/utils/sortMatches.ts
import type { Match, MatchesRange } from '../types';

export function sortMatches(matches: Match[], range: MatchesRange): Match[] {
  const byKickoffAsc = (a: Match, b: Match) =>
    new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime();

  if (range !== 'today') {
    return [...matches].sort(byKickoffAsc);
  }

  const live = matches.filter((m) => m.isLive).sort(byKickoffAsc);
  const rest = matches.filter((m) => !m.isLive).sort(byKickoffAsc);

  return [...live, ...rest];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- sortMatches`
Expected: 5 tests, PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/utils/sortMatches.ts src/features/matches/utils/sortMatches.test.ts
git commit -m "feat(matches): add sortMatches with live-first ordering"
```

---

## Task 4: fetchMatches + useMatches hook

**Files:**
- Create: `src/features/matches/api/fetchMatches.ts`
- Create: `src/features/matches/api/useMatches.ts`

**Interfaces:**
- Consumes: `Match`, `MatchesRange` from `src/features/matches/types.ts` (Task 1)
- Produces: `useMatches(range: MatchesRange)` returning `{ data, isLoading, isError, refetch }` (raw TanStack Query `UseQueryResult<Match[]>` — no wrapping) — `MatchList` (Task 6) consumes this directly.

- [ ] **Step 1: Write fetchMatches**

```typescript
// src/features/matches/api/fetchMatches.ts
import ky from '@toss/ky';
import type { Match, MatchesRange } from '../types';

const API_BASE_URL = 'http://localhost:9031';

export async function fetchMatches(range: MatchesRange): Promise<Match[]> {
  return ky
    .get(`${API_BASE_URL}/matches`, { searchParams: { range } })
    .json<Match[]>();
}
```

- [ ] **Step 2: Write useMatches**

```typescript
// src/features/matches/api/useMatches.ts
import { useQuery } from '@tanstack/react-query';
import { fetchMatches } from './fetchMatches';
import type { MatchesRange } from '../types';

const TODAY_POLL_INTERVAL_MS = 15_000;

export function useMatches(range: MatchesRange) {
  return useQuery({
    queryKey: ['matches', range],
    queryFn: () => fetchMatches(range),
    refetchInterval: range === 'today' ? TODAY_POLL_INTERVAL_MS : false,
  });
}
```

- [ ] **Step 3: Verify it type-checks**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors referencing `fetchMatches.ts` or `useMatches.ts`

No unit test here — this is a thin wrapper over TanStack Query and `ky`; its behavior (polling only on "today", raw query result passthrough) is exercised end-to-end by Task 8's integration test via a mock.

- [ ] **Step 4: Commit**

```bash
git add src/features/matches/api/fetchMatches.ts src/features/matches/api/useMatches.ts
git commit -m "feat(matches): add fetchMatches and useMatches hook"
```

---

## Task 5: MatchCard component

**Files:**
- Create: `src/features/matches/components/MatchCard.tsx`
- Create: `src/features/matches/components/MatchCard.test.tsx`

**Interfaces:**
- Consumes: `Match` from `src/features/matches/types.ts` (Task 1)
- Produces: `MatchCard({ match }: { match: Match })` React component — `MatchList` (Task 6) renders one per match.

This component covers every visual state from the design doc: live, finished (winner/loser score color), upcoming, and cancelled/postponed.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/matches/components/MatchCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchCard } from './MatchCard';
import type { Match } from '../types';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 'm1',
    league: 'LCK',
    teams: [
      { id: 't1', name: 'T1' },
      { id: 't2', name: 'GEN' },
    ],
    kickoffAt: '2026-08-17T05:00:00Z',
    isLive: false,
    seriesFormat: 'Bo5',
    ...overrides,
  };
}

describe('MatchCard', () => {
  it('renders team names, league, and series format', () => {
    render(<MatchCard match={makeMatch({})} />);
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('GEN')).toBeInTheDocument();
    expect(screen.getByText('LCK')).toBeInTheDocument();
    expect(screen.getByText('Bo5')).toBeInTheDocument();
  });

  it('shows a LIVE badge when the match is live', () => {
    render(<MatchCard match={makeMatch({ isLive: true, score: [1, 0] })} />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('does not show a LIVE badge for a finished match', () => {
    render(<MatchCard match={makeMatch({ isLive: false, score: [2, 1] })} />);
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
  });

  it('renders both scores with equal color when live (no winner yet)', () => {
    render(<MatchCard match={makeMatch({ isLive: true, score: [1, 0] })} />);
    const winnerScore = screen.getByTestId('score-team-0');
    const loserScore = screen.getByTestId('score-team-1');
    expect(winnerScore.className).not.toContain('text-muted-soft');
    expect(loserScore.className).not.toContain('text-muted-soft');
  });

  it('dims the losing score for a finished match', () => {
    render(<MatchCard match={makeMatch({ isLive: false, score: [2, 1] })} />);
    const winnerScore = screen.getByTestId('score-team-0');
    const loserScore = screen.getByTestId('score-team-1');
    expect(winnerScore.className).not.toContain('text-muted-soft');
    expect(loserScore.className).toContain('text-muted-soft');
  });

  it('shows kickoff time instead of a score for an upcoming match', () => {
    render(<MatchCard match={makeMatch({ isLive: false, score: undefined })} />);
    expect(screen.queryByTestId('score-team-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('kickoff-time')).toBeInTheDocument();
  });

  it('shows a cancelled badge when there is no score and kickoff is in the past', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    render(
      <MatchCard
        match={makeMatch({ isLive: false, score: undefined, kickoffAt: past, status: 'cancelled' })}
      />
    );
    expect(screen.getByText(/취소|연기/)).toBeInTheDocument();
  });

  it('falls back to team initial when logoUrl is missing', () => {
    render(<MatchCard match={makeMatch({})} />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- MatchCard`
Expected: FAIL with "Cannot find module './MatchCard'"

- [ ] **Step 3: Write the implementation**

```typescript
// src/features/matches/components/MatchCard.tsx
import { cn } from '@/lib/utils';
import type { Match } from '../types';

function TeamLogo({ name, logoUrl }: { name: string; logoUrl?: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className="size-8 rounded-lg" />;
  }
  return (
    <div className="flex size-8 items-center justify-center rounded-lg bg-[color:var(--surface-strong,#f2f2f2)] text-sm font-semibold">
      {name.charAt(0)}
    </div>
  );
}

function isCancelledOrPostponed(match: Match): boolean {
  const kickoffPassed = new Date(match.kickoffAt).getTime() < Date.now();
  return !match.isLive && !match.score && kickoffPassed;
}

export function MatchCard({ match }: { match: Match }) {
  const [teamA, teamB] = match.teams;
  const cancelled = isCancelledOrPostponed(match);
  const isUpcoming = !match.isLive && !match.score && !cancelled;
  const isFinished = !match.isLive && !!match.score;

  const winnerIndex =
    isFinished && match.score ? (match.score[0] > match.score[1] ? 0 : 1) : null;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-[14px] border border-[color:var(--hairline-soft,#ebebeb)] p-4',
        'shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px,rgba(0,0,0,0.1)_0_4px_8px]',
        match.isLive && 'border-[color:var(--primary,#ff385c)]'
      )}
    >
      <div className="flex items-center justify-between text-xs text-[color:var(--muted,#6a6a6a)]">
        <span className="font-semibold">{match.league}</span>
        {match.isLive && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--primary,#ff385c)] px-2 py-0.5 text-[11px] font-bold text-white">
            <span className="size-1.5 rounded-full bg-white" />
            LIVE
          </span>
        )}
        {cancelled && (
          <span className="rounded-full bg-[color:var(--surface-strong,#f2f2f2)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--muted,#6a6a6a)]">
            {match.status === 'cancelled' ? '취소' : '연기'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <TeamLogo name={teamA.name} logoUrl={teamA.logoUrl} />
          <span className="text-sm font-semibold">{teamA.name}</span>
        </div>

        <div className="flex min-w-14 flex-col items-center gap-0.5 px-3">
          {match.score && !cancelled ? (
            <>
              <div className="flex text-[21px] font-bold tabular-nums">
                <span data-testid="score-team-0" className={cn(winnerIndex === 1 && 'text-[color:var(--muted-soft,#929292)] font-medium')}>
                  {match.score[0]}
                </span>
                <span className="mx-1 font-normal text-[color:var(--muted-soft,#929292)]">:</span>
                <span data-testid="score-team-1" className={cn(winnerIndex === 0 && 'text-[color:var(--muted-soft,#929292)] font-medium')}>
                  {match.score[1]}
                </span>
              </div>
              {match.seriesFormat && (
                <span className="text-[11px] font-semibold text-[color:var(--muted,#6a6a6a)]">
                  {match.seriesFormat}
                </span>
              )}
            </>
          ) : isUpcoming ? (
            <>
              <span data-testid="kickoff-time" className="text-lg font-bold tabular-nums">
                {new Date(match.kickoffAt).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              {match.seriesFormat && (
                <span className="text-[11px] font-semibold text-[color:var(--muted,#6a6a6a)]">
                  {match.seriesFormat}
                </span>
              )}
            </>
          ) : null}
        </div>

        <div className="flex flex-1 flex-row-reverse items-center gap-2 text-right">
          <TeamLogo name={teamB.name} logoUrl={teamB.logoUrl} />
          <span className="text-sm font-semibold">{teamB.name}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- MatchCard`
Expected: 8 tests, PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/components/MatchCard.tsx src/features/matches/components/MatchCard.test.tsx
git commit -m "feat(matches): add MatchCard with live/finished/upcoming/cancelled states"
```

---

## Task 6: MatchCardSkeleton, DateTabs, and MatchList

**Files:**
- Create: `src/features/matches/components/MatchCardSkeleton.tsx`
- Create: `src/features/matches/components/DateTabs.tsx`
- Create: `src/features/matches/components/MatchList.tsx`
- Create: `src/features/matches/components/MatchList.test.tsx`

**Interfaces:**
- Consumes: `useMatches` (Task 4), `sortMatches` (Task 3), `MatchCard` (Task 5), `Match`/`MatchesRange` (Task 1)
- Produces: `MatchList({ range }: { range: MatchesRange })`, `DateTabs({ active, onChange }: { active: MatchesRange; onChange: (r: MatchesRange) => void })` — `routes/index.tsx` (Task 8) renders both.

This task wires loading/empty/error/success states per the design doc's interaction state table.

- [ ] **Step 1: Write the skeleton component**

```typescript
// src/features/matches/components/MatchCardSkeleton.tsx
export function MatchCardSkeleton() {
  return (
    <div className="flex h-24 animate-pulse flex-col gap-2 rounded-[14px] border border-[color:var(--hairline-soft,#ebebeb)] bg-[color:var(--surface-strong,#f2f2f2)] p-4" />
  );
}
```

- [ ] **Step 2: Write DateTabs**

```typescript
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
          onClick={() => onChange(tab.value)}
          className={cn(
            'min-h-11 flex-1 border-b-2 border-transparent text-sm font-semibold text-[color:var(--muted,#6a6a6a)]',
            active === tab.value && 'border-[color:var(--primary,#ff385c)] text-[color:var(--ink,#222222)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write MatchList**

```typescript
// src/features/matches/components/MatchList.tsx
import { useMemo } from 'react';
import { useMatches } from '../api/useMatches';
import { sortMatches } from '../utils/sortMatches';
import { MatchCard } from './MatchCard';
import { MatchCardSkeleton } from './MatchCardSkeleton';
import type { MatchesRange } from '../types';

export function MatchList({ range }: { range: MatchesRange }) {
  const { data, isLoading, isError, refetch } = useMatches(range);

  const sorted = useMemo(() => sortMatches(data ?? [], range), [data, range]);

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
      <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-[color:var(--muted,#6a6a6a)]">
        <p>경기 정보를 불러오지 못했어요.</p>
        <button
          type="button"
          onClick={() => refetch()}
          className="min-h-11 rounded-lg border border-[color:var(--ink,#222222)] px-4 text-sm font-medium text-[color:var(--ink,#222222)]"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-[color:var(--muted,#6a6a6a)]">
        예정된 경기가 없어요
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-4">
      {sorted.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
```

Note: sorting happens on every render from `data`, not on the previously-rendered order — this is the "instant reposition on next fetch" behavior the design doc specifies for v1 (no animation, no mid-scroll interpolation).

- [ ] **Step 4: Write the failing integration test**

```typescript
// src/features/matches/components/MatchList.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MatchList } from './MatchList';
import * as useMatchesModule from '../api/useMatches';
import type { Match } from '../types';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 'm1',
    league: 'LCK',
    teams: [
      { id: 't1', name: 'T1' },
      { id: 't2', name: 'GEN' },
    ],
    kickoffAt: '2026-08-17T05:00:00Z',
    isLive: false,
    ...overrides,
  };
}

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('MatchList', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows skeletons while loading', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="today" />);
    expect(screen.getAllByRole('generic').length).toBeGreaterThan(0);
  });

  it('shows the empty state when there are no matches', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="upcoming" />);
    expect(screen.getByText('예정된 경기가 없어요')).toBeInTheDocument();
  });

  it('shows the error state with a working retry button', async () => {
    const refetch = vi.fn();
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="today" />);
    const retryButton = screen.getByText('다시 시도');
    retryButton.click();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('reorders a match from live-pinned to time-sorted position after a poll updates its status', async () => {
    const live = makeMatch({ id: 'now-finished', kickoffAt: '2026-08-17T02:00:00Z', isLive: true, score: [1, 0] });
    const upcoming = makeMatch({ id: 'upcoming', kickoffAt: '2026-08-17T09:00:00Z', isLive: false });

    const spy = vi.spyOn(useMatchesModule, 'useMatches');

    spy.mockReturnValue({
      data: [upcoming, live],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    const { rerender } = renderWithClient(<MatchList range="today" />);

    let cards = screen.getAllByTestId(/score-team-0|kickoff-time/);
    expect(cards[0]).toHaveTextContent('1');

    const finished = { ...live, isLive: false, score: [1, 0] as [number, number] };
    spy.mockReturnValue({
      data: [finished, upcoming],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MatchList range="today" />
      </QueryClientProvider>
    );

    await waitFor(() => {
      cards = screen.getAllByTestId(/score-team-0|kickoff-time/);
      expect(cards[0]).toHaveAttribute('data-testid', 'kickoff-time');
    });
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npm run test -- MatchList`
Expected: FAIL — module not found or component not exported

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -- MatchList`
Expected: 4 tests, PASS

- [ ] **Step 7: Commit**

```bash
git add src/features/matches/components/MatchCardSkeleton.tsx src/features/matches/components/DateTabs.tsx src/features/matches/components/MatchList.tsx src/features/matches/components/MatchList.test.tsx
git commit -m "feat(matches): add MatchList orchestrating loading/empty/error/success states"
```

---

## Task 7: Header + HamburgerMenu

**Files:**
- Create: `src/components/layout/Header.tsx`
- Create: `src/components/layout/HamburgerMenu.tsx`
- Create: `src/components/layout/Header.test.tsx`

**Interfaces:**
- Consumes: `Button` from `src/components/ui/button.tsx` (existing shadcn component)
- Produces: `Header()` React component — `routes/index.tsx` (Task 8) renders it at the top of the page.

Menu content is out of scope per the design doc — this is the trigger UI only.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/layout/Header.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from './Header';

describe('Header', () => {
  it('renders the LoL View wordmark', () => {
    render(<Header />);
    expect(screen.getByText('LoL View')).toBeInTheDocument();
  });

  it('opens the hamburger menu on click', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByRole('button', { name: /메뉴/i }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- Header`
Expected: FAIL — module not found

- [ ] **Step 3: Write HamburgerMenu**

```typescript
// src/components/layout/HamburgerMenu.tsx
export function HamburgerMenu({ open }: { open: boolean }) {
  if (!open) return null;

  return (
    <div role="menu" className="absolute top-14 right-0 w-48 rounded-lg border border-[color:var(--hairline,#dddddd)] bg-white p-2 shadow-lg">
      {/* Menu content deferred — trigger UI only per design doc scope */}
    </div>
  );
}
```

- [ ] **Step 4: Write Header**

```typescript
// src/components/layout/Header.tsx
import { useState } from 'react';
import { HamburgerMenu } from './HamburgerMenu';

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative flex h-14 items-center justify-between border-b border-[color:var(--hairline,#dddddd)] px-4">
      <span className="text-lg font-bold">LoL View</span>
      <button
        type="button"
        aria-label="메뉴"
        onClick={() => setMenuOpen((prev) => !prev)}
        className="flex size-11 flex-col items-center justify-center gap-1"
      >
        <span className="h-0.5 w-4.5 rounded-full bg-[color:var(--ink,#222222)]" />
        <span className="h-0.5 w-4.5 rounded-full bg-[color:var(--ink,#222222)]" />
        <span className="h-0.5 w-4.5 rounded-full bg-[color:var(--ink,#222222)]" />
      </button>
      <HamburgerMenu open={menuOpen} />
    </header>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- Header`
Expected: 2 tests, PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Header.tsx src/components/layout/HamburgerMenu.tsx src/components/layout/Header.test.tsx
git commit -m "feat(layout): add Header with hamburger menu trigger"
```

---

## Task 8: Router/Query bootstrap and route wiring

**Files:**
- Modify: `src/main.tsx`
- Create: `src/routes/__root.tsx`
- Create: `src/routes/index.tsx`

**Interfaces:**
- Consumes: `Header` (Task 7), `DateTabs` + `MatchList` (Task 6)
- Produces: the running application — nothing downstream consumes this, it's the top of the tree.

This is the task that makes everything else actually render. Nothing before this point is reachable in a browser.

- [ ] **Step 1: Write the root route**

```typescript
// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => <Outlet />,
});
```

- [ ] **Step 2: Write the index route with tab state**

```typescript
// src/routes/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '@/components/layout/Header';
import { DateTabs } from '@/features/matches/components/DateTabs';
import { MatchList } from '@/features/matches/components/MatchList';
import type { MatchesRange } from '@/features/matches/types';

type SearchParams = { range?: MatchesRange };

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    range:
      search.range === 'yesterday' || search.range === 'today' || search.range === 'upcoming'
        ? search.range
        : undefined,
  }),
  component: HomePage,
});

function HomePage() {
  const { range = 'today' } = Route.useSearch();
  const navigate = useNavigate({ from: '/' });

  const handleChange = (next: MatchesRange) => {
    navigate({ search: { range: next } });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <Header />
      <DateTabs active={range} onChange={handleChange} />
      <MatchList range={range} />
    </div>
  );
}
```

- [ ] **Step 3: Wire the router and query client in main.tsx**

Read the current content of `src/main.tsx` first, then replace it entirely:

```typescript
// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import './index.css';

const queryClient = new QueryClient();
const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
```

Note: `routeTree.gen.ts` is generated by the TanStack Router Vite plugin. If the plugin is not yet configured in `vite.config.ts`, add it:

```typescript
// vite.config.ts — add this import and plugin entry
import { tanstackRouter } from '@tanstack/router-plugin/vite';

// inside plugins array, BEFORE react():
tanstackRouter({ target: 'react', autoCodeSplitting: true }),
```

- [ ] **Step 4: Delete the old boilerplate App.tsx and App.css (no longer used)**

```bash
rm src/App.tsx src/App.css
```

- [ ] **Step 5: Verify the app runs**

Run: `npm run dev`
Expected: dev server starts without errors; opening the printed localhost URL shows the header, tabs, and either match cards, a loading skeleton, an empty state, or an error state with a retry button (depending on whether the backend at `localhost:9031` is reachable).

- [ ] **Step 6: Verify the full test suite passes**

Run: `npm run test`
Expected: all test files PASS

- [ ] **Step 7: Verify the type check passes**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add src/main.tsx src/routes/__root.tsx src/routes/index.tsx vite.config.ts
git rm src/App.tsx src/App.css
git commit -m "feat: wire router and query client, remove boilerplate App"
```

---

## Self-Review Notes

**Spec coverage:** Every UI rule in `docs/designs/lol-match-viewer.md` maps to a task — default tab (Task 8), live-first sort (Task 3), score color dimming (Task 5), cancelled/postponed badge (Task 5), LIVE badge styling (Task 5), property-card token reuse (Task 5), loading/empty/error states (Task 6), touch targets (Task 6/7), header wordmark + hamburger trigger (Task 7), router/query bootstrap (Task 8). Framer Motion reorder animation and tablet/desktop responsive layout are explicitly out of scope per the spec's Next Steps and TODOS.md — not included here.

**Type consistency:** `Match`, `Team`, `MatchesRange` are defined once in Task 1 and imported everywhere else — no redefinition. `useMatches` return shape (`{ data, isLoading, isError, refetch }`) is the raw TanStack Query result per the spec's explicit decision (Code Quality Issue 5) — Task 6's mocks match this shape exactly.

**Backend schema risk:** Task 1 attempts a live probe but falls back to the assumed shape if the backend isn't running — this matches TODOS.md's "백엔드 응답 스키마 확정 후 가정 타입 갱신" item, which stays open after this plan regardless of Task 1's outcome. If Task 1's probe succeeds with different field names than assumed, the executor must propagate those names through Tasks 3-6 instead of the placeholders shown here.
