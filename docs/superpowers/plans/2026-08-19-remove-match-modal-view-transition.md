# Remove Match Detail Modal View-Transition Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the browser View Transitions animation that morphs a team logo icon from the match list card into the match detail modal when a match is clicked, while keeping the modal open/close behavior intact.

**Architecture:** The animation is produced entirely by the browser's native View Transitions API, triggered by passing `viewTransition: true` to TanStack Router's `navigate()` call, combined with matching `viewTransitionName` CSS properties on paired DOM elements (the team logos in `MatchCard` and `MatchDetailModal`). There is no separate animation library or CSS keyframe involved. Removing the feature means: (1) drop `viewTransition: true` from both `navigate()` calls that open/close the modal, and (2) remove the `viewTransitionName` prop and the `style={{ viewTransitionName }}` wiring from `TeamLogo`/`TeamSlot`/`MatchCard`/`MatchDetailModal`. The `isDetailOpen`/`openMatchId` prop chain (`routes/index.tsx` → `MatchList` → `MatchSection` → `MatchCard`) exists solely to suppress the transition name on the source card while the modal is open — a requirement of the View Transitions API (two elements can't claim the same `view-transition-name` at once). Once transitions are gone, this whole prop chain is dead code and is removed too, per YAGNI.

**Tech Stack:** React 19, TanStack Router (file-based routing, `useNavigate`), Vitest + Testing Library, base-ui `Dialog`.

**Spec:** None (user request via slash command, not a written spec doc). This plan is self-contained; the "Global Constraints" section below captures the scope boundary in place of a spec.

## Global Constraints

- Do not change modal open/close *logic* — only remove the animation trigger (`viewTransition: true`) and the paired `viewTransitionName` styling. The modal must still open on click/Enter/Space and close on the close button / Escape / backdrop click, exactly as before.
- Do not touch `HeadToHeadRow`, `MatchCardSkeleton`, `groupAdjacentMatches`, `buildMatchSections`, or `useFrozenMatches` — out of scope.
- Keep `TeamLogo`/`TeamSlot` components generally reusable; only remove the transition-specific prop, not the components themselves.
- All existing non-transition tests must continue to pass unmodified except where they directly assert transition-related behavior (those are removed/updated in this plan).

---

### Task 1: Remove `viewTransitionName` from `TeamLogo` / `TeamSlot`

**Files:**
- Modify: `src/features/matches/components/TeamLogo.tsx`
- Test: `src/features/matches/components/MatchCard.test.tsx` (updated in Task 2 — `TeamLogo` has no dedicated test file; its prop is exercised only through `MatchCard`)

**Interfaces:**
- Consumes: nothing new.
- Produces: `TeamLogo({ name, logoUrl, logoBackdrop })` and `TeamSlot({ club, align })` — both lose the `viewTransitionName` prop entirely. Task 2 (`MatchCard.tsx`) and Task 3 (`MatchDetailModal.tsx`) must stop passing it.

- [ ] **Step 1: Remove the `viewTransitionName` prop and inline style from `TeamLogo`**

Edit `src/features/matches/components/TeamLogo.tsx`. Replace the full file contents with:

```tsx
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
```

- [ ] **Step 2: Confirm TypeScript compiles (callers not yet updated will fail — expected until Tasks 2–3)**

Run: `npx tsc --noEmit -p . 2>&1 | grep -E "MatchCard.tsx|MatchDetailModal.tsx"`
Expected: errors like `Property 'viewTransitionName' does not exist on type ...` for both `MatchCard.tsx` and `MatchDetailModal.tsx`. This confirms Step 1 landed correctly; these errors are resolved by Tasks 2 and 3.

- [ ] **Step 3: Commit**

```bash
git add src/features/matches/components/TeamLogo.tsx
git commit -m "refactor(matches): drop viewTransitionName from TeamLogo/TeamSlot"
```

---

### Task 2: Remove transition trigger and `isDetailOpen` from `MatchCard`

**Files:**
- Modify: `src/features/matches/components/MatchCard.tsx`
- Test: `src/features/matches/components/MatchCard.test.tsx`

**Interfaces:**
- Consumes: `TeamSlot({ club, align })` from Task 1 (no `viewTransitionName` param).
- Produces: `MatchCard({ match, range })` — the `isDetailOpen` prop is removed entirely. Task 4 (`MatchSection.tsx`) must stop passing `isDetailOpen`.

- [ ] **Step 1: Update the failing/changing tests first**

Edit `src/features/matches/components/MatchCard.test.tsx`. Remove the two `viewTransitionName`-specific tests (lines 115–129) and the `viewTransition: true` fields from the three `navigate` assertions. Replace the block from `it('sets a viewTransitionName...` through the end of `it('suppresses the viewTransitionName...` (currently lines 115–129) with nothing (delete it — no replacement test needed, since there is no transition behavior left to cover).

Then update the three navigate-assertion tests (`calls navigate with matchId on click`, `on Enter key`, `on Space key`) to drop `viewTransition: true`:

```tsx
  it('calls navigate with matchId on click', async () => {
    const user = userEvent.setup();
    render(<MatchCard match={makeMatch({ id: 42 })} range="today" />);
    await user.click(screen.getByRole('button'));
    expect(mockNavigate).toHaveBeenCalledWith({
      search: { range: 'today', matchId: 42 },
    });
  });

  it('calls navigate with matchId on Enter key', async () => {
    const user = userEvent.setup();
    render(<MatchCard match={makeMatch({ id: 42 })} range="today" />);
    screen.getByRole('button').focus();
    await user.keyboard('{Enter}');
    expect(mockNavigate).toHaveBeenCalledWith({
      search: { range: 'today', matchId: 42 },
    });
  });

  it('calls navigate with matchId on Space key', async () => {
    const user = userEvent.setup();
    render(<MatchCard match={makeMatch({ id: 42 })} range="today" />);
    screen.getByRole('button').focus();
    await user.keyboard(' ');
    expect(mockNavigate).toHaveBeenCalledWith({
      search: { range: 'today', matchId: 42 },
    });
  });
```

- [ ] **Step 2: Run the test file to verify the updated tests fail against current (unmodified) `MatchCard.tsx`**

Run: `npx vitest run src/features/matches/components/MatchCard.test.tsx`
Expected: FAIL — the three navigate assertions fail because the component still sends `viewTransition: true`; the deleted transition tests no longer exist so no failure there.

- [ ] **Step 3: Update `MatchCard.tsx`**

Edit `src/features/matches/components/MatchCard.tsx`:

Remove `isDetailOpen` from the props signature and the `openDetail` transition flag:

```tsx
export function MatchCard({
  match,
  range,
}: {
  match: Match;
  range: MatchesRange;
}) {
```

Change the `openDetail` function:

```tsx
  const openDetail = () => {
    navigate({ search: { range, matchId: match.id } });
  };
```

Change both `TeamSlot` usages to drop `viewTransitionName`:

```tsx
          <TeamSlot club={clubA!} align="left" />
```

and

```tsx
          <TeamSlot club={clubB!} align="right" />
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `npx vitest run src/features/matches/components/MatchCard.test.tsx`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/components/MatchCard.tsx src/features/matches/components/MatchCard.test.tsx
git commit -m "refactor(matches): remove view-transition navigation and isDetailOpen from MatchCard"
```

---

### Task 3: Remove transition trigger and `viewTransitionName` from `MatchDetailModal`

**Files:**
- Modify: `src/features/matches/components/MatchDetailModal.tsx`
- Test: `src/features/matches/components/MatchDetailModal.test.tsx`

**Interfaces:**
- Consumes: `TeamSlot({ club, align })` from Task 1.
- Produces: `MatchDetailModal({ range, matchId })` — unchanged public signature; only internal `navigate()` calls and `TeamSlot` usage change.

- [ ] **Step 1: Update the two navigate-assertion tests first**

Edit `src/features/matches/components/MatchDetailModal.test.tsx`. In `it('calls navigate to clear matchId when the close button is clicked', ...)` (around line 93), change the assertion:

```tsx
    expect(mockNavigate).toHaveBeenCalledWith({
      search: expect.any(Function),
    });
```

In `it('calls navigate to clear matchId when Escape is pressed', ...)` (around line 114), change the assertion the same way:

```tsx
    expect(mockNavigate).toHaveBeenCalledWith({
      search: expect.any(Function),
    });
```

- [ ] **Step 2: Run the test file to verify it fails against current (unmodified) `MatchDetailModal.tsx`**

Run: `npx vitest run src/features/matches/components/MatchDetailModal.test.tsx`
Expected: FAIL — both navigate assertions fail because the component still sends `viewTransition: true`.

- [ ] **Step 3: Update `MatchDetailModal.tsx`**

Edit `src/features/matches/components/MatchDetailModal.tsx`. Change the `close` function:

```tsx
  const close = () => {
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, matchId: undefined }),
    });
  };
```

Change both `TeamSlot` usages to drop `viewTransitionName`:

```tsx
                <TeamSlot club={clubA!} align="left" />
```

and

```tsx
                <TeamSlot club={clubB!} align="right" />
```

- [ ] **Step 4: Run the test file to verify it passes**

Run: `npx vitest run src/features/matches/components/MatchDetailModal.test.tsx`
Expected: PASS, all tests green.

- [ ] **Step 5: Commit**

```bash
git add src/features/matches/components/MatchDetailModal.tsx src/features/matches/components/MatchDetailModal.test.tsx
git commit -m "refactor(matches): remove view-transition navigation from MatchDetailModal"
```

---

### Task 4: Remove dead `openMatchId`/`isDetailOpen` plumbing from `MatchSection`, `MatchList`, and the route

**Files:**
- Modify: `src/features/matches/components/MatchSection.tsx`
- Modify: `src/features/matches/components/MatchList.tsx`
- Modify: `src/routes/index.tsx`
- Test: `src/features/matches/components/MatchSection.test.tsx`
- Test: `src/features/matches/components/MatchList.test.tsx`

**Interfaces:**
- Consumes: `MatchCard({ match, range })` from Task 2 (no `isDetailOpen` param).
- Produces: `MatchSection({ status, matches, range })` and `MatchList({ range })` — both lose the `openMatchId` prop. `routes/index.tsx` stops reading `matchId` for the purpose of passing it to `MatchList` (it still reads `matchId` to pass to `MatchDetailModal`, which is unaffected).

- [ ] **Step 1: Check for existing `openMatchId`/`isDetailOpen` assertions in the two test files**

Run: `grep -n "openMatchId\|isDetailOpen" src/features/matches/components/MatchSection.test.tsx src/features/matches/components/MatchList.test.tsx`

If this returns matches, read the surrounding test(s) and remove the prop from the render call and any related assertion (there is no longer a suppression behavior to test). If it returns nothing, skip directly to Step 2 — there is nothing to update in the test files for this prop.

- [ ] **Step 2: Run the two test files to confirm current baseline (should pass before edits)**

Run: `npx vitest run src/features/matches/components/MatchSection.test.tsx src/features/matches/components/MatchList.test.tsx`
Expected: PASS (baseline, before removing the prop from source).

- [ ] **Step 3: Update `MatchSection.tsx`**

Edit `src/features/matches/components/MatchSection.tsx`:

```tsx
export function MatchSection({
  status,
  matches,
  range,
}: {
  status: 'ongoing' | 'finished' | 'upcoming';
  matches: Match[];
  range: MatchesRange;
}) {
```

And remove `isDetailOpen` from the `MatchCard` usage:

```tsx
            <MatchCard key={match.id} match={match} range={range} />
```

- [ ] **Step 4: Update `MatchList.tsx`**

Edit `src/features/matches/components/MatchList.tsx`:

```tsx
export function MatchList({ range }: { range: MatchesRange }) {
```

And remove the `openMatchId` prop from the `MatchSection` usage:

```tsx
        <MatchSection
          key={section.status}
          status={section.status}
          matches={section.matches}
          range={range}
        />
```

- [ ] **Step 5: Update `src/routes/index.tsx`**

Edit `src/routes/index.tsx`, change the `MatchList` usage to drop `openMatchId`:

```tsx
        <MatchList range={range} />
```

(`matchId` from `Route.useSearch()` is still used by `<MatchDetailModal range={range} matchId={matchId} />` on the next line — leave that untouched.)

- [ ] **Step 6: Run the full test suite to verify nothing broke**

Run: `npx vitest run`
Expected: PASS, all test files green.

- [ ] **Step 7: Type-check the whole project**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/matches/components/MatchSection.tsx src/features/matches/components/MatchSection.test.tsx src/features/matches/components/MatchList.tsx src/features/matches/components/MatchList.test.tsx src/routes/index.tsx
git commit -m "refactor(matches): remove dead openMatchId/isDetailOpen prop chain"
```

---

### Task 5: Manual verification in the browser

**Files:** none (manual QA step, no code changes)

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (or the project's documented dev script — check `package.json` `scripts.dev` if this differs)

- [ ] **Step 2: Open the app and click a match card**

Navigate to the running app in a browser, click a match card in the list.

Expected: The modal appears at the bottom of the screen (slide-up per `Dialog.Popup` styling) with **no** cross-fading/morphing icon animation from the card into the modal — the list and modal render as two independent, un-animated states. There should be no flash-of-two-logos or motion artifact.

- [ ] **Step 3: Close the modal via the close button, Escape, and backdrop click**

Expected: All three close interactions work exactly as before (modal disappears, URL `matchId` search param clears), with no transition animation on close either.

- [ ] **Step 4: Report result to the user**

State plainly whether the animation is gone and close/open behavior is intact, or describe what still shows unexpected motion.

---

## Self-Review Notes

- **Spec coverage:** No written spec; the single requirement ("remove the icon-flies-into-modal animation, step by step") is covered end-to-end: Task 1 removes the shared transition names, Tasks 2–3 remove the `viewTransition: true` trigger on both navigate call sites (open and close), Task 4 removes now-dead plumbing, Task 5 verifies visually.
- **Placeholder scan:** No TBD/TODO/"add appropriate" placeholders; all edits are full file/snippet contents.
- **Type consistency:** `TeamSlot`/`TeamLogo` prop signatures, `MatchCard` prop signature, and `MatchSection`/`MatchList` prop signatures are each defined once and referenced identically by every consuming task.
