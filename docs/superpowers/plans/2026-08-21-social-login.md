# Social Login (Frontend) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gate the `/teams` route behind login state — show a login screen (Google active, Discord/Telegram disabled) when logged out, and the existing `TeamFollowScreen` when logged in, judged by calling `GET /me` on route mount.

**Architecture:** A new `features/auth` slice owns login state. `useMe()` wraps `GET /me` in TanStack Query (mirrors the existing `useMatches`/`fetchMatches` pattern) and reads success/401/loading/error off the query result — no global store, per the design doc's Approach A. `routes/teams.tsx` branches on that result into four renders: loading skeleton, error+retry, `LoginScreen`, or `TeamFollowScreen`. `LoginScreen` renders three provider buttons using the existing `button-secondary` DESIGN.md token; only Google is wired (`window.location.href` navigation to the backend OAuth2 entry point), Discord/Telegram are `disabled` with a "coming soon" caption.

**Tech Stack:** React 19, TanStack Router (file-based routes), TanStack Query, `@toss/ky`, Vitest + Testing Library, Tailwind (DESIGN.md tokens via CSS vars).

**Spec:** `~/.gstack/projects/olkkani-lol-view-front/20260821-design-social-login.md` (APPROVED) — executors should read this alongside the plan; it documents the reasoning behind the HttpOnly-cookie decision and the three backend-coordination Open Questions this plan does not resolve.

## Global Constraints

- Backend contract this plan assumes (from `~/.gstack/projects/olkkani-lol-view-back/jin-main-design-20260819-170141.md`, APPROVED): `GET /me` returns 200 with a user body when authenticated via cookie, 401 when not. Google OAuth2 entry point is `{backend}/oauth2/authorization/google`. First backend cut is Google-only.
- Token transport is an **HttpOnly cookie** set by the backend — the frontend never reads or stores the JWT directly. Every request that needs auth must send `credentials: 'include'` (ky) so the cookie is attached.
- **Not resolved by this plan** (design doc Open Questions — backend coordination required before this can hit a real backend): exact cookie attributes (`SameSite`/`Secure`), CORS origin/credentials allow-list on the backend, and the exact frontend URL the backend redirects to after a successful login. Task 5 below stops at "navigate to the backend's OAuth2 entry point" — it does not implement a `/auth/callback` route, because the design doc left the redirect target itself unconfirmed. Do not invent a callback route path; that's explicitly deferred (see design doc Next Steps #6, and Task 6 of this plan).
- DESIGN.md button token for login buttons: `button-secondary` (`background: canvas`/`#fff`, `textColor: ink`/`#222222`, `rounded: {rounded.sm}`/8px, `padding: 13px 23px`, `height: 48px`). Disabled state uses `button-primary-disabled`'s color logic adapted to secondary (muted text/bg — see Task 3 for exact classes).
- Existing loading/error visual language to match (from `MatchList.tsx`): skeleton via `animate-pulse` blocks styled like `MatchCardSkeleton`; error state is centered text + a bordered `다시 시도` (retry) button (`border-[color:var(--ink,#222222)]`, `rounded-lg`, `min-h-11`).
- Route/component/hook naming and file layout must follow the existing `features/teams` and `features/matches` conventions exactly (see Task 1 File Structure) — this codebase has an established adapter-boundary pattern (mock-now / real-API-later) that Task 2 reuses.
- Every new hook/util gets a colocated `.test.ts`/`.test.tsx` file, `describe`/`it` style, using `@testing-library/react` (`renderHook`, `render`, `screen`) — mirror `useTeams.test.ts` and `MatchList.test.tsx` exactly in structure.
- Commit after each task (see per-task Step "Commit"). Do not batch multiple tasks into one commit.

---

## File Structure

```
src/features/auth/
  types.ts                   # Me (authenticated user shape) — minimal, only what's needed to prove "logged in"
  api/
    fetchMe.ts                # GET /me via ky, credentials: 'include'
    useMe.ts                  # useQuery wrapper — mirrors useMatches.ts shape
  components/
    LoginScreen.tsx            # 3-button login screen (Google active, Discord/Telegram disabled)
    LoginScreen.test.tsx
  api/fetchMe.test.ts
  api/useMe.test.ts

src/routes/teams.tsx           # MODIFY — branch on useMe() into loading/error/LoginScreen/TeamFollowScreen
```

**Interfaces produced by this file structure** (so later tasks know exact names):
- `fetchMe(): Promise<Me>` — throws on non-2xx (ky default), including 401.
- `useMe()` → TanStack Query result object: `{ data: Me | undefined, isLoading: boolean, isError: boolean, error: unknown, refetch: () => void }`. Callers distinguish "confirmed logged out" (401) from "network/server error" by inspecting `error` (see Task 2 for the exact discriminator).
- `Me` type: `{ id: number }` — the design doc and backend doc do not specify `/me`'s full response shape beyond confirming identity; keep this minimal and add fields when the real contract is confirmed (mirrors the `features/teams/types.ts` "assumed, mark clearly" convention).
- `LoginScreen`: `function LoginScreen(): JSX.Element` — no props. Google button click triggers `window.location.href` navigation (no callback prop — this is a full page navigation, not an in-app event).

---

### Task 1: `auth` feature scaffold — types + `fetchMe`

**Files:**
- Create: `src/features/auth/types.ts`
- Create: `src/features/auth/api/fetchMe.ts`
- Test: `src/features/auth/api/fetchMe.test.ts`

**Interfaces:**
- Consumes: `ky` from `@toss/ky` (already a project dependency, see `fetchMatches.ts`).
- Produces: `Me` type (`{ id: number }`), `fetchMe(): Promise<Me>`.

- [ ] **Step 1: Write `types.ts`**

```typescript
// src/features/auth/types.ts
/**
 * Minimal shape — GET /me's full response contract isn't confirmed yet
 * (see design doc Open Questions, ~/.gstack/projects/olkkani-lol-view-front/20260821-design-social-login.md).
 * Only `id` is needed to prove "a session exists"; extend when the real
 * contract is confirmed.
 */
export interface Me {
  id: number;
}
```

- [ ] **Step 2: Write the failing test for `fetchMe`**

```typescript
// src/features/auth/api/fetchMe.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ky from '@toss/ky';
import { fetchMe } from './fetchMe';

vi.mock('@toss/ky', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('fetchMe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls GET /api/me with credentials included and returns the parsed body', async () => {
    const mockJson = vi.fn().mockResolvedValue({ id: 42 });
    (ky.get as ReturnType<typeof vi.fn>).mockReturnValue({ json: mockJson });

    const result = await fetchMe();

    expect(ky.get).toHaveBeenCalledWith('/api/me', { credentials: 'include' });
    expect(result).toEqual({ id: 42 });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/auth/api/fetchMe.test.ts`
Expected: FAIL with "Cannot find module './fetchMe'" (file doesn't exist yet)

- [ ] **Step 4: Write minimal implementation**

```typescript
// src/features/auth/api/fetchMe.ts
import ky from '@toss/ky';
import type { Me } from '../types';

// dev 서버(vite.config.ts server.proxy)가 /api를 VITE_API_TARGET으로 프록시한다 — fetchMatches.ts와 동일 패턴.
// credentials: 'include'는 백엔드가 심는 HttpOnly 쿠키를 요청에 동봉하기 위해 필수.
export async function fetchMe(): Promise<Me> {
  return ky.get('/api/me', { credentials: 'include' }).json<Me>();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/auth/api/fetchMe.test.ts`
Expected: PASS (1 test)

- [ ] **Step 6: Commit**

```bash
git add src/features/auth/types.ts src/features/auth/api/fetchMe.ts src/features/auth/api/fetchMe.test.ts
git commit -m "feat(auth): add Me type and fetchMe API call"
```

---

### Task 2: `useMe` hook

**Files:**
- Create: `src/features/auth/api/useMe.ts`
- Test: `src/features/auth/api/useMe.test.ts`

**Interfaces:**
- Consumes: `fetchMe` (Task 1), `useQuery` from `@tanstack/react-query`.
- Produces: `useMe()` → `{ data: Me | undefined, isLoading: boolean, isError: boolean, error: unknown, refetch: () => void }`. `isError: true` with a 401 means "confirmed logged out" — Task 4 distinguishes this from other errors by checking `(error as { response?: { status?: number } })?.response?.status === 401` (ky's `HTTPError` shape).

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/auth/api/useMe.test.ts
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMe } from './useMe';
import * as fetchMeModule from './fetchMe';

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useMe', () => {
  it('returns the user on success', async () => {
    vi.spyOn(fetchMeModule, 'fetchMe').mockResolvedValue({ id: 1 });

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toEqual({ id: 1 });
    expect(result.current.isError).toBe(false);
  });

  it('surfaces an error when fetchMe rejects (e.g. 401)', async () => {
    vi.spyOn(fetchMeModule, 'fetchMe').mockRejectedValue(new Error('401'));

    const { result } = renderHook(() => useMe(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/auth/api/useMe.test.ts`
Expected: FAIL with "Cannot find module './useMe'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/auth/api/useMe.ts
import { useQuery } from '@tanstack/react-query';
import { fetchMe } from './fetchMe';

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    retry: false,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/auth/api/useMe.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/api/useMe.ts src/features/auth/api/useMe.test.ts
git commit -m "feat(auth): add useMe query hook"
```

---

### Task 3: `LoginScreen` component

**Files:**
- Create: `src/features/auth/components/LoginScreen.tsx`
- Test: `src/features/auth/components/LoginScreen.test.tsx`

**Interfaces:**
- Consumes: nothing from earlier tasks (no props, no hooks) — this is a presentational component.
- Produces: `LoginScreen(): JSX.Element`, default export not used (named export, matches `TeamFollowScreen` convention). Google button has `data-testid="login-google"` for the test; Discord/Telegram have `data-testid="login-discord"` / `data-testid="login-telegram"` and `disabled` attribute.

Design doc decisions this component encodes: 3 buttons always rendered; only Google clickable; Discord/Telegram show a "준비 중" (coming soon) caption on hover/focus via a `title` attribute (simplest native affordance — no separate tooltip component exists in this codebase, and the design doc explicitly said no toast/click handling for disabled buttons).

**Known gap this task accepts, not resolves:** the Google button navigates to `/api/oauth2/authorization/google` — a same-origin path that only works because `vite.config.ts`'s dev proxy forwards `/api` to `VITE_API_TARGET` (mirrors `fetchMatches.ts`'s existing convention). This is a placeholder for local dev only. It does **not** work in production, because the design doc's Open Questions leave the real backend origin, CORS allow-list, and redirect target unconfirmed — hardcoding a cross-origin URL now would silently assume answers to those open questions. Task 6 (deferred) is where the real origin gets wired in once that's settled.

- [ ] **Step 1: Write the failing test**

```typescript
// src/features/auth/components/LoginScreen.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from './LoginScreen';

describe('LoginScreen', () => {
  beforeEach(() => {
    // jsdom doesn't implement navigation; stub the setter so clicking
    // the Google button doesn't throw "Not implemented: navigation".
    delete (window as { location?: unknown }).location;
    window.location = { href: '' } as Location;
  });

  it('renders three provider buttons', () => {
    render(<LoginScreen />);

    expect(screen.getByTestId('login-google')).toBeInTheDocument();
    expect(screen.getByTestId('login-discord')).toBeInTheDocument();
    expect(screen.getByTestId('login-telegram')).toBeInTheDocument();
  });

  it('disables Discord and Telegram buttons with a coming-soon title', () => {
    render(<LoginScreen />);

    const discord = screen.getByTestId('login-discord');
    const telegram = screen.getByTestId('login-telegram');

    expect(discord).toBeDisabled();
    expect(telegram).toBeDisabled();
    expect(discord).toHaveAttribute('title', '준비 중');
    expect(telegram).toHaveAttribute('title', '준비 중');
  });

  it('navigates to the backend Google OAuth2 entry point on click', async () => {
    const user = userEvent.setup();
    render(<LoginScreen />);

    await user.click(screen.getByTestId('login-google'));

    expect(window.location.href).toBe('/api/oauth2/authorization/google');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/auth/components/LoginScreen.test.tsx`
Expected: FAIL with "Cannot find module './LoginScreen'"

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/features/auth/components/LoginScreen.tsx
export function LoginScreen() {
  const handleGoogleLogin = () => {
    window.location.href = '/api/oauth2/authorization/google';
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 bg-white px-6">
      <h1 className="mb-6 text-[20px] font-semibold text-[color:var(--ink,#222222)]">
        로그인
      </h1>

      <button
        type="button"
        data-testid="login-google"
        onClick={handleGoogleLogin}
        className="h-12 w-full rounded-lg border border-[color:var(--hairline,#dddddd)] bg-white px-6 text-sm font-medium text-[color:var(--ink,#222222)]"
      >
        Google로 로그인
      </button>

      <button
        type="button"
        data-testid="login-discord"
        disabled
        title="준비 중"
        className="h-12 w-full cursor-not-allowed rounded-lg border border-[color:var(--hairline-soft,#ebebeb)] bg-white px-6 text-sm font-medium text-[color:var(--muted-soft,#929292)]"
      >
        Discord로 로그인
      </button>

      <button
        type="button"
        data-testid="login-telegram"
        disabled
        title="준비 중"
        className="h-12 w-full cursor-not-allowed rounded-lg border border-[color:var(--hairline-soft,#ebebeb)] bg-white px-6 text-sm font-medium text-[color:var(--muted-soft,#929292)]"
      >
        Telegram으로 로그인
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/features/auth/components/LoginScreen.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/features/auth/components/LoginScreen.tsx src/features/auth/components/LoginScreen.test.tsx
git commit -m "feat(auth): add LoginScreen with Google active, Discord/Telegram disabled"
```

---

### Task 4: Wire `useMe` into `routes/teams.tsx` — 4-way branch

**Files:**
- Modify: `src/routes/teams.tsx`
- Test: `src/routes/teams.test.tsx` (new file — no existing test for this route)

**Interfaces:**
- Consumes: `useMe()` (Task 2), `LoginScreen` (Task 3), existing `TeamFollowScreen`.
- Produces: `TeamsPage` component now renders one of: loading skeleton, error+retry, `LoginScreen`, `TeamFollowScreen`. No new exports — `Route` export shape unchanged.

Branch logic: `isLoading` → skeleton. `isError` → error+retry block (mirrors `MatchList.tsx`'s error branch, same visual language: centered text, bordered retry button). On error, cannot yet distinguish "401 = logged out" from "network failure" at the ky level without inspecting the thrown error — but per the design doc, `useMe`'s `isError` state name is reused for both, and the login screen path uses `data` presence, not error absence: if `data` is present → `TeamFollowScreen`; else if `isLoading` → skeleton; else if `isError` and the error is a 401 → `LoginScreen`; else (real error) → error+retry. Task 5 encodes the 401 check.

- [ ] **Step 1: Write the failing test**

```typescript
// src/routes/teams.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as useMeModule from '@/features/auth/api/useMe';
import { TeamsPage } from './teams';

function renderTeamsPage() {
  const queryClient = new QueryClient();
  const rootRoute = createRootRoute();
  const teamsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: TeamsPage,
  });
  const router = createRouter({ routeTree: rootRoute.addChildren([teamsRoute]) });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

describe('TeamsPage', () => {
  it('shows a loading state while useMe is pending', () => {
    vi.spyOn(useMeModule, 'useMe').mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMeModule.useMe>);

    renderTeamsPage();

    expect(screen.getByTestId('teams-loading')).toBeInTheDocument();
  });

  it('shows LoginScreen when useMe resolves 401 (logged out)', () => {
    const err = Object.assign(new Error('Unauthorized'), {
      response: { status: 401 },
    });
    vi.spyOn(useMeModule, 'useMe').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: err,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMeModule.useMe>);

    renderTeamsPage();

    expect(screen.getByTestId('login-google')).toBeInTheDocument();
  });

  it('shows TeamFollowScreen when useMe resolves with a user', () => {
    vi.spyOn(useMeModule, 'useMe').mockReturnValue({
      data: { id: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMeModule.useMe>);

    renderTeamsPage();

    expect(screen.getByText('팀 팔로우')).toBeInTheDocument();
  });

  it('shows an error+retry state for non-401 errors', () => {
    const err = Object.assign(new Error('Server error'), {
      response: { status: 500 },
    });
    vi.spyOn(useMeModule, 'useMe').mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: err,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMeModule.useMe>);

    renderTeamsPage();

    expect(screen.getByText('다시 시도')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/teams.test.tsx`
Expected: FAIL — `TeamsPage` is not exported yet from `./teams` (currently only `Route` is exported), and the 401-discrimination logic doesn't exist.

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/routes/teams.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMe } from '@/features/auth/api/useMe';
import { LoginScreen } from '@/features/auth/components/LoginScreen';
import { TeamFollowScreen } from '@/features/teams/components/TeamFollowScreen';

export const Route = createFileRoute('/teams')({
  component: TeamsPage,
});

function isUnauthorized(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    (error as { response?: { status?: number } }).response?.status === 401
  );
}

export function TeamsPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error, refetch } = useMe();

  if (isLoading) {
    return (
      <div
        data-testid="teams-loading"
        className="mx-auto flex min-h-screen max-w-md animate-pulse flex-col gap-2 bg-white p-4"
      >
        <div className="h-12 rounded-[14px] bg-[color:var(--surface-strong,#f2f2f2)]" />
        <div className="h-12 rounded-[14px] bg-[color:var(--surface-strong,#f2f2f2)]" />
      </div>
    );
  }

  if (data) {
    return <TeamFollowScreen onBack={() => navigate({ to: '/' })} />;
  }

  if (isError && isUnauthorized(error)) {
    return <LoginScreen />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 py-16 text-center text-sm text-[color:var(--muted-ink,#6a6a6a)]">
      <p>로그인 상태를 확인하지 못했어요.</p>
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/routes/teams.test.tsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/routes/teams.tsx src/routes/teams.test.tsx
git commit -m "feat(auth): gate /teams route on useMe login state"
```

---

### Task 5: Full suite + lint + typecheck, verify no regressions

**Files:** none created/modified — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: All tests pass, including pre-existing `features/teams` and `features/matches` suites (unmodified — Task 4 only touched `routes/teams.tsx`, which had no prior test file).

- [ ] **Step 2: Run typecheck**

Run: `npx tsc -b --noEmit`
Expected: No errors. Pay attention to `useMe()`'s inferred error type in `teams.tsx` — `isUnauthorized` takes `unknown` deliberately to avoid a hard dependency on ky's `HTTPError` type shape.

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors. If `eslint-plugin-jsx-a11y` flags the disabled buttons in `LoginScreen.tsx`, add `aria-disabled="true"` alongside the native `disabled` attribute rather than suppressing the rule.

- [ ] **Step 4: Commit (only if Steps 1-3 required fixes)**

```bash
git add -A
git commit -m "fix(auth): address lint/typecheck feedback from full suite run"
```

If no fixes were needed, skip this commit — nothing to record.

---

## Deferred — do not implement in this plan

Per the design doc's Open Questions and Next Steps #6/#7, the following are explicitly out of scope here and must not be started until the backend coordination they depend on is resolved:

- **`/auth/callback` route or any callback-path handling.** The design doc left the post-login redirect target unconfirmed (`/teams` directly vs. an intermediate callback route). `LoginScreen`'s Google button only navigates *to* the backend's OAuth2 entry point (Task 3) — it does not handle the return trip. Do not guess a redirect path.
- **Cookie attribute / CORS backend changes.** `SameSite`, `Secure`, and `Access-Control-Allow-Origin`/`Access-Control-Allow-Credentials` are backend `SecurityConfig.kt` changes in `olkkani/lol-view-back`, not this repo.
- **Discord/Telegram actual wiring.** Buttons stay permanently disabled until the backend ships those providers (backend design doc: explicitly deferred past its first cut).
- **Logout UI.** Not in the design doc's Success Criteria.
- **Verifying this against the real backend end-to-end.** Until the three Open Questions above are settled, `Task 1`'s `credentials: 'include'` request will hit CORS/cookie failures against a real backend — that's expected and not a bug in this plan. Task 5's suite run uses mocked `fetchMe`/`useMe`, not a live backend call.

When those are resolved, the natural next plan is: add the callback route (if one is needed), point `LoginScreen`'s Google `href` at whatever the confirmed backend origin is (currently a same-origin `/api/...` proxy path, matching `fetchMatches.ts`'s convention), and do one real end-to-end login pass.
