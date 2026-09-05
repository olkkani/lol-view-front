import { Link } from '@tanstack/react-router';
import { LogOut, Users } from 'lucide-react';
import { useMe } from '@/features/auth/api/useMe';
import { useLogout } from '@/features/auth/api/useLogout';

export function HamburgerMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: me } = useMe();
  const { mutate: logout, isPending } = useLogout();

  if (!open) return null;

  const handleLogout = () => {
    logout(undefined, { onSuccess: onClose });
  };

  return (
    <div role="menu" className="absolute top-14 right-0 w-48 rounded-lg border border-[color:var(--hairline,#dddddd)] bg-white p-2 shadow-lg">
      <Link
        to="/teams"
        role="menuitem"
        onClick={onClose}
        className="flex h-11 items-center gap-3 rounded-md px-3 text-sm text-[color:var(--ink,#222222)] hover:bg-[color:var(--surface-soft,#f7f7f7)]"
      >
        <Users className="size-5" aria-hidden="true" />
        팔로우 팀 추가
      </Link>
      {me && (
        <button
          type="button"
          role="menuitem"
          onClick={handleLogout}
          disabled={isPending}
          className="flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-[color:var(--ink,#222222)] hover:bg-[color:var(--surface-soft,#f7f7f7)] disabled:opacity-50"
        >
          <LogOut className="size-5" aria-hidden="true" />
          로그아웃
        </button>
      )}
    </div>
  );
}
