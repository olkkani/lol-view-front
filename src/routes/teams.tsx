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
