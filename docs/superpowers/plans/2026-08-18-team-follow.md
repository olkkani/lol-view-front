# Team Follow Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the team follow screen (region-grouped team list, split into "my teams" / "followable teams" sections) as a fully working React prototype backed by local mock data, with an adapter boundary that isolates the eventual real-API swap to exactly three files.

**Architecture:** A new `features/teams/` slice (mirroring the existing `features/matches/` structure) exposes one hook, `useTeams()`, whose return type is fixed now and will not change when mock data is replaced with a real fetch. Components only ever talk to `useTeams()` — never to the mock data file directly. Sorting (region-then-name) lives in a pure, independently-tested utility, same pattern as `sortMatches.ts`.

**Tech Stack:** React, TanStack Router (file-based routes), TanStack Query, Tailwind, Vitest + Testing Library (already installed per `package.json`).

**Spec:** `docs/designs/team-follow.md` — read it alongside this plan. It has the full rationale for why this is a mock-data prototype (no `/teams`, `/clubs`, or `/follows` backend endpoints exist yet — verified via curl against `localhost:9031` during the design session) and the adapter-boundary contract this plan implements.

## Global Constraints

- Region grouping uses a **fixed priority order**: LCK → LPL → LEC (not alphabetical) — spec's Success Criteria.
- Within a region group, teams sort by `clubName` ascending (alphabetical) — spec's Success Criteria.
- Mock state is **session-only** — `toggleFollow` resets on page reload. No `localStorage`. Do not add persistence.
- No `FollowedTeam` type. Follow state is a single field: `Team.isFollowing: boolean`. The two screen sections come from filtering `useTeams()`'s two returned arrays, not from a second type.
- Loading/error/empty-region states are **out of scope** for this plan (mock always resolves synchronously with data) — do not build skeleton/error UI for this feature.
- DESIGN.md tokens only: Rausch (`#ff385c`) for the follow button and its `rounded.full` circular shape, `hairline`/`hairline-soft` for row dividers — no new colors or radii invented.
- Route path: `/teams`, a new file-based route, independent of `/` (matches screen). No shared state between them.
- `useTeams()`'s return shape (`{ myTeams: Team[]; followableTeams: Team[]; toggleFollow: (id: number) => void }`) is fixed by this plan — later tasks depend on this exact shape.

---

## Task 1: Team type + mock data

**Files:**
- Create: `src/features/teams/types.ts`
- Create: `src/features/teams/api/mockTeams.ts`
- Test: `src/features/teams/api/mockTeams.test.ts`

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `interface Team { id: number; region: string; clubName: string; logoUrl: string; isFollowing: boolean }` (exported from `types.ts`)
  - `MOCK_TEAMS: Team[]` (exported from `mockTeams.ts`) — the seed data other tasks build on

- [ ] **Step 1: Write the failing test for mock data shape**

```typescript
// src/features/teams/api/mockTeams.test.ts
import { describe, it, expect } from 'vitest';
import { MOCK_TEAMS } from './mockTeams';

describe('MOCK_TEAMS', () => {
  it('contains at least one team per known region (LCK, LPL, LEC)', () => {
    const regions = new Set(MOCK_TEAMS.map((t) => t.region));
    expect(regions.has('LCK')).toBe(true);
    expect(regions.has('LPL')).toBe(true);
    expect(regions.has('LEC')).toBe(true);
  });

  it('every team has a non-empty clubName distinct from any short code pattern', () => {
    for (const team of MOCK_TEAMS) {
      expect(team.clubName.length).toBeGreaterThan(2);
    }
  });

  it('has unique ids', () => {
    const ids = MOCK_TEAMS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a mix of followed and unfollowed teams', () => {
    const followed = MOCK_TEAMS.filter((t) => t.isFollowing);
    const unfollowed = MOCK_TEAMS.filter((t) => !t.isFollowing);
    expect(followed.length).toBeGreaterThan(0);
    expect(unfollowed.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/teams/api/mockTeams.test.ts`
Expected: FAIL — `mockTeams.ts` (and `types.ts`) don't exist yet, import error.

- [ ] **Step 3: Write the type definition**

```typescript
// src/features/teams/types.ts

/**
 * Mock-derived shape — no /teams or /clubs backend endpoint exists yet
 * (verified via curl against localhost:9031 during design, 2026-08-18).
 * `region` and `clubName` here are assumptions grounded in real team
 * short codes seen in GET /matches, not fabricated data. Update this
 * type when the real endpoint contract is confirmed — see
 * docs/designs/team-follow.md Open Questions.
 */
export interface Team {
  id: number;
  /** League/region code, e.g. "LCK", "LPL", "LEC". Assumed one region per team. */
  region: string;
  /** Full team name, e.g. "T1", "Dplus KIA" — /matches only exposes short codes like "DK". */
  clubName: string;
  logoUrl: string;
  isFollowing: boolean;
}
```

- [ ] **Step 4: Write the mock data**

```typescript
// src/features/teams/api/mockTeams.ts
import type { Team } from '../types';

/**
 * Session-only mock data. Short codes and logo URLs are taken from the
 * real GET /matches response observed during the design session
 * (localhost:9031) — region and full clubName are assumed since /matches
 * doesn't carry them. Replace this file when GET /teams exists.
 */
export const MOCK_TEAMS: Team[] = [
  { id: 1, region: 'LCK', clubName: 'T1', logoUrl: 'http://static.lolesports.com/teams/1726801573959_539px-T1_2019_full_allmode.png', isFollowing: true },
  { id: 2, region: 'LCK', clubName: 'Dplus KIA', logoUrl: 'http://static.lolesports.com/teams/1673260049703_DPlusKIALOGO11.png', isFollowing: true },
  { id: 3, region: 'LCK', clubName: 'Hanwha Life Esports', logoUrl: 'http://static.lolesports.com/teams/1631819564399_hle-2021-worlds.png', isFollowing: false },
  { id: 4, region: 'LCK', clubName: 'KT Rolster', logoUrl: 'http://static.lolesports.com/teams/kt_darkbackground.png', isFollowing: false },
  { id: 5, region: 'LCK', clubName: 'Kwangdong Freecs', logoUrl: 'http://static.lolesports.com/teams/1734691810721_BFXfullcolorfordarkbg.png', isFollowing: false },
  { id: 6, region: 'LCK', clubName: 'Nongshim RedForce', logoUrl: 'http://static.lolesports.com/teams/NSFullonDark.png', isFollowing: false },
  { id: 7, region: 'LPL', clubName: 'Bilibili Gaming', logoUrl: 'http://static.lolesports.com/teams/bilibili-gaming.png', isFollowing: true },
  { id: 8, region: 'LPL', clubName: 'JD Gaming', logoUrl: 'http://static.lolesports.com/teams/jd-gaming.png', isFollowing: false },
  { id: 9, region: 'LEC', clubName: 'G2 Esports', logoUrl: 'http://static.lolesports.com/teams/g2-esports.png', isFollowing: false },
  { id: 10, region: 'LEC', clubName: 'Fnatic', logoUrl: 'http://static.lolesports.com/teams/fnatic.png', isFollowing: false },
];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/teams/api/mockTeams.test.ts`
Expected: PASS (all 4 assertions)

- [ ] **Step 6: Commit**

```bash
git add src/features/teams/types.ts src/features/teams/api/mockTeams.ts src/features/teams/api/mockTeams.test.ts
git commit -m "feat(teams): add Team type and mock team data"
```

---

## Task 2: groupByRegion sort utility

**Files:**
- Create: `src/features/teams/utils/groupByRegion.ts`
- Test: `src/features/teams/utils/groupByRegion.test.ts`

**Interfaces:**
- Consumes: `Team` from `../types` (Task 1)
- Produces: `groupByRegion(teams: Team[]): Array<{ region: string; teams: Team[] }>` — used by `TeamSection.tsx` (Task 5)

- [ ] **Step 1: Write the failing tests**

```typescript
// src/features/teams/utils/groupByRegion.test.ts
import { describe, it, expect } from 'vitest';
import { groupByRegion } from './groupByRegion';
import type { Team } from '../types';

function team(overrides: Partial<Team>): Team {
  return {
    id: 0,
    region: 'LCK',
    clubName: 'Team',
    logoUrl: '',
    isFollowing: false,
    ...overrides,
  };
}

describe('groupByRegion', () => {
  it('groups regions in fixed priority order LCK, LPL, LEC', () => {
    const teams = [
      team({ id: 1, region: 'LEC', clubName: 'Fnatic' }),
      team({ id: 2, region: 'LPL', clubName: 'JD Gaming' }),
      team({ id: 3, region: 'LCK', clubName: 'T1' }),
    ];

    const groups = groupByRegion(teams);

    expect(groups.map((g) => g.region)).toEqual(['LCK', 'LPL', 'LEC']);
  });

  it('sorts teams within a region by clubName ascending', () => {
    const teams = [
      team({ id: 1, region: 'LCK', clubName: 'T1' }),
      team({ id: 2, region: 'LCK', clubName: 'Dplus KIA' }),
      team({ id: 3, region: 'LCK', clubName: 'KT Rolster' }),
    ];

    const groups = groupByRegion(teams);

    expect(groups[0].teams.map((t) => t.clubName)).toEqual([
      'Dplus KIA',
      'KT Rolster',
      'T1',
    ]);
  });

  it('omits regions with zero teams instead of returning an empty group', () => {
    const teams = [team({ id: 1, region: 'LCK', clubName: 'T1' })];

    const groups = groupByRegion(teams);

    expect(groups).toHaveLength(1);
    expect(groups[0].region).toBe('LCK');
  });

  it('returns an empty array for an empty input', () => {
    expect(groupByRegion([])).toEqual([]);
  });

  it('places an unrecognized region after LCK/LPL/LEC, in alphabetical order among unrecognized regions', () => {
    const teams = [
      team({ id: 1, region: 'PCS', clubName: 'CTBC Flying Oyster' }),
      team({ id: 2, region: 'LCK', clubName: 'T1' }),
      team({ id: 3, region: 'VCS', clubName: 'GAM Esports' }),
    ];

    const groups = groupByRegion(teams);

    expect(groups.map((g) => g.region)).toEqual(['LCK', 'PCS', 'VCS']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/teams/utils/groupByRegion.test.ts`
Expected: FAIL — `groupByRegion.ts` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/teams/utils/groupByRegion.ts
import type { Team } from '../types';

const REGION_PRIORITY = ['LCK', 'LPL', 'LEC'];

export interface RegionGroup {
  region: string;
  teams: Team[];
}

export function groupByRegion(teams: Team[]): RegionGroup[] {
  const byRegion = new Map<string, Team[]>();

  for (const team of teams) {
    const bucket = byRegion.get(team.region) ?? [];
    bucket.push(team);
    byRegion.set(team.region, bucket);
  }

  const regions = [...byRegion.keys()].sort((a, b) => {
    const aIndex = REGION_PRIORITY.indexOf(a);
    const bIndex = REGION_PRIORITY.indexOf(b);

    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return regions.map((region) => ({
    region,
    teams: [...(byRegion.get(region) ?? [])].sort((a, b) =>
      a.clubName.localeCompare(b.clubName)
    ),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/teams/utils/groupByRegion.test.ts`
Expected: PASS (all 5 assertions)

- [ ] **Step 5: Commit**

```bash
git add src/features/teams/utils/groupByRegion.ts src/features/teams/utils/groupByRegion.test.ts
git commit -m "feat(teams): add groupByRegion sort utility"
```

---

## Task 3: useTeams hook (adapter boundary)

**Files:**
- Create: `src/features/teams/api/useTeams.ts`
- Test: `src/features/teams/api/useTeams.test.ts`

**Interfaces:**
- Consumes: `MOCK_TEAMS` from `./mockTeams` (Task 1), `Team` from `../types` (Task 1)
- Produces: `useTeams(): { myTeams: Team[]; followableTeams: Team[]; toggleFollow: (id: number) => void }` — this exact shape is what `TeamFollowScreen.tsx` (Task 6) depends on. **This is the file that changes when the real API lands — no other file in this feature should need to change for a same-shape API response.**

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/teams/api/useTeams.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTeams } from './useTeams';

describe('useTeams', () => {
  it('splits teams into myTeams (isFollowing) and followableTeams (not following)', () => {
    const { result } = renderHook(() => useTeams());

    expect(result.current.myTeams.every((t) => t.isFollowing)).toBe(true);
    expect(result.current.followableTeams.every((t) => !t.isFollowing)).toBe(true);
    expect(result.current.myTeams.length).toBeGreaterThan(0);
    expect(result.current.followableTeams.length).toBeGreaterThan(0);
  });

  it('toggleFollow moves a team from followableTeams to myTeams', () => {
    const { result } = renderHook(() => useTeams());
    const target = result.current.followableTeams[0];

    act(() => {
      result.current.toggleFollow(target.id);
    });

    expect(result.current.myTeams.some((t) => t.id === target.id)).toBe(true);
    expect(result.current.followableTeams.some((t) => t.id === target.id)).toBe(false);
  });

  it('toggleFollow moves a team from myTeams to followableTeams (unfollow)', () => {
    const { result } = renderHook(() => useTeams());
    const target = result.current.myTeams[0];

    act(() => {
      result.current.toggleFollow(target.id);
    });

    expect(result.current.followableTeams.some((t) => t.id === target.id)).toBe(true);
    expect(result.current.myTeams.some((t) => t.id === target.id)).toBe(false);
  });

  it('toggleFollow on an unknown id is a no-op', () => {
    const { result } = renderHook(() => useTeams());
    const before = {
      myCount: result.current.myTeams.length,
      followableCount: result.current.followableTeams.length,
    };

    act(() => {
      result.current.toggleFollow(999999);
    });

    expect(result.current.myTeams.length).toBe(before.myCount);
    expect(result.current.followableTeams.length).toBe(before.followableCount);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/teams/api/useTeams.test.ts`
Expected: FAIL — `useTeams.ts` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/teams/api/useTeams.ts
import { useState, useCallback, useMemo } from 'react';
import { MOCK_TEAMS } from './mockTeams';
import type { Team } from '../types';

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>(MOCK_TEAMS);

  const toggleFollow = useCallback((id: number) => {
    setTeams((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFollowing: !t.isFollowing } : t))
    );
  }, []);

  const myTeams = useMemo(() => teams.filter((t) => t.isFollowing), [teams]);
  const followableTeams = useMemo(() => teams.filter((t) => !t.isFollowing), [teams]);

  return { myTeams, followableTeams, toggleFollow };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/teams/api/useTeams.test.ts`
Expected: PASS (all 4 assertions)

- [ ] **Step 5: Commit**

```bash
git add src/features/teams/api/useTeams.ts src/features/teams/api/useTeams.test.ts
git commit -m "feat(teams): add useTeams hook as the mock/real-API adapter boundary"
```

---

## Task 4: TeamRow component

**Files:**
- Create: `src/features/teams/components/TeamRow.tsx`
- Test: `src/features/teams/components/TeamRow.test.tsx`

**Interfaces:**
- Consumes: `Team` from `../types` (Task 1)
- Produces: `<TeamRow team={Team} onToggle={(id: number) => void} />` — used by `TeamSection.tsx` (Task 5)

This mirrors the wireframe from the design session: logo → name → button, button right-aligned, icon-only (`+` for follow, `✓` for following), DESIGN.md tokens (Rausch `#ff385c`, `rounded-full`, hairline border).

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/teams/components/TeamRow.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamRow } from './TeamRow';
import type { Team } from '../types';

const followedTeam: Team = {
  id: 1,
  region: 'LCK',
  clubName: 'T1',
  logoUrl: 'http://example.com/t1.png',
  isFollowing: true,
};

const followableTeam: Team = {
  id: 2,
  region: 'LCK',
  clubName: 'Dplus KIA',
  logoUrl: 'http://example.com/dk.png',
  isFollowing: false,
};

describe('TeamRow', () => {
  it('renders the team name', () => {
    render(<TeamRow team={followedTeam} onToggle={vi.fn()} />);
    expect(screen.getByText('T1')).toBeInTheDocument();
  });

  it('shows a checkmark button labeled for unfollowing when already following', () => {
    render(<TeamRow team={followedTeam} onToggle={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: /팔로잉 중.*팔로우 취소/ })
    ).toBeInTheDocument();
  });

  it('shows a plus button labeled "팔로우" when not following', () => {
    render(<TeamRow team={followableTeam} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: '팔로우' })).toBeInTheDocument();
  });

  it('calls onToggle with the team id when the button is clicked', () => {
    const onToggle = vi.fn();
    render(<TeamRow team={followableTeam} onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button', { name: '팔로우' }));

    expect(onToggle).toHaveBeenCalledWith(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/teams/components/TeamRow.test.tsx`
Expected: FAIL — `TeamRow.tsx` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/teams/components/TeamRow.tsx
import { cn } from '@/lib/utils';
import type { Team } from '../types';

export function TeamRow({
  team,
  onToggle,
}: {
  team: Team;
  onToggle: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[color:var(--hairline-soft,#ebebeb)] px-4 py-2.5 last:border-b-0">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[color:var(--surface-strong,#f2f2f2)]">
        <img src={team.logoUrl} alt="" className="size-7 rounded-lg" />
      </div>
      <span className="text-sm font-semibold">{team.clubName}</span>
      <button
        type="button"
        onClick={() => onToggle(team.id)}
        aria-label={team.isFollowing ? '팔로잉 중 · 눌러서 팔로우 취소' : '팔로우'}
        className={cn(
          'ml-auto flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold leading-none',
          team.isFollowing
            ? 'border border-[color:var(--hairline,#dddddd)] bg-[color:var(--surface-strong,#f2f2f2)] text-[color:var(--muted-ink,#6a6a6a)]'
            : 'bg-[color:var(--brand-rausch,#ff385c)] text-white'
        )}
      >
        {team.isFollowing ? '✓' : '+'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/teams/components/TeamRow.test.tsx`
Expected: PASS (all 4 assertions)

- [ ] **Step 5: Commit**

```bash
git add src/features/teams/components/TeamRow.tsx src/features/teams/components/TeamRow.test.tsx
git commit -m "feat(teams): add TeamRow component"
```

---

## Task 5: TeamSection component

**Files:**
- Create: `src/features/teams/components/TeamSection.tsx`
- Test: `src/features/teams/components/TeamSection.test.tsx`

**Interfaces:**
- Consumes: `Team` from `../types` (Task 1), `groupByRegion` from `../utils/groupByRegion` (Task 2), `TeamRow` from `./TeamRow` (Task 4)
- Produces: `<TeamSection title={string} teams={Team[]} onToggle={(id: number) => void} />` — used by `TeamFollowScreen.tsx` (Task 6)

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/teams/components/TeamSection.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TeamSection } from './TeamSection';
import type { Team } from '../types';

const teams: Team[] = [
  { id: 1, region: 'LPL', clubName: 'JD Gaming', logoUrl: '', isFollowing: false },
  { id: 2, region: 'LCK', clubName: 'T1', logoUrl: '', isFollowing: false },
  { id: 3, region: 'LCK', clubName: 'Dplus KIA', logoUrl: '', isFollowing: false },
];

describe('TeamSection', () => {
  it('renders the section title', () => {
    render(<TeamSection title="나의 팀" teams={teams} onToggle={vi.fn()} />);
    expect(screen.getByText('나의 팀')).toBeInTheDocument();
  });

  it('renders region labels in priority order (LCK before LPL)', () => {
    render(<TeamSection title="팔로우할 팀" teams={teams} onToggle={vi.fn()} />);
    const labels = screen.getAllByText(/^(LCK|LPL|LEC)$/).map((el) => el.textContent);
    expect(labels).toEqual(['LCK', 'LPL']);
  });

  it('renders teams within a region sorted by clubName', () => {
    render(<TeamSection title="팔로우할 팀" teams={teams} onToggle={vi.fn()} />);
    const names = screen.getAllByText(/^(T1|Dplus KIA|JD Gaming)$/).map((el) => el.textContent);
    expect(names).toEqual(['Dplus KIA', 'T1', 'JD Gaming']);
  });

  it('renders nothing region-related when teams is empty', () => {
    render(<TeamSection title="나의 팀" teams={[]} onToggle={vi.fn()} />);
    expect(screen.queryByText('LCK')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/teams/components/TeamSection.test.tsx`
Expected: FAIL — `TeamSection.tsx` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/teams/components/TeamSection.tsx
import { groupByRegion } from '../utils/groupByRegion';
import { TeamRow } from './TeamRow';
import type { Team } from '../types';

export function TeamSection({
  title,
  teams,
  onToggle,
}: {
  title: string;
  teams: Team[];
  onToggle: (id: number) => void;
}) {
  const groups = groupByRegion(teams);

  return (
    <div className="border-b-8 border-[color:var(--surface-soft,#f7f7f7)] last:border-b-0">
      <div className="flex items-baseline justify-between px-4 pb-2 pt-3.5">
        <span className="text-[13px] font-bold tracking-wide">{title}</span>
        <span className="text-xs text-[color:var(--muted-soft,#929292)] tabular-nums">
          {teams.length}
        </span>
      </div>
      {groups.map((group) => (
        <div key={group.region}>
          <div className="bg-[color:var(--surface-soft,#f7f7f7)] px-4 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-wider text-[color:var(--muted-ink,#6a6a6a)]">
            {group.region}
          </div>
          {group.teams.map((team) => (
            <TeamRow key={team.id} team={team} onToggle={onToggle} />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/teams/components/TeamSection.test.tsx`
Expected: PASS (all 4 assertions)

- [ ] **Step 5: Commit**

```bash
git add src/features/teams/components/TeamSection.tsx src/features/teams/components/TeamSection.test.tsx
git commit -m "feat(teams): add TeamSection component with region grouping"
```

---

## Task 6: TeamFollowScreen component (orchestration)

**Files:**
- Create: `src/features/teams/components/TeamFollowScreen.tsx`
- Test: `src/features/teams/components/TeamFollowScreen.test.tsx`

**Interfaces:**
- Consumes: `useTeams` from `../api/useTeams` (Task 3), `TeamSection` from `./TeamSection` (Task 5)
- Produces: `<TeamFollowScreen onBack={() => void} />` — used by `routes/teams.tsx` (Task 7)

This wires the header (back button + title, per the wireframe) and the two sections together.

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/teams/components/TeamFollowScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeamFollowScreen } from './TeamFollowScreen';

describe('TeamFollowScreen', () => {
  it('renders the screen title', () => {
    render(<TeamFollowScreen onBack={vi.fn()} />);
    expect(screen.getByText('팀 팔로우')).toBeInTheDocument();
  });

  it('renders both section titles', () => {
    render(<TeamFollowScreen onBack={vi.fn()} />);
    expect(screen.getByText('나의 팀')).toBeInTheDocument();
    expect(screen.getByText('팔로우할 팀')).toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', () => {
    const onBack = vi.fn();
    render(<TeamFollowScreen onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));

    expect(onBack).toHaveBeenCalled();
  });

  it('moves a team from followable to my-teams when its follow button is clicked', () => {
    render(<TeamFollowScreen onBack={vi.fn()} />);

    // Dplus KIA (id 2) starts followed per mock data; pick a followable one instead.
    const followButtons = screen.getAllByRole('button', { name: '팔로우' });
    expect(followButtons.length).toBeGreaterThan(0);

    fireEvent.click(followButtons[0]);

    // After clicking, there should be one fewer "팔로우" button than before.
    const remaining = screen.getAllByRole('button', { name: '팔로우' });
    expect(remaining.length).toBe(followButtons.length - 1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/teams/components/TeamFollowScreen.test.tsx`
Expected: FAIL — `TeamFollowScreen.tsx` doesn't exist yet.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/teams/components/TeamFollowScreen.tsx
import { useTeams } from '../api/useTeams';
import { TeamSection } from './TeamSection';

export function TeamFollowScreen({ onBack }: { onBack: () => void }) {
  const { myTeams, followableTeams, toggleFollow } = useTeams();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <div className="flex items-center gap-2.5 border-b border-[color:var(--hairline,#dddddd)] px-4 py-3.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="뒤로 가기"
          className="flex size-8 shrink-0 items-center justify-center rounded-full text-xl leading-none"
        >
          ‹
        </button>
        <div className="flex-1">
          <div className="text-[17px] font-bold">팀 팔로우</div>
          <div className="text-xs text-[color:var(--muted-ink,#6a6a6a)]">
            지역별로 정리된 전체 팀 목록
          </div>
        </div>
      </div>

      <TeamSection title="나의 팀" teams={myTeams} onToggle={toggleFollow} />
      <TeamSection title="팔로우할 팀" teams={followableTeams} onToggle={toggleFollow} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/teams/components/TeamFollowScreen.test.tsx`
Expected: PASS (all 4 assertions)

- [ ] **Step 5: Commit**

```bash
git add src/features/teams/components/TeamFollowScreen.tsx src/features/teams/components/TeamFollowScreen.test.tsx
git commit -m "feat(teams): add TeamFollowScreen orchestrating component"
```

---

## Task 7: `/teams` route

**Files:**
- Create: `src/routes/teams.tsx`

**Interfaces:**
- Consumes: `TeamFollowScreen` from `@/features/teams/components/TeamFollowScreen` (Task 6)
- Produces: the `/teams` route, registered with TanStack Router's file-based routing (same pattern as `src/routes/index.tsx`)

No test file for this task — it's a thin routing wire-up. Verification is via manual dev-server check in the final step below, matching how `src/routes/index.tsx` has no dedicated route test (its behavior is tested through `MatchList.test.tsx` at the component level, which this plan mirrors with `TeamFollowScreen.test.tsx`).

- [ ] **Step 1: Write the route file**

```typescript
// src/routes/teams.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { TeamFollowScreen } from '@/features/teams/components/TeamFollowScreen';

export const Route = createFileRoute('/teams')({
  component: TeamsPage,
});

function TeamsPage() {
  const navigate = useNavigate();
  return <TeamFollowScreen onBack={() => navigate({ to: '/' })} />;
}
```

- [ ] **Step 2: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: PASS — all existing `matches` tests plus all new `teams` tests green.

- [ ] **Step 3: Manual verification in dev server**

Run: `npm run dev`
Navigate to `http://localhost:5173/teams` (or whatever port Vite reports).
Expected: the team follow screen renders — back button, "팀 팔로우" title, "나의 팀" section with T1/Dplus KIA/Bilibili Gaming (LCK then LPL grouping), "팔로우할 팀" section with the remaining teams. Clicking a `+` button moves that team up into "나의 팀" immediately (no reload needed since state is in-memory). Clicking the back button (‹) navigates to `/`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/teams.tsx
git commit -m "feat(teams): wire up /teams route"
```

---

## Self-Review

**Spec coverage check** (against `docs/designs/team-follow.md`):
- Region grouping (LCK → LPL → LEC fixed order, not alphabetical) → Task 2 (`groupByRegion`), tested explicitly.
- club_name ascending sort within region → Task 2, tested explicitly.
- Two sections ("나의 팀" / "팔로우할 팀") → Task 5 (`TeamSection`) + Task 6 (`TeamFollowScreen`), tested.
- "나의 팀" row order: following-button → logo → name (per spec's original wireframe request, later revised to logo → name → button) → Task 4 (`TeamRow`) implements the **final** revised order (logo → name → button, right-aligned) per the wireframe session's last edit, not the original request — this matches what was actually approved in the design doc's Next Steps step 5.
- Icon-only buttons (`+` / `✓`) with `aria-label` → Task 4, tested for both states.
- Back button → Task 6, tested.
- `useTeams()` fixed return shape / adapter boundary → Task 3, and Tasks 5-6 only consume that shape (never import `mockTeams` directly) — verified by reading Tasks 5-6's imports above: neither imports `mockTeams.ts`.
- Mock state session-only (no localStorage) → Task 3's implementation uses `useState` only, no persistence — matches Global Constraints.
- No `FollowedTeam` type → Task 1 defines only `Team`; confirmed no second type anywhere in this plan.
- Route `/teams` → Task 7.
- Loading/error/empty-region states out of scope → not built anywhere in this plan (Task 5's `TeamSection` renders nothing extra for an empty `teams` array, which the test in Task 5 step 1 already covers as "no crash, no region label").

**Placeholder scan:** No TBD/TODO in any step. Every code block is complete, runnable code — no "similar to Task N" references.

**Type consistency check:**
- `Team` (Task 1) fields (`id`, `region`, `clubName`, `logoUrl`, `isFollowing`) are used identically in Tasks 2-6 — no renamed fields.
- `groupByRegion(teams: Team[]): RegionGroup[]` (Task 2) return shape `{ region: string; teams: Team[] }` matches exactly what Task 5's `TeamSection` destructures (`group.region`, `group.teams`).
- `useTeams()` return shape (Task 3: `{ myTeams, followableTeams, toggleFollow }`) matches exactly what Task 6 destructures.
- `TeamRow`'s `onToggle: (id: number) => void` prop (Task 4) matches `toggleFollow: (id: number) => void` from `useTeams` (Task 3), passed through unchanged by `TeamSection` (Task 5) and `TeamFollowScreen` (Task 6).

No gaps found.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-18-team-follow.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
