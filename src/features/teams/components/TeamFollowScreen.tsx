import { useTeams } from '../api/useTeams';
import { TeamSection } from './TeamSection';

function TeamFollowHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-[color:var(--hairline,#dddddd)] px-4 py-3.5">
      <button
        type="button"
        onClick={onBack}
        aria-label="뒤로 가기"
        className="flex size-11 shrink-0 items-center justify-center rounded-full text-xl leading-none"
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
  );
}

export function TeamFollowScreen({ onBack }: { onBack: () => void }) {
  const { myTeams, followableTeams, toggleFollow, isLoading, isError, refetch, errorMessage } =
    useTeams();

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
        <TeamFollowHeader onBack={onBack} />
        <div
          data-testid="teams-loading"
          className="flex animate-pulse flex-col gap-2 p-4"
        >
          <div className="h-12 rounded-[14px] bg-[color:var(--surface-strong,#f2f2f2)]" />
          <div className="h-12 rounded-[14px] bg-[color:var(--surface-strong,#f2f2f2)]" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
        <TeamFollowHeader onBack={onBack} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center text-sm text-[color:var(--muted-ink,#6a6a6a)]">
          <p>팀 목록을 불러오지 못했어요.</p>
          <button
            type="button"
            onClick={() => refetch()}
            className="min-h-11 rounded-lg border border-[color:var(--ink,#222222)] px-4 text-sm font-medium text-[color:var(--ink,#222222)]"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-white">
      <TeamFollowHeader onBack={onBack} />

      {errorMessage && (
        <div
          role="alert"
          className="px-4 py-2 text-xs text-[color:var(--brand-rausch,#ff385c)]"
        >
          {errorMessage}
        </div>
      )}

      <TeamSection title="나의 팀" teams={myTeams} onToggle={toggleFollow} />
      <TeamSection title="팔로우할 팀" teams={followableTeams} onToggle={toggleFollow} />
    </div>
  );
}
