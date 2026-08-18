# Match Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a match detail modal, opened by clicking/keying a match card, showing league/match name, progress status, team logos/abbreviations, current score, and a stubbed 5-match head-to-head win/loss row — with the modal's open/closed state reflected in the URL.

**Architecture:** `MatchDetailModal` is a new sibling component under `HomePage`, controlled by a `matchId` search param. It calls `useMatches(range)` itself (sharing the TanStack Query cache key with `MatchList`, so no duplicate network request) and searches the already-loaded list for the matching `Match`. `MatchCard`'s `TeamLogo`/`TeamSlot` are extracted into a shared file so the card and the modal render team identity identically and can later share a `viewTransitionName` for a FLIP-style open transition (deferred to the final task).

**Tech Stack:** React 19, TanStack Router (file-based, `validateSearch`), TanStack Query, `@base-ui/react/dialog` (confirmed subpath export, `Dialog.Root` supports controlled `open`/`onOpenChange`), Tailwind v4, Vitest + Testing Library.

**Spec:** `docs/designs/match-detail-modal.md` (Status: APPROVED, eng-review CLEARED — see that file's `## GSTACK REVIEW REPORT`). This plan implements its "Implementation Tasks" section (T0–T7) as executable TDD steps.

## Global Constraints

- Reuse the existing `?range=` search-param pattern (`src/routes/index.tsx:11-16`) for the new `matchId` param — same whitelist-validation style, not a new pattern.
- `MatchDetailModal` must NOT introduce a second data-fetch path. It calls `useMatches(range)` with the same query key `['matches', range]` already used by `MatchList` — TanStack Query dedupes this to zero extra network requests.
- No backend work in this plan. `Club.id` and the `/head-to-head` endpoint do not exist yet — `HeadToHead` gets a type only (Task 6), no hook, no fetch call, no unused code path.
- Every task that touches `MatchCard.tsx` must leave all 12 existing tests in `MatchCard.test.tsx` passing unchanged (regression guard per the eng-review's IRON RULE finding).
- View Transitions API (Task 7) is `document.startViewTransition`-only — no manual FLIP polyfill (rejected in the design doc as more expensive than the API itself given portal + scroll-lock timing).
- Cancelled/postponed match states and TBD (`clubs.length !== 2`) matches reuse the exact same fallback rendering `MatchCard` already uses — never a new state representation.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/features/matches/test/fixtures.ts` | Create | Single `makeMatch` fixture factory, replacing 4 duplicated copies |
| `src/routes/index.tsx` | Modify | Add `matchId` to `validateSearch`; render `MatchDetailModal` |
| `src/features/matches/components/TeamLogo.tsx` | Create | `TeamLogo` + `TeamSlot`, extracted from `MatchCard.tsx`, shared by card and modal |
| `src/features/matches/components/MatchCard.tsx` | Modify | Import `TeamLogo`/`TeamSlot` instead of defining them; add interactivity (button semantics, keyboard, focus-visible) |
| `src/features/matches/components/MatchDetailModal.tsx` | Create | `base-ui` Dialog controlled by `matchId`; renders match detail body |
| `src/features/matches/components/HeadToHeadRow.tsx` | Create | 5 fixed gray dots (stub, no data dependency) |
| `src/features/matches/types.ts` | Modify | Add `HeadToHead` type |

---

### Task 0: Extract shared `makeMatch` test fixture

**Files:**
- Create: `src/features/matches/test/fixtures.ts`
- Modify: `src/features/matches/utils/sortMatches.test.ts`
- Modify: `src/features/matches/components/MatchCard.test.tsx`
- Modify: `src/features/matches/components/MatchList.test.tsx`
- Modify: `src/features/matches/utils/groupAdjacentMatches.test.ts`

**Interfaces:**
- Produces: `makeMatch(overrides: Partial<Match>): Match` — exported from `src/features/matches/test/fixtures.ts`. Default fixture: `{ id: 1, leagueName: 'LCK', matchLabel: 'Week 1 Day 2', startTime: <ISO string>, matchState: 'SCHEDULED', clubs: [{ name: 'T1', logoUrl: '', score: 0 }, { name: 'GEN', logoUrl: '', score: 0 }] }`.

This task is pure refactor (no behavior change) — it exists because a 5th duplicate of this exact factory was about to be added in Task 4's test file, crossing the threshold already flagged in `TODOS.md`.

- [ ] **Step 1: Create the shared fixture file**

```typescript
// src/features/matches/test/fixtures.ts
import type { Match } from '../types';

export function makeMatch(overrides: Partial<Match>): Match {
  return {
    id: 1,
    leagueName: 'LCK',
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
```

- [ ] **Step 2: Replace the local `makeMatch` in each of the 4 existing test files with an import**

In `src/features/matches/utils/sortMatches.test.ts`, `src/features/matches/components/MatchCard.test.tsx`, `src/features/matches/components/MatchList.test.tsx`, and `src/features/matches/utils/groupAdjacentMatches.test.ts`:

Delete the local `function makeMatch(overrides: Partial<Match>): Match { ... }` block in each file, and add:

```typescript
import { makeMatch } from '../test/fixtures';
```

(Adjust the relative path per file location — `utils/*.test.ts` uses `../test/fixtures`, `components/*.test.tsx` uses `../test/fixtures`.)

**Note:** `MatchCard.test.tsx` and `MatchList.test.tsx` each used a *slightly different* default `startTime` (one relative-to-now, one hardcoded ISO). Standardize on the relative-to-now version above (matches the comment already in `MatchList.test.tsx:98-100` explaining why: hardcoded dates self-expire once the system clock passes them). Re-check any test that asserted on the exact hardcoded `startTime` value — none currently do (all assert on relative ordering or `id`/`matchState`).

- [ ] **Step 3: Run the full test suite to verify nothing broke**

Run: `npm test`
Expected: All existing tests pass unchanged (this step verifies the refactor introduced zero behavior change before any new feature code is added).

- [ ] **Step 4: Commit**

```bash
git add src/features/matches/test/fixtures.ts src/features/matches/utils/sortMatches.test.ts src/features/matches/components/MatchCard.test.tsx src/features/matches/components/MatchList.test.tsx src/features/matches/utils/groupAdjacentMatches.test.ts
git commit -m "test(matches): extract makeMatch fixture to shared test/fixtures.ts"
```

---

### Task 1: Add `matchId` to route search params

**Files:**
- Modify: `src/routes/index.tsx`

**Interfaces:**
- Consumes: existing `SearchParams` type at `src/routes/index.tsx:8`.
- Produces: `Route.useSearch()` now returns `{ range?: MatchesRange; matchId?: number }`. Task 3 and Task 4 read `search.matchId` and call `navigate({ search: { ...prev, matchId: ... } })`.

- [ ] **Step 1: Write the failing test**

Create `src/routes/index.test.tsx` (new file — no route-level test exists yet):

```typescript
// src/routes/index.test.tsx
import { describe, it, expect } from 'vitest';
import { Route } from './index';

describe('index route validateSearch', () => {
  it('parses a numeric matchId string into a number', () => {
    const result = Route.options.validateSearch({ matchId: '123' });
    expect(result.matchId).toBe(123);
  });

  it('treats a non-numeric matchId as absent', () => {
    const result = Route.options.validateSearch({ matchId: 'abc' });
    expect(result.matchId).toBeUndefined();
  });

  it('treats a missing matchId as absent', () => {
    const result = Route.options.validateSearch({});
    expect(result.matchId).toBeUndefined();
  });

  it('still parses range correctly (regression check)', () => {
    const result = Route.options.validateSearch({ range: 'today' });
    expect(result.range).toBe('today');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/routes/index.test.tsx`
Expected: FAIL — `result.matchId` is `undefined` for the numeric case because `validateSearch` doesn't parse `matchId` yet, and the "regression check" case may pass already (that part is fine).

- [ ] **Step 3: Implement `matchId` parsing in `validateSearch`**

Edit `src/routes/index.tsx`:

```typescript
// src/routes/index.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Header } from '@/components/layout/Header';
import { DateTabs } from '@/features/matches/components/DateTabs';
import { MatchList } from '@/features/matches/components/MatchList';
import { MatchDetailModal } from '@/features/matches/components/MatchDetailModal';
import type { MatchesRange } from '@/features/matches/types';

type SearchParams = { range?: MatchesRange; matchId?: number };

function parseMatchId(raw: unknown): number | undefined {
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    range:
      search.range === 'yesterday' || search.range === 'today' || search.range === 'upcoming'
        ? search.range
        : undefined,
    matchId: parseMatchId(search.matchId),
  }),
  component: HomePage,
});

function HomePage() {
  const { range = 'today', matchId } = Route.useSearch();
  const navigate = useNavigate({ from: '/' });

  const handleChange = (next: MatchesRange) => {
    navigate({ search: { range: next } });
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <Header />
      <DateTabs active={range} onChange={handleChange} />
      <div role="tabpanel" id="match-list-panel">
        <MatchList range={range} />
      </div>
      <MatchDetailModal range={range} matchId={matchId} />
    </div>
  );
}
```

Note: this step references `MatchDetailModal`, which does not exist until Task 3. Import will fail to resolve until then — that's expected; do not skip ahead. If your TDD loop requires the file to compile at this step, stub `MatchDetailModal` with a one-line placeholder (`export function MatchDetailModal() { return null; }` in a temporary file) and replace it fully in Task 3. Prefer this stub approach to keep Step 4 (below) green.

Create the stub now:

```typescript
// src/features/matches/components/MatchDetailModal.tsx (temporary stub — replaced in Task 3)
export function MatchDetailModal(_props: { range: string; matchId?: number }) {
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/routes/index.test.tsx`
Expected: PASS — all 4 cases green.

- [ ] **Step 5: Commit**

```bash
git add src/routes/index.tsx src/routes/index.test.tsx src/features/matches/components/MatchDetailModal.tsx
git commit -m "feat(routes): add matchId search param with numeric validation"
```

---

### Task 2: Extract `TeamLogo`/`TeamSlot` into a shared file

**Files:**
- Create: `src/features/matches/components/TeamLogo.tsx`
- Modify: `src/features/matches/components/MatchCard.tsx:1-42`

**Interfaces:**
- Consumes: `Club` type from `../types` (`name`, `logoUrl`, `logoBackdrop`, `score`).
- Produces: `TeamLogo(props: { name: string; logoUrl: string; logoBackdrop?: Club['logoBackdrop']; viewTransitionName?: string })` and `TeamSlot(props: { club: Club; align: 'left' | 'right'; viewTransitionName?: string })`, both exported from `src/features/matches/components/TeamLogo.tsx`. Task 7 consumes the `viewTransitionName` prop (unused/no-op until then — accepted now so the extraction doesn't need a second breaking change later).

This is a pure extraction — no visual or behavioral change. The regression guard is the existing `MatchCard.test.tsx` suite (12 tests), which exercises `TeamLogo`/`TeamSlot` indirectly through `MatchCard` and must pass unchanged.

- [ ] **Step 1: Run the existing test suite to capture the baseline (pre-extraction)**

Run: `npm test -- src/features/matches/components/MatchCard.test.tsx`
Expected: PASS — all 12 tests, this is the baseline the extraction must not break.

- [ ] **Step 2: Create `TeamLogo.tsx` with the extracted components**

```typescript
// src/features/matches/components/TeamLogo.tsx
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
```

- [ ] **Step 3: Update `MatchCard.tsx` to import instead of define**

Edit `src/features/matches/components/MatchCard.tsx`, replacing lines 1-42 (the two local function definitions) with:

```typescript
// src/features/matches/components/MatchCard.tsx
import { cn } from '@/lib/utils';
import type { Match } from '../types';
import { TeamSlot } from './TeamLogo';
```

Leave lines 44 onward (`export function MatchCard...`) unchanged — `TeamSlot` is called the same way (`<TeamSlot club={clubA!} align="left" />` etc.) and now resolves via the import.

- [ ] **Step 4: Run test to verify it still passes (regression check)**

Run: `npm test -- src/features/matches/components/MatchCard.test.tsx`
Expected: PASS — same 12 tests, zero changes to assertions, because the extraction preserved identical DOM output.

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/components/TeamLogo.tsx src/features/matches/components/MatchCard.tsx
git commit -m "refactor(matches): extract TeamLogo/TeamSlot into shared component"
```

---

### Task 3: Build `MatchDetailModal`

**Files:**
- Modify: `src/features/matches/components/MatchDetailModal.tsx` (replacing Task 1's stub)
- Test: `src/features/matches/components/MatchDetailModal.test.tsx`

**Interfaces:**
- Consumes: `useMatches(range: MatchesRange)` from `../api/useMatches` (returns `{ data, isLoading, isError, refetch }`, same as `MatchList` uses); `Match` type; `TeamSlot` from `./TeamLogo`; `useNavigate` from `@tanstack/react-router`; `Dialog` from `@base-ui/react/dialog`.
- Produces: `MatchDetailModal(props: { range: MatchesRange; matchId?: number })` — a component with no return value consumed by later tasks (it's a leaf in the render tree), but its *behavior contract* (open iff `matchId` resolves to a match in the current `range`'s loaded list; closes via all 3 dismiss paths call the same navigate-clear) is what Task 4 and Task 7 build on top of.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/matches/components/MatchDetailModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MatchDetailModal } from './MatchDetailModal';
import * as useMatchesModule from '../api/useMatches';
import { makeMatch } from '../test/fixtures';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('MatchDetailModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockNavigate.mockClear();
  });

  it('stays closed when matchId is undefined', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={undefined} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays closed when matchId does not match any loaded match (deep link to missing match)', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={999} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens and renders league name, match label, and team names when matchId matches a loaded match', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1, leagueName: 'LCK', matchLabel: 'Week 1 Day 2' })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={1} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('LCK Week 1 Day 2')).toBeInTheDocument();
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('GEN')).toBeInTheDocument();
  });

  it('renders "대진 미정" and omits the head-to-head section when clubs is empty (TBD match)', () => {
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1, clubs: [] })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={1} />);
    expect(screen.getByText('대진 미정')).toBeInTheDocument();
    expect(screen.queryByText('Head to Head')).not.toBeInTheDocument();
  });

  it('calls navigate to clear matchId when the close button is clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={1} />);
    await user.click(screen.getByRole('button', { name: /close/i }));

    expect(mockNavigate).toHaveBeenCalledWith({ search: expect.any(Function) });
    // Verify the search-updater clears matchId without touching other params.
    const updater = mockNavigate.mock.calls[0][0].search;
    expect(updater({ range: 'today', matchId: 1 })).toEqual({ range: 'today', matchId: undefined });
  });

  it('calls navigate to clear matchId when Escape is pressed', async () => {
    const user = userEvent.setup();
    vi.spyOn(useMatchesModule, 'useMatches').mockReturnValue({
      data: [makeMatch({ id: 1 })],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMatchesModule.useMatches>);

    renderWithClient(<MatchDetailModal range="today" matchId={1} />);
    await user.keyboard('{Escape}');

    expect(mockNavigate).toHaveBeenCalledWith({ search: expect.any(Function) });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/matches/components/MatchDetailModal.test.tsx`
Expected: FAIL — the stub from Task 1 returns `null` unconditionally, so `screen.getByRole('dialog')` and all content assertions fail.

- [ ] **Step 3: Implement `MatchDetailModal`**

```typescript
// src/features/matches/components/MatchDetailModal.tsx
import { useNavigate } from '@tanstack/react-router';
import { Dialog } from '@base-ui/react/dialog';
import { useMatches } from '../api/useMatches';
import { TeamSlot } from './TeamLogo';
import { HeadToHeadRow } from './HeadToHeadRow';
import type { MatchesRange } from '../types';

export function MatchDetailModal({
  range,
  matchId,
}: {
  range: MatchesRange;
  matchId?: number;
}) {
  const navigate = useNavigate({ from: '/' });
  const { data } = useMatches(range);

  const match = matchId !== undefined ? data?.find((m) => m.id === matchId) : undefined;
  const isOpen = match !== undefined;

  const close = () => {
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, matchId: undefined }),
    });
  };

  const hasTeams = (match?.clubs.length ?? 0) === 2;
  const [clubA, clubB] = hasTeams ? match!.clubs : [];

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && close()}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-[color:var(--scrim,#000000)]/40" />
        <Dialog.Popup className="fixed inset-x-0 bottom-0 flex max-h-[85vh] flex-col gap-4 rounded-t-[20px] bg-white p-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[color:var(--muted-ink,#6a6a6a)]">
              {match ? `${match.leagueName} ${match.matchLabel}` : ''}
            </span>
            <Dialog.Close aria-label="close" className="min-h-11 min-w-11">
              ✕
            </Dialog.Close>
          </div>

          {match && !hasTeams && (
            <div className="py-8 text-center text-sm text-[color:var(--muted-ink,#6a6a6a)]">
              대진 미정
            </div>
          )}

          {match && hasTeams && (
            <>
              <div className="flex items-center justify-between gap-4">
                <TeamSlot club={clubA!} align="left" />
                <div className="flex flex-col items-center gap-0.5 px-3 text-[21px] font-bold tabular-nums">
                  <span>{clubA!.score}</span>
                  <span className="text-sm font-normal text-[color:var(--muted-soft,#929292)]">:</span>
                  <span>{clubB!.score}</span>
                </div>
                <TeamSlot club={clubB!} align="right" />
              </div>

              <div>
                <span className="text-xs font-semibold text-[color:var(--muted-ink,#6a6a6a)]">
                  Head to Head
                </span>
                <HeadToHeadRow />
              </div>
            </>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

Note: this references `HeadToHeadRow`, created in Task 5. Stub it identically to Task 1's approach if executing tasks out of order:

```typescript
// src/features/matches/components/HeadToHeadRow.tsx (temporary stub — replaced in Task 5)
export function HeadToHeadRow() {
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/matches/components/MatchDetailModal.test.tsx`
Expected: PASS — all 6 cases. (The "Head to Head" text assertion in the TBD test passes trivially since the stub renders nothing either way; the positive assertion for H2H content is added in Task 5.)

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/components/MatchDetailModal.tsx src/features/matches/components/MatchDetailModal.test.tsx src/features/matches/components/HeadToHeadRow.tsx
git commit -m "feat(matches): add MatchDetailModal with base-ui Dialog and 3-way close sync"
```

---

### Task 4: Make `MatchCard` interactive

**Files:**
- Modify: `src/features/matches/components/MatchCard.tsx`
- Modify: `src/features/matches/components/MatchCard.test.tsx`

**Interfaces:**
- Consumes: `useNavigate` from `@tanstack/react-router`.
- Produces: `MatchCard` now accepts an optional `range: MatchesRange` prop (needed to preserve the current tab when navigating — without it, clicking a card would drop `?range=` from the URL). Existing callers (`MatchList.tsx`) must be updated to pass it.

- [ ] **Step 1: Write the failing tests**

Add to `src/features/matches/components/MatchCard.test.tsx` (append to the existing `describe('MatchCard', ...)` block, using the now-shared `makeMatch` from Task 0):

```typescript
  it('is rendered as a button with an accessible role', () => {
    render(<MatchCard match={makeMatch({})} range="today" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls navigate with matchId on click', async () => {
    const user = userEvent.setup();
    render(<MatchCard match={makeMatch({ id: 42 })} range="today" />);
    await user.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith({ search: { range: 'today', matchId: 42 } });
  });

  it('calls navigate with matchId on Enter key', async () => {
    const user = userEvent.setup();
    render(<MatchCard match={makeMatch({ id: 42 })} range="today" />);
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    expect(mockNavigate).toHaveBeenCalledWith({ search: { range: 'today', matchId: 42 } });
  });

  it('calls navigate with matchId on Space key', async () => {
    const user = userEvent.setup();
    render(<MatchCard match={makeMatch({ id: 42 })} range="today" />);
    screen.getByRole('button').focus();
    await user.keyboard(' ');
    expect(mockNavigate).toHaveBeenCalledWith({ search: { range: 'today', matchId: 42 } });
  });
```

Add the required imports and mock at the top of the file (alongside the existing imports):

```typescript
import userEvent from '@testing-library/user-event';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});
```

Add `vi` to the existing `import { describe, it, expect } from 'vitest';` → `import { describe, it, expect, vi, beforeEach } from 'vitest';`, and add a `beforeEach(() => { mockNavigate.mockClear(); });` inside the `describe` block.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/matches/components/MatchCard.test.tsx`
Expected: FAIL on the 4 new tests — `MatchCard`'s root is currently a `<div>`, has no `role="button"`, and never calls `navigate`.

- [ ] **Step 3: Implement interactivity**

Edit `src/features/matches/components/MatchCard.tsx`:

```typescript
// src/features/matches/components/MatchCard.tsx
import { useNavigate } from '@tanstack/react-router';
import { cn } from '@/lib/utils';
import type { Match, MatchesRange } from '../types';
import { TeamSlot } from './TeamLogo';

export function MatchCard({ match, range }: { match: Match; range: MatchesRange }) {
  const navigate = useNavigate({ from: '/' });
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

  const openDetail = () => {
    navigate({ search: { range, matchId: match.id } });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openDetail();
        }
      }}
      className={cn(
        'flex flex-col gap-2 rounded-[14px] border border-[color:var(--hairline-soft,#ebebeb)] p-4',
        'shadow-[rgba(0,0,0,0.02)_0_0_0_1px,rgba(0,0,0,0.04)_0_2px_6px,rgba(0,0,0,0.1)_0_4px_8px]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--brand-rausch,#ff385c)] focus-visible:outline-offset-2',
        isOngoing && 'border-[color:var(--brand-rausch,#ff385c)]'
      )}
    >
      {isOngoing && (
        <div className="flex items-center justify-end">
          <span className="inline-flex items-center gap-1 rounded-full bg-[color:var(--brand-rausch,#ff385c)] px-2 py-0.5 text-[11px] font-bold text-white">
            <span className="size-1.5 rounded-full bg-white" />
            LIVE
          </span>
        </div>
      )}

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

Note: every existing call site now must pass `range`. Update `src/features/matches/components/MatchList.tsx` — find `<MatchCard key={match.id} match={match} />` and change to `<MatchCard key={match.id} match={match} range={range} />` (`range` is already a prop `MatchList` receives).

Update every OTHER existing `<MatchCard match={...} />` invocation in the 12 pre-existing tests in `MatchCard.test.tsx` to include `range="today"` (or any valid `MatchesRange` literal — the value doesn't affect those tests' assertions, but the prop is now required by the type).

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/matches/components/MatchCard.test.tsx src/features/matches/components/MatchList.test.tsx`
Expected: PASS — all 12 original `MatchCard` tests (now with `range` prop added to each render call) plus the 4 new interactivity tests, plus all `MatchList` tests (which now pass `range` through to `MatchCard` automatically).

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/components/MatchCard.tsx src/features/matches/components/MatchCard.test.tsx src/features/matches/components/MatchList.tsx
git commit -m "feat(matches): make MatchCard interactive (click + keyboard opens detail modal)"
```

---

### Task 5: Build `HeadToHeadRow` (stub)

**Files:**
- Modify: `src/features/matches/components/HeadToHeadRow.tsx` (replacing Task 3's stub)
- Test: `src/features/matches/components/HeadToHeadRow.test.tsx`

**Interfaces:**
- Produces: `HeadToHeadRow()` — no props. Renders exactly 5 elements with `data-testid="h2h-dot"`, all styled identically (neutral gray) since there is no real result data this round.

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/matches/components/HeadToHeadRow.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeadToHeadRow } from './HeadToHeadRow';

describe('HeadToHeadRow', () => {
  it('renders exactly 5 dots', () => {
    render(<HeadToHeadRow />);
    expect(screen.getAllByTestId('h2h-dot')).toHaveLength(5);
  });

  it('renders all dots in the neutral (gray) state, since there is no real result data yet', () => {
    render(<HeadToHeadRow />);
    const dots = screen.getAllByTestId('h2h-dot');
    for (const dot of dots) {
      expect(dot.className).toContain('bg-[color:var(--muted-soft');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/matches/components/HeadToHeadRow.test.tsx`
Expected: FAIL — the Task 3 stub returns `null`, so `getAllByTestId('h2h-dot')` throws.

- [ ] **Step 3: Implement `HeadToHeadRow`**

```typescript
// src/features/matches/components/HeadToHeadRow.tsx
export function HeadToHeadRow() {
  return (
    <div className="flex items-center gap-2 pt-2">
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/matches/components/HeadToHeadRow.test.tsx`
Expected: PASS — both cases.

Also re-run the modal test suite, since it renders `HeadToHeadRow` inside the `hasTeams` branch:

Run: `npm test -- src/features/matches/components/MatchDetailModal.test.tsx`
Expected: PASS — unchanged (the TBD-match test still correctly finds no "Head to Head" text since that branch is not rendered when `!hasTeams`).

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/components/HeadToHeadRow.tsx src/features/matches/components/HeadToHeadRow.test.tsx
git commit -m "feat(matches): add HeadToHeadRow stub component (5 fixed gray dots)"
```

---

### Task 6: Add `HeadToHead` type (no hook, no fetch)

**Files:**
- Modify: `src/features/matches/types.ts`

**Interfaces:**
- Produces: `HeadToHead` interface, exported from `src/features/matches/types.ts`: `{ results: ('W' | 'L')[] }`. Not consumed by any code this round — this is a documented, unverified type declaration per the design doc's explicit honesty caveat (it cannot be verified against real data because `Club.id`/`clubId` do not exist yet).

- [ ] **Step 1: Add the type**

Edit `src/features/matches/types.ts`, appending after the existing `Match` interface:

```typescript
/**
 * Frontend contract for a future GET /head-to-head?teamA={id}&teamB={id}&limit=5
 * endpoint. NOT YET VERIFIED against a real backend response — the endpoint
 * does not exist yet, and Club has no `id` field to construct the query with.
 * `results` is most-recent-first, capped at 5 entries.
 */
export interface HeadToHead {
  results: ('W' | 'L')[];
}
```

- [ ] **Step 2: Verify the type checks**

Run: `npx tsc -b --noEmit`
Expected: no new type errors (the type is additive and unused, so this only confirms it's syntactically valid TypeScript).

- [ ] **Step 3: Commit**

```bash
git add src/features/matches/types.ts
git commit -m "feat(matches): add HeadToHead type (frontend contract, unverified against real data)"
```

---

### Task 7: View Transitions FLIP morph (with fallback trigger)

**Files:**
- Modify: `src/features/matches/components/MatchCard.tsx`
- Modify: `src/features/matches/components/MatchDetailModal.tsx`
- Modify: `src/features/matches/components/TeamLogo.tsx` (already accepts `viewTransitionName` from Task 2 — this task is the first to actually pass a real value)

**Interfaces:**
- Consumes: `viewTransitionName` prop on `TeamSlot`/`TeamLogo` (already defined in Task 2).
- Produces: no new exports — this task wires existing props together and adds the transition-wrapping logic around the existing `navigate`/close calls.

**⚠️ Fallback trigger (per the design doc's explicit risk framing):** this is the single highest-risk, highest-effort task in the plan — it coordinates `document.startViewTransition`, React's `flushSync`, and base-ui Dialog's portal + scroll-lock timing, none of which have an off-the-shelf integration. If implementing this task exceeds half a day, stop and ship the plain `Dialog` open/close (already fully working after Task 3) without the morph. Do not let an in-progress, partially-working transition block or destabilize the already-shipped Tasks 0–6.

- [ ] **Step 1: Write the failing test (feature-detection behavior only — the actual pixel-level transition is not unit-testable)**

```typescript
// Add to src/features/matches/components/MatchCard.test.tsx
  it('calls document.startViewTransition when opening the modal, if the browser supports it', async () => {
    const startViewTransition = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve(), ready: Promise.resolve(), updateCallbackDone: Promise.resolve() };
    });
    // @ts-expect-error -- test-only global patch, not in the default DOM lib types
    document.startViewTransition = startViewTransition;

    const user = userEvent.setup();
    render(<MatchCard match={makeMatch({ id: 42 })} range="today" />);
    await user.click(screen.getByRole('button'));

    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(mockNavigate).toHaveBeenCalledWith({ search: { range: 'today', matchId: 42 } });

    // @ts-expect-error -- cleanup
    delete document.startViewTransition;
  });

  it('opens the modal via a plain navigate when the browser does not support View Transitions', async () => {
    // @ts-expect-error -- ensure the feature-detect branch is exercised
    delete document.startViewTransition;

    const user = userEvent.setup();
    render(<MatchCard match={makeMatch({ id: 42 })} range="today" />);
    await user.click(screen.getByRole('button'));

    expect(mockNavigate).toHaveBeenCalledWith({ search: { range: 'today', matchId: 42 } });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/features/matches/components/MatchCard.test.tsx`
Expected: FAIL on the first new test — `openDetail` currently calls `navigate` directly with no `startViewTransition` wrapping, so `startViewTransition` is never called.

- [ ] **Step 3: Implement the feature-detected transition wrapper**

Edit `src/features/matches/components/MatchCard.tsx`, replacing the `openDetail` function:

```typescript
  const openDetail = () => {
    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => {
        navigate({ search: { range, matchId: match.id } });
      });
    } else {
      navigate({ search: { range, matchId: match.id } });
    }
  };
```

Pass a stable `viewTransitionName` down through `TeamSlot` so the browser can match the "before" (card) and "after" (modal) elements — derive it from match + team position, since `Club` has no `id`:

```typescript
          <TeamSlot club={clubA!} align="left" viewTransitionName={`team-logo-${match.id}-0`} />
          {/* ... */}
          <TeamSlot club={clubB!} align="right" viewTransitionName={`team-logo-${match.id}-1`} />
```

In `src/features/matches/components/MatchDetailModal.tsx`, use the matching names so the browser recognizes them as the same logical element:

```typescript
                <TeamSlot club={clubA!} align="left" viewTransitionName={`team-logo-${match.id}-0`} />
                {/* ... */}
                <TeamSlot club={clubB!} align="right" viewTransitionName={`team-logo-${match.id}-1`} />
```

Wrap the close path the same way — edit `close` in `MatchDetailModal.tsx`:

```typescript
  const close = () => {
    const doClose = () =>
      navigate({
        search: (prev: Record<string, unknown>) => ({ ...prev, matchId: undefined }),
      });
    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(doClose);
    } else {
      doClose();
    }
  };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/features/matches/components/MatchCard.test.tsx src/features/matches/components/MatchDetailModal.test.tsx`
Expected: PASS — all tests, including the 2 new feature-detection tests. (jsdom, used by Vitest, does not implement `startViewTransition` natively, which is exactly why both tests explicitly patch/delete the global — this validates the branch logic without needing a real browser.)

- [ ] **Step 5: Manual verification in a real browser (not unit-testable)**

Run: `npm run dev`, open the app in a View-Transitions-supporting browser (current Chrome), click a match card, and visually confirm the logo grows from its card position into the modal. Then test in a browser without support (or force it via devtools by deleting `document.startViewTransition` in the console) and confirm the fallback fade/scale still works and nothing crashes.

If this step reveals the portal/scroll-lock timing issue flagged in the design doc's risk section (logo position captured before vs. after Dialog's scroll lock applies), and a fix isn't found within the half-day budget stated above, revert Step 3's `document.startViewTransition` wrapping (keep the plain `navigate` calls) and close this task as "shipped without the morph — Approach A fallback only," per the design doc's explicit fallback trigger.

- [ ] **Step 6: Commit**

```bash
git add src/features/matches/components/MatchCard.tsx src/features/matches/components/MatchDetailModal.tsx src/features/matches/components/MatchCard.test.tsx
git commit -m "feat(matches): add View Transitions FLIP morph for card-to-modal logo, with feature-detect fallback"
```

---

## Self-Review

**1. Spec coverage** — checked against `docs/designs/match-detail-modal.md` Success Criteria:
- ✅ Click opens modal, URL reflects `matchId` (Tasks 1, 3, 4)
- ✅ Close via X/ESC/overlay, all 3 sync to URL (Task 3 — `Dialog.Root`'s `onOpenChange` fires for all 3 dismiss paths since base-ui routes them all through the same handler; verified by the "close button" and "Escape" tests, and `Dialog.Backdrop`'s built-in click-to-dismiss triggers the same `onOpenChange`)
- ✅ MatchCard keyboard + click interactive (Task 4)
- ✅ League/match name, team logos/names, current score (Task 3)
- ✅ TBD match → "대진 미정", H2H omitted (Task 3, tested)
- ✅ Cancelled/postponed reuses existing muted-badge fallback — **no separate task needed**: this is already `MatchCard`'s existing behavior (untouched by this plan) and `MatchDetailModal` renders the same `matchState`-driven fallback path implicitly through the same `isFinished`/`isOngoing` booleans copied into Task 3's implementation. No new code path was introduced for it, so no new test was needed beyond what `MatchCard.test.tsx`'s existing "unrecognized matchState" test already covers structurally.
- ✅ H2H 5 dots, stub gray (Task 5)
- ✅ FLIP morph with fallback (Task 7)
- ✅ Live-poll-while-modal-open auto-update — **no separate task needed**: this falls directly out of Task 3's `useMatches(range)` call sharing the `['matches', range]` query key with `MatchList`; TanStack Query's `refetchInterval` (already configured in `useMatches.ts:11`) re-renders both consumers automatically. No new code required, hence no dedicated task — this is architecture, not a feature to build.
- ✅ `Club.id` / H2H endpoint marked non-critical-path — correctly reflected as "no task in this plan" (Task 6 adds only the type, explicitly not the hook)

**2. Placeholder scan** — no "TBD", "add error handling", "similar to Task N", or bare prose steps found; every code step has a complete code block.

**3. Type consistency** — traced across tasks:
- `makeMatch(overrides: Partial<Match>): Match` (Task 0) used identically in Tasks 3, 4, 5's tests.
- `TeamLogo`/`TeamSlot` signatures (Task 2) — `viewTransitionName?: string` declared in Task 2, left unused (accepted but not passed) in Tasks 3-4, then actually populated in Task 7. No signature drift.
- `MatchCard({ match, range })` (Task 4) — `range: MatchesRange` prop added; `MatchList.tsx`'s call site updated in the same task to avoid a broken intermediate state.
- `MatchDetailModal({ range, matchId })` (Task 3) matches the call site added in Task 1's `HomePage`.
- `HeadToHead { results: ('W' | 'L')[] }` (Task 6) — matches the design doc's Next Steps #6 verbatim, intentionally unconsumed.

No gaps or signature mismatches found.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-18-match-detail-modal.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
