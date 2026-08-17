# Real Backend Schema Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the guessed `Match`/`Team` types and all logic that depends on them with the real backend response shape, confirmed live against `GET /matches?range=today|yesterday|upcoming` through the working dev proxy.

**Architecture:** This is a type-and-logic migration, not a new feature. The tab → API wiring (`DateTabs` → `routes/index.tsx` → `MatchList` → `useMatches` → `fetchMatches`) already works end-to-end and needs no changes. Everything that reads match fields (`sortMatches`, `MatchCard`) needs its field names and assumptions corrected to match reality, and `MatchCard` additionally needs a new rendering branch for matches with no assigned teams yet.

**Tech Stack:** TypeScript, React 19, Vitest + Testing Library, TanStack Query.

**Spec:** `docs/designs/lol-match-viewer.md` (original design doc — describes UI rules that still apply; field names in its "API 응답 타입 (가정)" section are now superseded by this plan) and `TODOS.md`'s "백엔드 응답 스키마 확정" item (T0.5 — this plan closes that TODO).

## Global Constraints

- Backend is confirmed live and camelCase, verified via `curl http://localhost:5176/api/matches?range=<today|yesterday|upcoming>` against the real dev proxy (`.env.dev` → `VITE_API_TARGET=http://localhost:9031`).
- Confirmed response shape (exact, from live data — not a guess):
  ```json
  {
    "id": 9003,
    "startTime": "2026-08-17T04:00:00+09:00",
    "matchState": "SCHEDULED",
    "matchLabel": "Week 1 Day 2",
    "clubs": [
      { "name": "Dplus Kia", "logoUrl": "http://...", "score": 0 },
      { "name": "Nongshim RedForce", "logoUrl": "http://...", "score": 0 }
    ]
  }
  ```
- `id` is `number`, not `string`.
- `matchState` observed values: `"SCHEDULED"`, `"FINISHED"`, `"ONGOING"`. No `CANCELLED`/`POSTPONED` value has been observed in live data, but the field is a string enum on the backend — model it as an open string union with the 3 known values plus a fallback, not a closed union, so an unrecognized future value doesn't crash rendering.
- `clubs` is an array with **exactly 0 or 2 elements** in observed data (confirmed via a distribution check across all 3 ranges: `{0: N, 2: M}`, never `1`). Never assume `clubs[0]`/`clubs[1]` exist without checking `clubs.length === 2` first.
- Each club's `score` is always a `number` (never `undefined`) — even `SCHEDULED` matches send `score: 0`. Do not use "score is present" as a proxy for "match has started"; use `matchState` instead.
- No `league` field exists. Per explicit user instruction, use `matchLabel` in its place (e.g. "Week 1 Day 2", "13주 차") — do not invent a league name.
- No `seriesFormat` field exists in the confirmed response. Remove it from the type; do not render it (there is nothing to render).
- Live/pinning logic: `isLive` is derived, not a backend field. `isLive = matchState === 'ONGOING'`.
- `id` uniqueness: `Match.id` is the join key (`key={match.id}` in `MatchList`); `Club` has no `id` field at all — do not add one, key club-related rendering (`teamA`/`teamB` display) positionally, not by a club id.

---

## File Structure

```
src/features/matches/
  types.ts                        [MODIFY] Match/Club shape → real backend fields
  utils/
    sortMatches.ts                [MODIFY] isLive → matchState derivation
    sortMatches.test.ts           [MODIFY] fixtures use matchState/clubs/startTime
  api/
    fetchMatches.ts               [no change — already generic over Match]
    useMatches.ts                 [no change — already generic over Match]
  components/
    MatchCard.tsx                 [MODIFY] clubs array, matchLabel, matchState branching, TBD-teams state
    MatchCard.test.tsx            [MODIFY] fixtures + new "no clubs assigned" test
    MatchList.tsx                 [no change — already generic, but test fixtures need updating]
    MatchList.test.tsx            [MODIFY] fixtures use matchState/clubs/startTime
```

`fetchMatches.ts` and `useMatches.ts` need zero code changes — they're already `Match`-shape-agnostic (`fetchMatches` returns `Match[]`, `useMatches` wraps it in a query). Once `types.ts` changes, they pick up the new shape automatically. `MatchList.tsx` similarly has zero *production* code changes needed (it never touches individual match fields, only `data`, `range`, and `match.id` for the `key` prop, and `number` works fine as a React key) — but its test fixtures use the old shape and must be updated so the suite compiles and passes.

---

## Task 1: Match/Club types — real backend shape

**Files:**
- Modify: `src/features/matches/types.ts`

**Interfaces:**
- Produces: `Match` (fields: `id: number`, `startTime: string`, `matchState: MatchState`, `matchLabel: string`, `clubs: Club[]`), `Club` (fields: `name: string`, `logoUrl: string`, `score: number`), `MatchState` (`'SCHEDULED' | 'FINISHED' | 'ONGOING' | (string & {})`), `MatchesRange` (unchanged: `'yesterday' | 'today' | 'upcoming'`) — every later task imports these from this file.

This task has no test cycle of its own (pure type definitions, no runtime behavior) — but it gates every other task, so it happens first.

- [ ] **Step 1: Replace the type definitions**

Replace the entire contents of `src/features/matches/types.ts`:

```typescript
// src/features/matches/types.ts

export type MatchesRange = "yesterday" | "today" | "upcoming";

/**
 * Confirmed live against GET /matches?range=today|yesterday|upcoming
 * (2026-08-17). Only "SCHEDULED" | "FINISHED" | "ONGOING" have been
 * observed. Modeled as an open union (not a closed one) because
 * matchState is a backend string enum — an unrecognized future value
 * (e.g. a cancellation status) must not fail to type-check or crash
 * rendering; it should fall through to a safe default instead.
 */
export type MatchState = "SCHEDULED" | "FINISHED" | "ONGOING" | (string & {});

export interface Club {
  name: string;
  logoUrl: string;
  /** Always present as a number, even for SCHEDULED matches (score: 0). */
  score: number;
}

export interface Match {
  id: number;
  /** ISO 8601 with timezone offset, e.g. "2026-08-17T04:00:00+09:00". */
  startTime: string;
  matchState: MatchState;
  /** No "league" field exists on the backend. matchLabel stands in for it (e.g. "Week 1 Day 2"). */
  matchLabel: string;
  /**
   * Exactly 0 or 2 elements in observed data — never 1. A 0-length array
   * means the match's teams have not been assigned yet (e.g. a bracket
   * slot still TBD). Always check `clubs.length === 2` before indexing.
   */
  clubs: Club[];
}
```

- [ ] **Step 2: Verify the file type-checks**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: errors in every file that still references the old shape (`league`, `teams`, `kickoffAt`, `isLive`, `score` at the Match level, `seriesFormat`, `status`) — this is expected at this point; those get fixed in Tasks 2 and 4. Confirm the errors are ONLY in `sortMatches.ts`, `sortMatches.test.ts`, `MatchCard.tsx`, `MatchCard.test.tsx`, `MatchList.test.tsx` — no errors in `fetchMatches.ts`, `useMatches.ts`, or `MatchList.tsx` (confirming those files are genuinely shape-agnostic as expected).

- [ ] **Step 3: Commit**

```bash
git add src/features/matches/types.ts
git commit -m "feat(matches): replace guessed types with confirmed backend schema

Backend confirmed live via GET /matches?range=today|yesterday|upcoming:
id is number, no league field (matchLabel instead), teams live under
clubs[] (0 or 2 elements, never 1), isLive is derived from
matchState === 'ONGOING', no seriesFormat field exists."
```

---

## Task 2: sortMatches — matchState-derived live pinning

**Files:**
- Modify: `src/features/matches/utils/sortMatches.ts`
- Modify: `src/features/matches/utils/sortMatches.test.ts`

**Interfaces:**
- Consumes: `Match`, `MatchesRange` from `src/features/matches/types.ts` (Task 1)
- Produces: `sortMatches(matches: Match[], range: MatchesRange): Match[]` — unchanged signature. `MatchList` (unmodified) continues to call this exactly as before.

- [ ] **Step 1: Rewrite the test fixtures and assertions to use the real shape**

Replace the entire contents of `src/features/matches/utils/sortMatches.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { sortMatches } from './sortMatches';
import type { Match } from '../types';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 1,
    matchLabel: 'Week 1 Day 2',
    startTime: '2026-08-17T05:00:00Z',
    matchState: 'SCHEDULED',
    clubs: [
      { name: 'T1', logoUrl: 'https://example.com/t1.png', score: 0 },
      { name: 'GEN', logoUrl: 'https://example.com/gen.png', score: 0 },
    ],
    ...overrides,
  };
}

describe('sortMatches', () => {
  it('sorts today matches by kickoff time when none are live', () => {
    const later = makeMatch({ id: 2, startTime: '2026-08-17T08:00:00Z' });
    const earlier = makeMatch({ id: 1, startTime: '2026-08-17T05:00:00Z' });
    const result = sortMatches([later, earlier], 'today');
    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });

  it('pins the single ongoing match to the top regardless of kickoff time', () => {
    const finished = makeMatch({ id: 1, startTime: '2026-08-17T02:00:00Z', matchState: 'FINISHED' });
    const ongoing = makeMatch({ id: 2, startTime: '2026-08-17T09:00:00Z', matchState: 'ONGOING' });
    const scheduled = makeMatch({ id: 3, startTime: '2026-08-17T12:00:00Z', matchState: 'SCHEDULED' });
    const result = sortMatches([finished, scheduled, ongoing], 'today');
    expect(result.map((m) => m.id)).toEqual([2, 1, 3]);
  });

  it('sorts multiple ongoing matches among themselves by kickoff time', () => {
    const ongoingLater = makeMatch({ id: 1, startTime: '2026-08-17T09:00:00Z', matchState: 'ONGOING' });
    const ongoingEarlier = makeMatch({ id: 2, startTime: '2026-08-17T07:00:00Z', matchState: 'ONGOING' });
    const result = sortMatches([ongoingLater, ongoingEarlier], 'today');
    expect(result.map((m) => m.id)).toEqual([2, 1]);
  });

  it('ignores matchState on yesterday and upcoming tabs, sorting by kickoff time only', () => {
    const flaggedOngoing = makeMatch({ id: 1, startTime: '2026-08-16T09:00:00Z', matchState: 'ONGOING' });
    const normal = makeMatch({ id: 2, startTime: '2026-08-16T05:00:00Z', matchState: 'FINISHED' });
    const result = sortMatches([flaggedOngoing, normal], 'yesterday');
    expect(result.map((m) => m.id)).toEqual([2, 1]);
  });

  it('treats an unrecognized matchState value as not-live (defensive default)', () => {
    const unknownState = makeMatch({ id: 1, startTime: '2026-08-17T02:00:00Z', matchState: 'CANCELLED' });
    const scheduled = makeMatch({ id: 2, startTime: '2026-08-17T09:00:00Z', matchState: 'SCHEDULED' });
    const result = sortMatches([scheduled, unknownState], 'today');
    // Neither is ONGOING, so plain kickoff-ascending order applies — id 1 (02:00) before id 2 (09:00).
    expect(result.map((m) => m.id)).toEqual([1, 2]);
  });

  it('returns an empty array unchanged', () => {
    expect(sortMatches([], 'today')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/matches/utils/sortMatches.test.ts`
Expected: FAIL — `sortMatches.ts` still reads `m.isLive` and `a.kickoffAt`/`b.kickoffAt`, which no longer exist on `Match` (TypeScript compile error surfaces as a test failure under Vitest's type-aware transform, or the tests run against `undefined` fields and produce wrong orderings — either way, not all 6 pass).

- [ ] **Step 3: Rewrite the implementation**

Replace the entire contents of `src/features/matches/utils/sortMatches.ts`:

```typescript
import type { Match, MatchesRange } from '../types';

function isOngoing(match: Match): boolean {
  return match.matchState === 'ONGOING';
}

export function sortMatches(matches: Match[], range: MatchesRange): Match[] {
  const byKickoffAsc = (a: Match, b: Match) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime();

  if (range !== 'today') {
    return [...matches].sort(byKickoffAsc);
  }

  const ongoing = matches.filter(isOngoing).sort(byKickoffAsc);
  const rest = matches.filter((m) => !isOngoing(m)).sort(byKickoffAsc);

  return [...ongoing, ...rest];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/matches/utils/sortMatches.test.ts`
Expected: 6 tests, PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/utils/sortMatches.ts src/features/matches/utils/sortMatches.test.ts
git commit -m "feat(matches): derive live-pinning from matchState === ONGOING

isLive was never a real backend field. sortMatches now checks
matchState directly and sorts by startTime instead of the old
kickoffAt field name."
```

---

## Task 3: MatchCard — clubs array, matchLabel, matchState branching

**Files:**
- Modify: `src/features/matches/components/MatchCard.tsx`
- Modify: `src/features/matches/components/MatchCard.test.tsx`

**Interfaces:**
- Consumes: `Match`, `Club` from `src/features/matches/types.ts` (Task 1)
- Produces: `MatchCard({ match }: { match: Match })` — unchanged signature. `MatchList` (unmodified) continues to render `<MatchCard key={match.id} match={match} />` exactly as before; `match.id` is now `number`, which is a valid React key.

This is the largest change in the plan. Four things change: (1) `match.league` → `match.matchLabel`, (2) `match.teams` (fixed 2-tuple) → `match.clubs` (0 or 2 elements — needs a new empty-state branch), (3) live/status detection switches from the old `isLive`/`score`-presence heuristic to `matchState` directly, (4) `seriesFormat` is removed entirely (no field to render).

- [ ] **Step 1: Rewrite the test fixtures and add the new "no clubs assigned" test**

Replace the entire contents of `src/features/matches/components/MatchCard.test.tsx`:

```typescript
// src/features/matches/components/MatchCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MatchCard } from './MatchCard';
import type { Match } from '../types';

function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 1,
    matchLabel: 'Week 1 Day 2',
    startTime: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    matchState: 'SCHEDULED',
    clubs: [
      { name: 'T1', logoUrl: '', score: 0 },
      { name: 'GEN', logoUrl: '', score: 0 },
    ],
    ...overrides,
  };
}

describe('MatchCard', () => {
  it('renders team names and matchLabel', () => {
    render(<MatchCard match={makeMatch({})} />);
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('GEN')).toBeInTheDocument();
    expect(screen.getByText('Week 1 Day 2')).toBeInTheDocument();
  });

  it('shows a LIVE badge when matchState is ONGOING', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'ONGOING',
          clubs: [
            { name: 'T1', logoUrl: '', score: 1 },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
      />
    );
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('does not show a LIVE badge for a finished match', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'FINISHED',
          clubs: [
            { name: 'T1', logoUrl: '', score: 2 },
            { name: 'GEN', logoUrl: '', score: 1 },
          ],
        })}
      />
    );
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
  });

  it('renders both scores with equal color when ongoing (no winner yet)', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'ONGOING',
          clubs: [
            { name: 'T1', logoUrl: '', score: 1 },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
      />
    );
    const winnerScore = screen.getByTestId('score-team-0');
    const loserScore = screen.getByTestId('score-team-1');
    expect(winnerScore.className).not.toContain('text-[color:var(--muted-soft');
    expect(loserScore.className).not.toContain('text-[color:var(--muted-soft');
  });

  it('dims the losing score for a finished match', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'FINISHED',
          clubs: [
            { name: 'T1', logoUrl: '', score: 2 },
            { name: 'GEN', logoUrl: '', score: 1 },
          ],
        })}
      />
    );
    const winnerScore = screen.getByTestId('score-team-0');
    const loserScore = screen.getByTestId('score-team-1');
    expect(winnerScore.className).not.toContain('text-[color:var(--muted-soft');
    expect(loserScore.className).toContain('text-[color:var(--muted-soft');
  });

  it('shows kickoff time instead of a score for a scheduled match', () => {
    render(<MatchCard match={makeMatch({ matchState: 'SCHEDULED' })} />);
    expect(screen.queryByTestId('score-team-0')).not.toBeInTheDocument();
    expect(screen.getByTestId('kickoff-time')).toBeInTheDocument();
  });

  it('shows a fallback state when clubs is empty (teams not yet assigned)', () => {
    render(
      <MatchCard
        match={makeMatch({ matchState: 'SCHEDULED', clubs: [] })}
      />
    );
    expect(screen.getByText('대진 미정')).toBeInTheDocument();
    expect(screen.queryByTestId('score-team-0')).not.toBeInTheDocument();
  });

  it('falls back to team initial when logoUrl is empty', () => {
    render(<MatchCard match={makeMatch({})} />);
    expect(screen.getByText('T')).toBeInTheDocument();
  });

  it('treats an unrecognized matchState as not-live and not-finished (falls back to scheduled rendering)', () => {
    render(
      <MatchCard
        match={makeMatch({
          matchState: 'CANCELLED',
          clubs: [
            { name: 'T1', logoUrl: '', score: 0 },
            { name: 'GEN', logoUrl: '', score: 0 },
          ],
        })}
      />
    );
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument();
    expect(screen.getByTestId('kickoff-time')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/features/matches/components/MatchCard.test.tsx`
Expected: FAIL — current implementation destructures `match.teams` (doesn't exist), reads `match.league` (doesn't exist), and has no "대진 미정" branch.

- [ ] **Step 3: Rewrite the implementation**

Replace the entire contents of `src/features/matches/components/MatchCard.tsx`:

```typescript
// src/features/matches/components/MatchCard.tsx
import { cn } from '@/lib/utils';
import type { Club, Match } from '../types';

function TeamLogo({ name, logoUrl }: { name: string; logoUrl: string }) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className="size-8 rounded-lg" />;
  }
  return (
    <div className="flex size-8 items-center justify-center rounded-lg bg-[color:var(--surface-strong,#f2f2f2)] text-sm font-semibold">
      {name.charAt(0)}
    </div>
  );
}

function TeamSlot({ club, align }: { club: Club; align: 'left' | 'right' }) {
  return (
    <div
      className={cn(
        'flex flex-1 items-center gap-2',
        align === 'right' && 'flex-row-reverse text-right'
      )}
    >
      <TeamLogo name={club.name} logoUrl={club.logoUrl} />
      <span className="text-sm font-semibold">{club.name}</span>
    </div>
  );
}

export function MatchCard({ match }: { match: Match }) {
  const isOngoing = match.matchState === 'ONGOING';
  const isFinished = match.matchState === 'FINISHED';
  const hasTeams = match.clubs.length === 2;

  const [clubA, clubB] = hasTeams ? match.clubs : [];

  const winnerIndex =
    isFinished && clubA && clubB
      ? clubA.score > clubB.score
        ? 0
        : 1
      : null;

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-[14px] border border-[color:var(--hairline-soft,#ebebeb)] p-4',
        'shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px,rgba(0,0,0,0.1)_0_4px_8px]',
        isOngoing && 'border-[color:var(--brand-rausch,#ff385c)]'
      )}
    >
      <div className="flex items-center justify-between text-xs text-[color:var(--muted-ink,#6a6a6a)]">
        <span className="font-semibold">{match.matchLabel}</span>
        {isOngoing && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-rausch,#ff385c)] px-2 py-0.5 text-[11px] font-bold text-white">
            <span className="size-1.5 rounded-full bg-white" />
            LIVE
          </span>
        )}
      </div>

      {!hasTeams ? (
        <div className="py-2 text-center text-sm text-[color:var(--muted-ink,#6a6a6a)]">
          대진 미정
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <TeamSlot club={clubA!} align="left" />

          <div className="flex min-w-14 flex-col items-center gap-0.5 px-3">
            {isFinished || isOngoing ? (
              <div className="flex text-[21px] font-bold tabular-nums">
                <span
                  data-testid="score-team-0"
                  className={winnerIndex === 1 ? 'text-[color:var(--muted-soft,#929292)] font-medium' : ''}
                >
                  {clubA!.score}
                </span>
                <span className="mx-1 font-normal text-[color:var(--muted-soft,#929292)]">:</span>
                <span
                  data-testid="score-team-1"
                  className={winnerIndex === 0 ? 'text-[color:var(--muted-soft,#929292)] font-medium' : ''}
                >
                  {clubB!.score}
                </span>
              </div>
            ) : (
              <span data-testid="kickoff-time" className="text-lg font-bold tabular-nums">
                {new Date(match.startTime).toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>

          <TeamSlot club={clubB!} align="right" />
        </div>
      )}
    </div>
  );
}
```

Note on the `TeamSlot` extraction: the old code duplicated the team-logo-plus-name markup twice inline (once per side, with `flex-row-reverse` swapped in for the right side). This plan extracts it into a small local component because the duplication was about to grow a third distinct branch (empty-clubs case) — pulling it out now keeps `MatchCard`'s main return readable. This is not scope creep; it's the same rendering logic the original had, just named and de-duplicated per this plan's DRY requirement.

Note on `isFinished || isOngoing` as the score-vs-kickoff-time branch condition: a `SCHEDULED` match, or a match with any unrecognized `matchState` value (the open-union fallback case), both fall through to the kickoff-time branch. This is deliberate — an unrecognized state should degrade to "look like an upcoming match" rather than crash or silently show a wrong score.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/features/matches/components/MatchCard.test.tsx`
Expected: 9 tests, PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/components/MatchCard.tsx src/features/matches/components/MatchCard.test.tsx
git commit -m "feat(matches): render clubs[] shape, matchLabel, matchState branching

- match.teams (fixed tuple) -> match.clubs (0 or 2 elements); added a
  '대진 미정' fallback for the 0-element case (unassigned bracket slot)
- match.league -> match.matchLabel (no league field exists)
- live/finished detection now reads matchState directly instead of the
  old isLive/score-presence heuristic
- removed seriesFormat rendering (no such field in the real response)
- extracted TeamSlot to de-duplicate the two nearly-identical team
  rendering blocks now that a third branch (no teams) exists"
```

---

## Task 4: MatchList test fixtures — align with real shape

**Files:**
- Modify: `src/features/matches/components/MatchList.test.tsx`

**Interfaces:**
- Consumes: `Match` from `src/features/matches/types.ts` (Task 1)
- Produces: nothing new — `MatchList.tsx` itself needs no production code change (confirmed in Task 1 Step 2: it never touches individual match fields beyond `match.id` for the React `key`, and `number` is a valid key type).

- [ ] **Step 1: Rewrite the test fixtures**

Replace the entire contents of `src/features/matches/components/MatchList.test.tsx`:

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
    id: 1,
    matchLabel: 'Week 1 Day 2',
    startTime: '2026-08-17T05:00:00Z',
    matchState: 'SCHEDULED',
    clubs: [
      { name: 'T1', logoUrl: '', score: 0 },
      { name: 'GEN', logoUrl: '', score: 0 },
    ],
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

  it('shows a range-specific empty state for the yesterday tab', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="yesterday" />);
    expect(screen.getByText('어제 경기가 없어요')).toBeInTheDocument();
  });

  it('shows a range-specific empty state for the today tab', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchList range="today" />);
    expect(screen.getByText('오늘 예정된 경기가 없어요')).toBeInTheDocument();
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
    // startTime values are relative to "now" so this test doesn't self-expire
    // once the system clock passes any hardcoded date (same class of bug
    // fixed in MatchCard.test.tsx during a prior fix round).
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

    spy.mockReturnValue({
      data: [scheduled, ongoing],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    const { rerender } = renderWithClient(<MatchList range="today" />);

    let cards = screen.getAllByTestId(/score-team-0|kickoff-time/);
    expect(cards[0]).toHaveTextContent('1');

    const finished = { ...ongoing, matchState: 'FINISHED' as const };
    spy.mockReturnValue({
      data: [finished, scheduled],
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

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/features/matches/components/MatchList.test.tsx`
Expected: 6 tests, PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/matches/components/MatchList.test.tsx
git commit -m "test(matches): update MatchList fixtures to real backend shape

MatchList.tsx itself needs no production changes — it only reads
match.id (now number, still a valid React key) and forwards range/data
to sortMatches/MatchCard, both already migrated. This commit only
updates the mock Match objects the tests construct."
```

---

## Task 5: Full-suite verification + live backend check

**Files:** none (verification only)

**Interfaces:** none — this task confirms the prior 4 tasks integrate correctly, both in the test suite and against the real running backend.

- [ ] **Step 1: Run the full test suite**

Run: `pnpm run test`
Expected: all test files PASS (sortMatches: 6, MatchCard: 9, MatchList: 6, Header: whatever it already had — total should be higher than the pre-migration count since Task 2 and Task 3 each added a new test case).

- [ ] **Step 2: Run the type check**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors anywhere in the repo (confirms no stale references to `league`, `teams`, `kickoffAt`, `isLive`, `seriesFormat`, or `status` remain in any file).

- [ ] **Step 3: Run the production build**

Run: `npx vite build --mode prd`
Expected: builds successfully.

- [ ] **Step 4: Start the dev server and confirm the real backend renders correctly**

```bash
pnpm run dev
```

Note the printed port (Vite auto-increments if 5173+ are already in use — check the terminal output for the actual port, e.g. `5173`, `5174`, etc.)

In a separate terminal, hit all three ranges through the dev proxy and spot-check the response shape one more time (this re-confirms Task 1's assumed schema against live data, closing the loop TODOS.md's T0.5 item was tracking):

```bash
curl -s 'http://localhost:<PORT>/api/matches?range=today' | head -c 500
curl -s 'http://localhost:<PORT>/api/matches?range=yesterday' | head -c 500
curl -s 'http://localhost:<PORT>/api/matches?range=upcoming' | head -c 500
```

Expected: valid JSON with `id` (number), `startTime`, `matchState`, `matchLabel`, `clubs` fields on each object — matching the shape in this plan's Global Constraints section.

Then open the app in a browser at `http://localhost:<PORT>` and manually verify:
- 오늘 탭 (default): any `ONGOING` match shows a LIVE badge and is pinned above others regardless of kickoff time; `FINISHED` matches show scores with the losing side dimmed; `SCHEDULED` matches show a kickoff time instead of a score
- Any match with `clubs: []` (there were several in the `upcoming` range during live testing) renders "대진 미정" instead of crashing
- 어제/예정 탭 switch correctly and show their own data without a LIVE badge or pinning
- Kill the dev server (`Ctrl+C` or `pkill -f "vite --mode dev"`) when done — do not leave it running across turns.

- [ ] **Step 5: Update TODOS.md — close the schema-confirmation item**

Read `TODOS.md`, find the "백엔드 응답 스키마 확정 후 가정 타입 갱신" section, and replace it with a short resolved note (do not delete the section — leave a record of what was found, since future maintainers may wonder why the types look the way they do):

Find this heading and its body:
```markdown
## 백엔드 응답 스키마 확정 후 가정 타입 갱신
```

Replace the entire section (from that heading through its `**Depends on / blocked by:**` line) with:

```markdown
## ~~백엔드 응답 스키마 확정 후 가정 타입 갱신~~ (해결됨 2026-08-17)

실제 백엔드 응답을 `curl`로 확인 완료. 가정과 실제가 상당히 달랐음 — `id`는 number, `league` 필드 없음(`matchLabel`로 대체), 팀 정보는 `teams` 튜플이 아니라 `clubs` 배열(0개 또는 2개, 1개는 없음), `isLive` 필드는 없고 `matchState`("SCHEDULED"|"FINISHED"|"ONGOING")로 판별, `seriesFormat` 필드 없음. `types.ts`, `sortMatches.ts`, `MatchCard.tsx`와 관련 테스트를 실제 스키마에 맞춰 전면 갱신함(`docs/superpowers/plans/2026-08-17-real-backend-schema-migration.md` 참고).

CANCELLED/POSTPONED 등 다른 `matchState` 값이 실제로 존재하는지는 여전히 미확인 — 열린 유니온 타입으로 모델링해뒀으니 나중에 관측되면 `MatchState`에 값만 추가하면 됨.
```

- [ ] **Step 6: Final commit**

```bash
git add TODOS.md
git commit -m "docs: close backend schema confirmation TODO

Real schema confirmed and migrated in the prior 4 commits. Left a
resolved note explaining what changed, since the gap between the old
guessed types and the real ones was substantial."
```

---

## Self-Review Notes

**Spec coverage:** Every field in the confirmed backend response (`id`, `startTime`, `matchState`, `matchLabel`, `clubs[].name`, `clubs[].logoUrl`, `clubs[].score`) is consumed by exactly one task. The `clubs.length === 0` case (observed in live data — 10/15 `upcoming` matches, 2/5 `yesterday` matches) gets its own explicit rendering branch in Task 3, not silently ignored. The user's two explicit instructions — "matchState ONGOING = isLive" and "matchLabel in place of league" — are both directly implemented (Task 2 Step 3, Task 3 Step 3) and directly tested (Task 2 Step 1's new test, Task 3 Step 1's fixture using `matchLabel`).

**Type consistency:** `Match`/`Club`/`MatchState` defined once in Task 1, imported by name in every later task — no redefinition anywhere. `sortMatches(matches: Match[], range: MatchesRange): Match[]` signature is unchanged from the pre-migration version, so `MatchList.tsx`'s call site needs no edit. `MatchCard({ match }: { match: Match })` signature is also unchanged. `data-testid` values (`score-team-0`, `score-team-1`, `kickoff-time`) are preserved exactly across Task 3's rewrite so Task 4's `MatchList.test.tsx` assertions (which query by these testids) continue to work without modification to the query strings themselves — only the fixture data changed.

**Scope discipline:** `fetchMatches.ts` and `useMatches.ts` are explicitly left untouched (confirmed generic over `Match` in Task 1 Step 2) rather than "improved" out of habit. No new dependencies added. No unrelated refactors — the `TeamSlot` extraction in Task 3 is scoped narrowly to the duplication this exact change introduces a third branch of, not a broader component reorganization.
