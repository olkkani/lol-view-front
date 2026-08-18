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
